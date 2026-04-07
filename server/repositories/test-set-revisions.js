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

const normalizeCases = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return cloneValue(value);
};

const normalizeTestSetRevisionRecord = (record) => ({
  id: Number(record.id ?? 0),
  testSetId: Number(record.test_set_id ?? record.testSetId),
  versionNumber: Number(record.version_number ?? record.versionNumber ?? 1),
  status: normalizeText(record.status, 'draft'),
  schemaVersion: normalizeText(record.schema_version ?? record.schemaVersion, '1'),
  titleSnapshot: normalizeText(record.title_snapshot ?? record.titleSnapshot, ''),
  descriptionSnapshot: normalizeText(
    record.description_snapshot ?? record.descriptionSnapshot,
    '',
  ),
  purposeSnapshot: normalizeText(record.purpose_snapshot ?? record.purposeSnapshot, ''),
  visibilitySnapshot: normalizeText(record.visibility_snapshot ?? record.visibilitySnapshot, 'team'),
  changeSummary: normalizeText(record.change_summary ?? record.changeSummary, ''),
  cases: normalizeCases(record.cases_json ?? record.cases),
  createdByUserId: Number(record.created_by_user_id ?? record.createdByUserId),
  createdAt: record.created_at ?? record.createdAt ?? null,
  publishedAt: record.published_at ?? record.publishedAt ?? null,
  derivedFromRevisionId: normalizeOptionalId(
    record.derived_from_revision_id ?? record.derivedFromRevisionId,
  ),
});

const sortRevisions = (left, right) =>
  right.versionNumber - left.versionNumber ||
  String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? ''));

const createInMemoryTestSetRevisionsRepository = () => {
  let nextId = 1;
  const revisionsById = new Map();
  const revisionIdsByTestSetId = new Map();

  const storeRevision = (revision) => {
    revisionsById.set(revision.id, revision);
    const existingIds = revisionIdsByTestSetId.get(revision.testSetId) ?? [];

    if (!existingIds.includes(revision.id)) {
      revisionIdsByTestSetId.set(revision.testSetId, [revision.id, ...existingIds]);
    }
  };

  return {
    async create(revision) {
      const created = normalizeTestSetRevisionRecord({
        id: nextId++,
        created_at: revision.createdAt ?? new Date().toISOString(),
        ...revision,
      });
      storeRevision(created);
      return cloneValue(created);
    },
    async getById(id) {
      const record = revisionsById.get(Number(id)) ?? null;
      return record ? cloneValue(record) : null;
    },
    async listByTestSetId(testSetId) {
      return (revisionIdsByTestSetId.get(Number(testSetId)) ?? [])
        .map((revisionId) => revisionsById.get(revisionId))
        .filter(Boolean)
        .sort(sortRevisions)
        .map((revision) => cloneValue(revision));
    },
    async findDraftByTestSetId(testSetId) {
      const revisions = await this.listByTestSetId(testSetId);
      return revisions.find((revision) => revision.status === 'draft') ?? null;
    },
    async updateDraft(revisionId, patch) {
      const existing = revisionsById.get(Number(revisionId)) ?? null;

      if (!existing || existing.status !== 'draft') {
        return null;
      }

      const updated = normalizeTestSetRevisionRecord({
        ...existing,
        ...patch,
        id: existing.id,
        test_set_id: existing.testSetId,
        version_number: existing.versionNumber,
        status: existing.status,
        schema_version: existing.schemaVersion,
        created_by_user_id: existing.createdByUserId,
        created_at: existing.createdAt,
        published_at: existing.publishedAt,
        derived_from_revision_id:
          patch.derivedFromRevisionId === undefined
            ? existing.derivedFromRevisionId
            : patch.derivedFromRevisionId,
      });

      storeRevision(updated);
      return cloneValue(updated);
    },
    async publish(revisionId) {
      const existing = revisionsById.get(Number(revisionId)) ?? null;

      if (!existing || existing.status !== 'draft') {
        return null;
      }

      const updated = normalizeTestSetRevisionRecord({
        ...existing,
        status: 'published',
        published_at: existing.publishedAt ?? new Date().toISOString(),
      });

      storeRevision(updated);
      return cloneValue(updated);
    },
    async close() {},
  };
};

const createPostgresTestSetRevisionsRepository = ({ env }) => {
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
    async create(revision, { client } = {}) {
      const normalized = normalizeTestSetRevisionRecord(revision);

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            INSERT INTO test_set_revisions (
              test_set_id,
              version_number,
              status,
              schema_version,
              title_snapshot,
              description_snapshot,
              purpose_snapshot,
              visibility_snapshot,
              change_summary,
              cases_json,
              created_by_user_id,
              created_at,
              published_at,
              derived_from_revision_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, COALESCE($12, NOW()), $13, $14)
            RETURNING *
          `,
          [
            normalized.testSetId,
            normalized.versionNumber,
            normalized.status,
            normalized.schemaVersion,
            normalized.titleSnapshot,
            normalized.descriptionSnapshot,
            normalized.purposeSnapshot,
            normalized.visibilitySnapshot,
            normalized.changeSummary,
            JSON.stringify(normalized.cases ?? []),
            normalized.createdByUserId,
            normalized.createdAt,
            normalized.publishedAt,
            normalized.derivedFromRevisionId,
          ],
        );

        return normalizeTestSetRevisionRecord(result.rows[0]);
      }, client);
    },
    async getById(id, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            SELECT *
            FROM test_set_revisions
            WHERE id = $1
            LIMIT 1
          `,
          [Number(id)],
        );

        return result.rows[0] ? normalizeTestSetRevisionRecord(result.rows[0]) : null;
      }, client);
    },
    async listByTestSetId(testSetId, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            SELECT *
            FROM test_set_revisions
            WHERE test_set_id = $1
            ORDER BY version_number DESC, id DESC
          `,
          [Number(testSetId)],
        );

        return result.rows.map((row) => normalizeTestSetRevisionRecord(row));
      }, client);
    },
    async findDraftByTestSetId(testSetId, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            SELECT *
            FROM test_set_revisions
            WHERE test_set_id = $1 AND status = 'draft'
            ORDER BY version_number DESC, id DESC
            LIMIT 1
          `,
          [Number(testSetId)],
        );

        return result.rows[0] ? normalizeTestSetRevisionRecord(result.rows[0]) : null;
      }, client);
    },
    async updateDraft(revisionId, patch, { client } = {}) {
      return withClient(async (dbClient) => {
        const existing = await this.getById(revisionId, { client: dbClient });

        if (!existing || existing.status !== 'draft') {
          return null;
        }

        const nextRevision = normalizeTestSetRevisionRecord({
          ...existing,
          ...patch,
          id: existing.id,
          test_set_id: existing.testSetId,
          version_number: existing.versionNumber,
          status: existing.status,
          schema_version: existing.schemaVersion,
          created_by_user_id: existing.createdByUserId,
          created_at: existing.createdAt,
          published_at: existing.publishedAt,
          derived_from_revision_id:
            patch.derivedFromRevisionId === undefined
              ? existing.derivedFromRevisionId
              : patch.derivedFromRevisionId,
        });

        const result = await dbClient.query(
          `
            UPDATE test_set_revisions
            SET title_snapshot = $2,
                description_snapshot = $3,
                purpose_snapshot = $4,
                visibility_snapshot = $5,
                change_summary = $6,
                cases_json = $7::jsonb,
                derived_from_revision_id = $8
            WHERE id = $1 AND status = 'draft'
            RETURNING *
          `,
          [
            nextRevision.id,
            nextRevision.titleSnapshot,
            nextRevision.descriptionSnapshot,
            nextRevision.purposeSnapshot,
            nextRevision.visibilitySnapshot,
            nextRevision.changeSummary,
            JSON.stringify(nextRevision.cases ?? []),
            nextRevision.derivedFromRevisionId,
          ],
        );

        return result.rows[0] ? normalizeTestSetRevisionRecord(result.rows[0]) : null;
      }, client);
    },
    async publish(revisionId, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            UPDATE test_set_revisions
            SET status = 'published',
                published_at = COALESCE(published_at, NOW())
            WHERE id = $1 AND status = 'draft'
            RETURNING *
          `,
          [Number(revisionId)],
        );

        return result.rows[0] ? normalizeTestSetRevisionRecord(result.rows[0]) : null;
      }, client);
    },
    async close() {},
  };
};

export const createTestSetRevisionsRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresTestSetRevisionsRepository({ env })
    : createInMemoryTestSetRevisionsRepository();
