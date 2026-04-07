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

const normalizeRevisionRecord = (record) => ({
  evaluationId: Number(record.evaluation_id ?? record.evaluationId),
  revisionNumber: Number(record.revision_number ?? record.revisionNumber),
  workflowMode: record.workflow_mode ?? record.workflowMode,
  lifecycleState: record.lifecycle_state ?? record.lifecycleState,
  stateSchemaVersion: record.state_schema_version ?? record.stateSchemaVersion,
  frameworkVersion: record.framework_version ?? record.frameworkVersion,
  stateJson: cloneValue(record.state_json ?? record.stateJson ?? {}),
  savedByUserId: Number(record.saved_by_user_id ?? record.savedByUserId),
  saveReason: record.save_reason ?? record.saveReason,
  createdAt: record.created_at ?? record.createdAt ?? null,
});

const createInMemoryRevisionsRepository = () => {
  const revisionsByEvaluationId = new Map();

  return {
    async append(revision) {
      const normalized = normalizeRevisionRecord(revision);
      const existing = revisionsByEvaluationId.get(normalized.evaluationId) ?? [];
      const created = {
        ...normalized,
        createdAt: normalized.createdAt ?? new Date().toISOString(),
      };

      revisionsByEvaluationId.set(normalized.evaluationId, [...existing, created]);
      return cloneValue(created);
    },
    async listByEvaluationId(evaluationId) {
      const revisions = revisionsByEvaluationId.get(Number(evaluationId)) ?? [];
      return revisions
        .slice()
        .sort((left, right) => right.revisionNumber - left.revisionNumber)
        .map((revision) => cloneValue(revision));
    },
    async getByEvaluationIdAndRevisionNumber(evaluationId, revisionNumber) {
      const revisions = revisionsByEvaluationId.get(Number(evaluationId)) ?? [];
      const matched = revisions.find(
        (revision) => revision.revisionNumber === Number(revisionNumber),
      );

      return matched ? cloneValue(matched) : null;
    },
    async close() {},
  };
};

const createPostgresRevisionsRepository = ({ env }) => {
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
    async append(revision, { client } = {}) {
      const normalized = normalizeRevisionRecord(revision);

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            INSERT INTO evaluation_revisions (
              evaluation_id,
              revision_number,
              workflow_mode,
              lifecycle_state,
              state_schema_version,
              framework_version,
              state_json,
              saved_by_user_id,
              save_reason
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
            RETURNING *
          `,
          [
            normalized.evaluationId,
            normalized.revisionNumber,
            normalized.workflowMode,
            normalized.lifecycleState,
            normalized.stateSchemaVersion,
            normalized.frameworkVersion,
            JSON.stringify(normalized.stateJson),
            normalized.savedByUserId,
            normalized.saveReason,
          ],
        );

        return normalizeRevisionRecord(result.rows[0]);
      }, client);
    },
    async listByEvaluationId(evaluationId) {
      return withClient(async (client) => {
        const result = await client.query(
          `
            SELECT *
            FROM evaluation_revisions
            WHERE evaluation_id = $1
            ORDER BY revision_number DESC
          `,
          [Number(evaluationId)],
        );

        return result.rows.map((row) => normalizeRevisionRecord(row));
      });
    },
    async getByEvaluationIdAndRevisionNumber(evaluationId, revisionNumber) {
      return withClient(async (client) => {
        const result = await client.query(
          `
            SELECT *
            FROM evaluation_revisions
            WHERE evaluation_id = $1 AND revision_number = $2
            LIMIT 1
          `,
          [Number(evaluationId), Number(revisionNumber)],
        );

        return result.rows[0] ? normalizeRevisionRecord(result.rows[0]) : null;
      });
    },
    async close() {},
  };
};

export const createRevisionsRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresRevisionsRepository({ env })
    : createInMemoryRevisionsRepository();
