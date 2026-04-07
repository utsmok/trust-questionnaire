import { createDbClient } from '../db/client.js';

const ASSIGNMENT_ROLES = new Set([
  'primary_evaluator',
  'second_reviewer',
  'decision_participant',
  'observer',
]);

const cloneValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  }

  return value;
};

const normalizeAssignmentRecord = (record) => ({
  id: Number(record.id),
  evaluationId: Number(record.evaluation_id ?? record.evaluationId),
  role: record.role,
  userId: Number(record.user_id ?? record.userId),
  assignedByUserId: Number(record.assigned_by_user_id ?? record.assignedByUserId),
  assignedAt: record.assigned_at ?? record.assignedAt ?? null,
  unassignedAt: record.unassigned_at ?? record.unassignedAt ?? null,
});

const normalizeAssignmentPatch = (assignments = {}) =>
  Object.fromEntries(
    Object.entries(assignments)
      .filter(([role]) => ASSIGNMENT_ROLES.has(role))
      .map(([role, userId]) => [
        role,
        userId === null || userId === undefined || userId === '' ? null : Number(userId),
      ])
      .filter(([, userId]) => userId === null || (Number.isInteger(userId) && userId > 0)),
  );

const createInMemoryAssignmentsRepository = () => {
  let nextId = 1;
  const assignmentsByEvaluationId = new Map();

  const listAllForEvaluation = (evaluationId) =>
    assignmentsByEvaluationId.get(Number(evaluationId)) ?? [];

  return {
    async listActiveByEvaluationId(evaluationId) {
      return listAllForEvaluation(evaluationId)
        .filter((record) => !record.unassignedAt)
        .map((record) => cloneValue(record));
    },
    async syncAssignments({ evaluationId, assignments, assignedByUserId }) {
      const normalizedAssignments = normalizeAssignmentPatch(assignments);
      const now = new Date().toISOString();
      const existing = listAllForEvaluation(evaluationId).map((record) => ({ ...record }));

      Object.entries(normalizedAssignments).forEach(([role, userId]) => {
        const active = existing.find((record) => record.role === role && !record.unassignedAt) ?? null;

        if (active && active.userId === userId) {
          return;
        }

        if (active) {
          active.unassignedAt = now;
        }

        if (userId !== null) {
          existing.push(
            normalizeAssignmentRecord({
              id: nextId++,
              evaluation_id: evaluationId,
              role,
              user_id: userId,
              assigned_by_user_id: assignedByUserId,
              assigned_at: now,
              unassigned_at: null,
            }),
          );
        }
      });

      assignmentsByEvaluationId.set(Number(evaluationId), existing);
      return existing.filter((record) => !record.unassignedAt).map((record) => cloneValue(record));
    },
    async close() {},
  };
};

const createPostgresAssignmentsRepository = ({ env }) => {
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
    async listActiveByEvaluationId(evaluationId) {
      return withClient(async (client) => {
        const result = await client.query(
          `
            SELECT *
            FROM evaluation_assignments
            WHERE evaluation_id = $1 AND unassigned_at IS NULL
            ORDER BY role ASC, assigned_at DESC
          `,
          [Number(evaluationId)],
        );

        return result.rows.map((row) => normalizeAssignmentRecord(row));
      });
    },
    async syncAssignments({ evaluationId, assignments, assignedByUserId }, { client } = {}) {
      const normalizedAssignments = normalizeAssignmentPatch(assignments);

      return withClient(async (dbClient) => {
        for (const [role, userId] of Object.entries(normalizedAssignments)) {
          const activeResult = await dbClient.query(
            `
              SELECT *
              FROM evaluation_assignments
              WHERE evaluation_id = $1 AND role = $2 AND unassigned_at IS NULL
              ORDER BY assigned_at DESC
              LIMIT 1
              FOR UPDATE
            `,
            [Number(evaluationId), role],
          );

          const active = activeResult.rows[0] ? normalizeAssignmentRecord(activeResult.rows[0]) : null;

          if (active && active.userId === userId) {
            continue;
          }

          if (active) {
            await dbClient.query(
              `
                UPDATE evaluation_assignments
                SET unassigned_at = NOW()
                WHERE id = $1
              `,
              [active.id],
            );
          }

          if (userId !== null) {
            await dbClient.query(
              `
                INSERT INTO evaluation_assignments (
                  evaluation_id,
                  role,
                  user_id,
                  assigned_by_user_id
                )
                VALUES ($1, $2, $3, $4)
              `,
              [Number(evaluationId), role, Number(userId), Number(assignedByUserId)],
            );
          }
        }

        const result = await dbClient.query(
          `
            SELECT *
            FROM evaluation_assignments
            WHERE evaluation_id = $1 AND unassigned_at IS NULL
            ORDER BY role ASC, assigned_at DESC
          `,
          [Number(evaluationId)],
        );

        return result.rows.map((row) => normalizeAssignmentRecord(row));
      }, client);
    },
    async close() {},
  };
};

export const createAssignmentsRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresAssignmentsRepository({ env })
    : createInMemoryAssignmentsRepository();
