import { createDbClient } from '../db/client.js';

const cloneValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  }

  return value;
};

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const normalizeCommentRecord = (record) => ({
  id: Number(record.id),
  evaluationId: Number(record.evaluation_id ?? record.evaluationId),
  scopeType: record.scope_type ?? record.scopeType,
  sectionId: normalizeText(record.section_id ?? record.sectionId),
  criterionCode: normalizeText(record.criterion_code ?? record.criterionCode),
  body: record.body ?? '',
  createdByUserId: Number(record.created_by_user_id ?? record.createdByUserId),
  createdAt: record.created_at ?? record.createdAt ?? null,
});

const createInMemoryCommentsRepository = () => {
  let nextId = 1;
  const commentsByEvaluationId = new Map();

  return {
    async create(comment) {
      const created = normalizeCommentRecord({
        id: nextId++,
        created_at: comment.createdAt ?? new Date().toISOString(),
        ...comment,
      });
      const existing = commentsByEvaluationId.get(created.evaluationId) ?? [];
      commentsByEvaluationId.set(created.evaluationId, [created, ...existing]);
      return cloneValue(created);
    },
    async listByEvaluationId(evaluationId) {
      return (commentsByEvaluationId.get(Number(evaluationId)) ?? []).map((comment) =>
        cloneValue(comment),
      );
    },
    async close() {},
  };
};

const createPostgresCommentsRepository = ({ env }) => {
  const withClient = async (callback, clientOverride) => {
    if (clientOverride) {
      return callback(clientOverride);
    }

    const client = createDbClient(env);
    await client.connect();

    try {
      return await callback(client);
    } finally {
      await client.end();
    }
  };

  return {
    async create(comment, { client } = {}) {
      const normalized = normalizeCommentRecord({
        id: 0,
        ...comment,
      });

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            INSERT INTO review_comments (
              evaluation_id,
              scope_type,
              section_id,
              criterion_code,
              body,
              created_by_user_id,
              created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()))
            RETURNING *
          `,
          [
            normalized.evaluationId,
            normalized.scopeType,
            normalized.sectionId,
            normalized.criterionCode,
            normalized.body,
            normalized.createdByUserId,
            normalized.createdAt,
          ],
        );

        return normalizeCommentRecord(result.rows[0]);
      }, client);
    },
    async listByEvaluationId(evaluationId) {
      return withClient(async (client) => {
        const result = await client.query(
          `
            SELECT *
            FROM review_comments
            WHERE evaluation_id = $1
            ORDER BY created_at DESC, id DESC
          `,
          [Number(evaluationId)],
        );

        return result.rows.map((row) => normalizeCommentRecord(row));
      });
    },
    async close() {},
  };
};

export const createCommentsRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresCommentsRepository({ env })
    : createInMemoryCommentsRepository();
