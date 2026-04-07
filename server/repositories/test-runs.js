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

const normalizeOptionalText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const normalizeInteger = (value, fallback = null) => {
  const numeric = Number(value);
  return Number.isInteger(numeric) ? numeric : fallback;
};

const normalizeLinkIds = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((entry) => normalizeText(entry, '')).filter(Boolean))];
};

const normalizeTestRunRecord = (record) => ({
  id: Number(record.id ?? 0),
  evaluationId: Number(record.evaluation_id ?? record.evaluationId),
  reviewTestPlanId: Number(record.review_test_plan_id ?? record.reviewTestPlanId),
  testSetId: Number(record.test_set_id ?? record.testSetId),
  testSetRevisionId: Number(record.test_set_revision_id ?? record.testSetRevisionId),
  caseOrdinal: Number(record.case_ordinal ?? record.caseOrdinal ?? 0),
  caseTitleSnapshot: normalizeText(record.case_title_snapshot ?? record.caseTitleSnapshot, ''),
  criterionCode: normalizeOptionalText(record.criterion_code ?? record.criterionCode),
  status: normalizeText(record.status, 'not_started'),
  resultSummary: normalizeText(record.result_summary ?? record.resultSummary, ''),
  resultNotes: normalizeText(record.result_notes ?? record.resultNotes, ''),
  linkedEvidenceLinkIds: normalizeLinkIds(
    record.linked_evidence_link_ids_json ?? record.linkedEvidenceLinkIds ?? [],
  ),
  executedByUserId: Number(record.executed_by_user_id ?? record.executedByUserId),
  startedAt: record.started_at ?? record.startedAt ?? null,
  completedAt: record.completed_at ?? record.completedAt ?? null,
  createdAt: record.created_at ?? record.createdAt ?? null,
  updatedAt: record.updated_at ?? record.updatedAt ?? null,
});

const sortRuns = (left, right) => {
  const planOrder = left.reviewTestPlanId - right.reviewTestPlanId;

  if (planOrder !== 0) {
    return planOrder;
  }

  return left.caseOrdinal - right.caseOrdinal;
};

const createInMemoryTestRunsRepository = () => {
  let nextId = 1;
  const runsById = new Map();

  return {
    async listByEvaluationId(evaluationId) {
      return [...runsById.values()]
        .filter((run) => run.evaluationId === Number(evaluationId))
        .sort(sortRuns)
        .map((run) => cloneValue(run));
    },
    async findByPlanAndOrdinal({ reviewTestPlanId, caseOrdinal }) {
      const matched = [...runsById.values()].find(
        (run) =>
          run.reviewTestPlanId === Number(reviewTestPlanId) &&
          run.caseOrdinal === Number(caseOrdinal),
      );

      return matched ? cloneValue(matched) : null;
    },
    async upsert(run) {
      const existing = [...runsById.values()].find(
        (entry) =>
          entry.reviewTestPlanId === Number(run.reviewTestPlanId) &&
          entry.caseOrdinal === Number(run.caseOrdinal),
      );
      const normalized = normalizeTestRunRecord({
        id: existing?.id ?? nextId++,
        created_at: existing?.createdAt ?? new Date().toISOString(),
        updated_at: run.updatedAt ?? new Date().toISOString(),
        ...existing,
        ...run,
      });

      runsById.set(normalized.id, normalized);
      return cloneValue(normalized);
    },
    async close() {},
  };
};

const createPostgresTestRunsRepository = ({ env }) => {
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
    async listByEvaluationId(evaluationId, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            SELECT *
            FROM review_test_runs
            WHERE evaluation_id = $1
            ORDER BY review_test_plan_id ASC, case_ordinal ASC, id ASC
          `,
          [Number(evaluationId)],
        );

        return result.rows.map((row) => normalizeTestRunRecord(row));
      }, client);
    },
    async findByPlanAndOrdinal({ reviewTestPlanId, caseOrdinal }, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            SELECT *
            FROM review_test_runs
            WHERE review_test_plan_id = $1
              AND case_ordinal = $2
            LIMIT 1
          `,
          [Number(reviewTestPlanId), Number(caseOrdinal)],
        );

        return result.rows[0] ? normalizeTestRunRecord(result.rows[0]) : null;
      }, client);
    },
    async upsert(run, { client } = {}) {
      const normalized = normalizeTestRunRecord(run);

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            INSERT INTO review_test_runs (
              evaluation_id,
              review_test_plan_id,
              test_set_id,
              test_set_revision_id,
              case_ordinal,
              case_title_snapshot,
              criterion_code,
              status,
              result_summary,
              result_notes,
              linked_evidence_link_ids_json,
              executed_by_user_id,
              started_at,
              completed_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, COALESCE($15, NOW()))
            ON CONFLICT (review_test_plan_id, case_ordinal)
            DO UPDATE SET
              status = EXCLUDED.status,
              result_summary = EXCLUDED.result_summary,
              result_notes = EXCLUDED.result_notes,
              linked_evidence_link_ids_json = EXCLUDED.linked_evidence_link_ids_json,
              executed_by_user_id = EXCLUDED.executed_by_user_id,
              started_at = EXCLUDED.started_at,
              completed_at = EXCLUDED.completed_at,
              updated_at = EXCLUDED.updated_at,
              case_title_snapshot = EXCLUDED.case_title_snapshot,
              criterion_code = EXCLUDED.criterion_code,
              test_set_id = EXCLUDED.test_set_id,
              test_set_revision_id = EXCLUDED.test_set_revision_id,
              evaluation_id = EXCLUDED.evaluation_id
            RETURNING *
          `,
          [
            normalized.evaluationId,
            normalized.reviewTestPlanId,
            normalized.testSetId,
            normalized.testSetRevisionId,
            normalized.caseOrdinal,
            normalized.caseTitleSnapshot,
            normalized.criterionCode,
            normalized.status,
            normalized.resultSummary,
            normalized.resultNotes,
            JSON.stringify(normalized.linkedEvidenceLinkIds),
            normalized.executedByUserId,
            normalized.startedAt,
            normalized.completedAt,
            normalized.updatedAt,
          ],
        );

        return normalizeTestRunRecord(result.rows[0]);
      }, client);
    },
    async close() {},
  };
};

export const createTestRunsRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresTestRunsRepository({ env })
    : createInMemoryTestRunsRepository();
