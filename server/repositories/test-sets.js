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

const normalizeText = (value, fallback = '') => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
};

const normalizeOptionalId = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeTestSetRecord = (record) => ({
  id: Number(record.id ?? 0),
  slug: normalizeText(record.slug, ''),
  title: normalizeText(record.title, ''),
  description: normalizeText(record.description, ''),
  purpose: normalizeText(record.purpose, ''),
  visibility: normalizeText(record.visibility, 'team'),
  status: normalizeText(record.status, 'draft'),
  ownerUserId: Number(record.owner_user_id ?? record.ownerUserId),
  latestDraftRevisionId: normalizeOptionalId(
    record.latest_draft_revision_id ?? record.latestDraftRevisionId,
  ),
  latestPublishedRevisionId: normalizeOptionalId(
    record.latest_published_revision_id ?? record.latestPublishedRevisionId,
  ),
  createdAt: record.created_at ?? record.createdAt ?? null,
  updatedAt: record.updated_at ?? record.updatedAt ?? null,
  archivedAt: record.archived_at ?? record.archivedAt ?? null,
});

const VIEW_ALL_GLOBAL_ROLES = new Set(['admin', 'coordinator', 'auditor']);

const canUserViewTestSet = (testSet, userId, userRole = 'member') => {
  if (VIEW_ALL_GLOBAL_ROLES.has(userRole)) {
    return true;
  }

  return testSet.visibility === 'team' || testSet.ownerUserId === Number(userId);
};

const sortTestSets = (left, right) =>
  String(right.updatedAt ?? right.createdAt ?? '').localeCompare(
    String(left.updatedAt ?? left.createdAt ?? ''),
  );

const createInMemoryTestSetsRepository = () => {
  let nextId = 1;
  const testSetsById = new Map();

  return {
    async create(testSet) {
      const created = normalizeTestSetRecord({
        id: nextId++,
        created_at: testSet.createdAt ?? new Date().toISOString(),
        updated_at: testSet.updatedAt ?? new Date().toISOString(),
        ...testSet,
      });
      testSetsById.set(created.id, created);
      return cloneValue(created);
    },
    async getById(id) {
      const record = testSetsById.get(Number(id)) ?? null;
      return record ? cloneValue(record) : null;
    },
    async getVisibleById(id, userId, { userRole } = {}) {
      const record = testSetsById.get(Number(id)) ?? null;

      if (!record || !canUserViewTestSet(record, userId, userRole)) {
        return null;
      }

      return cloneValue(record);
    },
    async listVisibleToUser(userId, { userRole } = {}) {
      return [...testSetsById.values()]
        .filter((testSet) => canUserViewTestSet(testSet, userId, userRole))
        .sort(sortTestSets)
        .map((testSet) => cloneValue(testSet));
    },
    async update(testSet) {
      const existing = testSetsById.get(Number(testSet.id)) ?? null;

      if (!existing) {
        return null;
      }

      const updated = normalizeTestSetRecord({
        ...existing,
        ...testSet,
        id: existing.id,
        owner_user_id: existing.ownerUserId,
        created_at: existing.createdAt,
        updated_at: testSet.updatedAt ?? new Date().toISOString(),
      });

      testSetsById.set(updated.id, updated);
      return cloneValue(updated);
    },
    async close() {},
  };
};

const createPostgresTestSetsRepository = ({ env }) => {
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
    async create(testSet, { client } = {}) {
      const normalized = normalizeTestSetRecord(testSet);

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            INSERT INTO test_sets (
              slug,
              title,
              description,
              purpose,
              visibility,
              status,
              owner_user_id,
              latest_draft_revision_id,
              latest_published_revision_id,
              created_at,
              updated_at,
              archived_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, NOW()), COALESCE($11, NOW()), $12)
            RETURNING *
          `,
          [
            normalized.slug,
            normalized.title,
            normalized.description,
            normalized.purpose,
            normalized.visibility,
            normalized.status,
            normalized.ownerUserId,
            normalized.latestDraftRevisionId,
            normalized.latestPublishedRevisionId,
            normalized.createdAt,
            normalized.updatedAt,
            normalized.archivedAt,
          ],
        );

        return normalizeTestSetRecord(result.rows[0]);
      }, client);
    },
    async getById(id, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            SELECT *
            FROM test_sets
            WHERE id = $1
            LIMIT 1
          `,
          [Number(id)],
        );

        return result.rows[0] ? normalizeTestSetRecord(result.rows[0]) : null;
      }, client);
    },
    async getVisibleById(id, userId, { userRole, client } = {}) {
      if (VIEW_ALL_GLOBAL_ROLES.has(userRole)) {
        return this.getById(id, { client });
      }

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            SELECT *
            FROM test_sets
            WHERE id = $1
              AND (visibility = 'team' OR owner_user_id = $2)
            LIMIT 1
          `,
          [Number(id), Number(userId)],
        );

        return result.rows[0] ? normalizeTestSetRecord(result.rows[0]) : null;
      }, client);
    },
    async listVisibleToUser(userId, { userRole, client } = {}) {
      return withClient(async (dbClient) => {
        const result = VIEW_ALL_GLOBAL_ROLES.has(userRole)
          ? await dbClient.query(
              `
                SELECT *
                FROM test_sets
                ORDER BY updated_at DESC, id DESC
              `,
            )
          : await dbClient.query(
              `
                SELECT *
                FROM test_sets
                WHERE visibility = 'team' OR owner_user_id = $1
                ORDER BY updated_at DESC, id DESC
              `,
              [Number(userId)],
            );

        return result.rows.map((row) => normalizeTestSetRecord(row));
      }, client);
    },
    async update(testSet, { client } = {}) {
      const normalized = normalizeTestSetRecord(testSet);

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            UPDATE test_sets
            SET slug = $2,
                title = $3,
                description = $4,
                purpose = $5,
                visibility = $6,
                status = $7,
                latest_draft_revision_id = $8,
                latest_published_revision_id = $9,
                updated_at = COALESCE($10, NOW()),
                archived_at = $11
            WHERE id = $1
            RETURNING *
          `,
          [
            normalized.id,
            normalized.slug,
            normalized.title,
            normalized.description,
            normalized.purpose,
            normalized.visibility,
            normalized.status,
            normalized.latestDraftRevisionId,
            normalized.latestPublishedRevisionId,
            normalized.updatedAt,
            normalized.archivedAt,
          ],
        );

        return result.rows[0] ? normalizeTestSetRecord(result.rows[0]) : null;
      }, client);
    },
    async close() {},
  };
};

export const createTestSetsRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresTestSetsRepository({ env })
    : createInMemoryTestSetsRepository();
