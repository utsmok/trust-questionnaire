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

const normalizeTransitionRecord = (record) => ({
  id: Number(record.id),
  evaluationId: Number(record.evaluation_id ?? record.evaluationId),
  transitionId: record.transition_id ?? record.transitionId,
  fromLifecycleState: record.from_lifecycle_state ?? record.fromLifecycleState,
  toLifecycleState: record.to_lifecycle_state ?? record.toLifecycleState,
  resultingWorkflowMode: record.resulting_workflow_mode ?? record.resultingWorkflowMode,
  resultingRevisionNumber: Number(record.resulting_revision_number ?? record.resultingRevisionNumber),
  actorUserId: Number(record.actor_user_id ?? record.actorUserId),
  reason: record.reason ?? '',
  createdAt: record.created_at ?? record.createdAt ?? null,
});

const createInMemoryWorkflowTransitionsRepository = () => {
  let nextId = 1;
  const transitionsByEvaluationId = new Map();

  return {
    async append(transition) {
      const normalized = normalizeTransitionRecord({
        id: nextId++,
        created_at: new Date().toISOString(),
        ...transition,
      });
      const existing = transitionsByEvaluationId.get(normalized.evaluationId) ?? [];
      transitionsByEvaluationId.set(normalized.evaluationId, [normalized, ...existing]);
      return cloneValue(normalized);
    },
    async listByEvaluationId(evaluationId) {
      return (transitionsByEvaluationId.get(Number(evaluationId)) ?? []).map((record) =>
        cloneValue(record),
      );
    },
    async close() {},
  };
};

const createPostgresWorkflowTransitionsRepository = ({ env }) => {
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
    async append(transition, { client } = {}) {
      const normalized = normalizeTransitionRecord(transition);

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            INSERT INTO workflow_transitions (
              evaluation_id,
              transition_id,
              from_lifecycle_state,
              to_lifecycle_state,
              resulting_workflow_mode,
              resulting_revision_number,
              actor_user_id,
              reason
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
          `,
          [
            normalized.evaluationId,
            normalized.transitionId,
            normalized.fromLifecycleState,
            normalized.toLifecycleState,
            normalized.resultingWorkflowMode,
            normalized.resultingRevisionNumber,
            normalized.actorUserId,
            normalized.reason,
          ],
        );

        return normalizeTransitionRecord(result.rows[0]);
      }, client);
    },
    async listByEvaluationId(evaluationId) {
      return withClient(async (client) => {
        const result = await client.query(
          `
            SELECT *
            FROM workflow_transitions
            WHERE evaluation_id = $1
            ORDER BY created_at DESC, id DESC
          `,
          [Number(evaluationId)],
        );

        return result.rows.map((row) => normalizeTransitionRecord(row));
      });
    },
    async close() {},
  };
};

export const createWorkflowTransitionsRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresWorkflowTransitionsRepository({ env })
    : createInMemoryWorkflowTransitionsRepository();
