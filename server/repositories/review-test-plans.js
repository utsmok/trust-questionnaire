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

const normalizeReviewTestPlanRecord = (record) => ({
  id: Number(record.id ?? 0),
  evaluationId: Number(record.evaluation_id ?? record.evaluationId),
  testSetId: Number(record.test_set_id ?? record.testSetId),
  testSetRevisionId: Number(record.test_set_revision_id ?? record.testSetRevisionId),
  role: normalizeText(record.role, 'baseline'),
  linkedByUserId: Number(record.linked_by_user_id ?? record.linkedByUserId),
  linkedAt: record.linked_at ?? record.linkedAt ?? null,
});

const sortPlans = (left, right) =>
  String(right.linkedAt ?? '').localeCompare(String(left.linkedAt ?? ''));

const createInMemoryReviewTestPlansRepository = () => {
  let nextId = 1;
  const plansById = new Map();

  return {
    async create(plan) {
      const created = normalizeReviewTestPlanRecord({
        id: nextId++,
        linked_at: plan.linkedAt ?? new Date().toISOString(),
        ...plan,
      });
      plansById.set(created.id, created);
      return cloneValue(created);
    },
    async listByEvaluationId(evaluationId) {
      return [...plansById.values()]
        .filter((plan) => plan.evaluationId === Number(evaluationId))
        .sort(sortPlans)
        .map((plan) => cloneValue(plan));
    },
    async listByTestSetId(testSetId) {
      return [...plansById.values()]
        .filter((plan) => plan.testSetId === Number(testSetId))
        .sort(sortPlans)
        .map((plan) => cloneValue(plan));
    },
    async findByEvaluationAndRevision({ evaluationId, testSetRevisionId, role }) {
      const matched = [...plansById.values()].find(
        (plan) =>
          plan.evaluationId === Number(evaluationId) &&
          plan.testSetRevisionId === Number(testSetRevisionId) &&
          plan.role === role,
      );

      return matched ? cloneValue(matched) : null;
    },
    async close() {},
  };
};

const createPostgresReviewTestPlansRepository = ({ env }) => {
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
    async create(plan, { client } = {}) {
      const normalized = normalizeReviewTestPlanRecord(plan);

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            INSERT INTO review_test_plans (
              evaluation_id,
              test_set_id,
              test_set_revision_id,
              role,
              linked_by_user_id,
              linked_at
            )
            VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()))
            RETURNING *
          `,
          [
            normalized.evaluationId,
            normalized.testSetId,
            normalized.testSetRevisionId,
            normalized.role,
            normalized.linkedByUserId,
            normalized.linkedAt,
          ],
        );

        return normalizeReviewTestPlanRecord(result.rows[0]);
      }, client);
    },
    async listByEvaluationId(evaluationId, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            SELECT *
            FROM review_test_plans
            WHERE evaluation_id = $1
            ORDER BY linked_at DESC, id DESC
          `,
          [Number(evaluationId)],
        );

        return result.rows.map((row) => normalizeReviewTestPlanRecord(row));
      }, client);
    },
    async listByTestSetId(testSetId, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            SELECT *
            FROM review_test_plans
            WHERE test_set_id = $1
            ORDER BY linked_at DESC, id DESC
          `,
          [Number(testSetId)],
        );

        return result.rows.map((row) => normalizeReviewTestPlanRecord(row));
      }, client);
    },
    async findByEvaluationAndRevision({ evaluationId, testSetRevisionId, role }, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            SELECT *
            FROM review_test_plans
            WHERE evaluation_id = $1 AND test_set_revision_id = $2 AND role = $3
            LIMIT 1
          `,
          [Number(evaluationId), Number(testSetRevisionId), role],
        );

        return result.rows[0] ? normalizeReviewTestPlanRecord(result.rows[0]) : null;
      }, client);
    },
    async close() {},
  };
};

export const createReviewTestPlansRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresReviewTestPlansRepository({ env })
    : createInMemoryReviewTestPlansRepository();
