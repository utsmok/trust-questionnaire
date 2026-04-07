import crypto from 'node:crypto';

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

const normalizeImportRecord = (record) => ({
  id: Number(record.id ?? 0),
  importId: record.import_id ?? record.importId ?? `import-${crypto.randomUUID()}`,
  evaluationId:
    (record.evaluation_id ?? record.evaluationId) === null ||
    (record.evaluation_id ?? record.evaluationId) === undefined
      ? null
      : Number(record.evaluation_id ?? record.evaluationId),
  importedEvaluationId:
    (record.imported_evaluation_id ?? record.importedEvaluationId) === null ||
    (record.imported_evaluation_id ?? record.importedEvaluationId) === undefined
      ? null
      : Number(record.imported_evaluation_id ?? record.importedEvaluationId),
  importClass: record.import_class ?? record.importClass,
  sourceFormat: record.source_format ?? record.sourceFormat,
  sourceName: record.source_name ?? record.sourceName ?? null,
  importedByUserId: Number(record.imported_by_user_id ?? record.importedByUserId),
  summary: cloneValue(record.summary ?? {}),
  createdAt: record.created_at ?? record.createdAt ?? null,
});

const createInMemoryImportRecordsRepository = () => {
  let nextId = 1;
  const records = [];

  return {
    async create(record) {
      const created = normalizeImportRecord({
        id: nextId++,
        created_at: record.createdAt ?? new Date().toISOString(),
        ...record,
      });
      records.unshift(created);
      return cloneValue(created);
    },
    async listByEvaluationId(evaluationId) {
      const numericId = Number(evaluationId);
      return records
        .filter(
          (record) => record.evaluationId === numericId || record.importedEvaluationId === numericId,
        )
        .map((record) => cloneValue(record));
    },
    async close() {},
  };
};

const createPostgresImportRecordsRepository = ({ env }) => {
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
    async create(record, { client } = {}) {
      const normalized = normalizeImportRecord(record);

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            INSERT INTO import_records (
              import_id,
              evaluation_id,
              imported_evaluation_id,
              import_class,
              source_format,
              source_name,
              imported_by_user_id,
              summary,
              created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, COALESCE($9, NOW()))
            RETURNING *
          `,
          [
            normalized.importId,
            normalized.evaluationId,
            normalized.importedEvaluationId,
            normalized.importClass,
            normalized.sourceFormat,
            normalized.sourceName,
            normalized.importedByUserId,
            JSON.stringify(normalized.summary ?? {}),
            normalized.createdAt,
          ],
        );

        return normalizeImportRecord(result.rows[0]);
      }, client);
    },
    async listByEvaluationId(evaluationId) {
      return withClient(async (client) => {
        const result = await client.query(
          `
            SELECT *
            FROM import_records
            WHERE evaluation_id = $1 OR imported_evaluation_id = $1
            ORDER BY created_at DESC, id DESC
          `,
          [Number(evaluationId)],
        );

        return result.rows.map((row) => normalizeImportRecord(row));
      });
    },
    async close() {},
  };
};

export const createImportRecordsRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresImportRecordsRepository({ env })
    : createInMemoryImportRecordsRepository();
