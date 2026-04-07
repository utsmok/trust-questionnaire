import { createDbClient } from '../db/client.js';
import {
  buildRevisionRecord,
  buildUpdateEvaluationInput,
} from '../services/evaluation-state.js';
import { createEtagToken, matchesIfMatchHeader } from '../services/etag.js';

const VIEW_ALL_GLOBAL_ROLES = new Set(['coordinator', 'admin', 'auditor']);

const cloneValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  }

  return value;
};

const normalizeEvaluationRecord = (record) => ({
  id: Number(record.id),
  publicId: record.public_id ?? record.publicId,
  titleSnapshot: record.title_snapshot ?? record.titleSnapshot ?? '',
  workflowMode: record.workflow_mode ?? record.workflowMode,
  lifecycleState: record.lifecycle_state ?? record.lifecycleState,
  stateSchemaVersion: record.state_schema_version ?? record.stateSchemaVersion,
  frameworkVersion: record.framework_version ?? record.frameworkVersion,
  currentStateJson: cloneValue(record.current_state_json ?? record.currentStateJson ?? {}),
  currentRevisionNumber: Number(record.current_revision_number ?? record.currentRevisionNumber),
  currentEtag: record.current_etag ?? record.currentEtag,
  createdByUserId: Number(record.created_by_user_id ?? record.createdByUserId),
  primaryEvaluatorUserId:
    record.primary_evaluator_user_id === null || record.primary_evaluator_user_id === undefined
      ? null
      : Number(record.primary_evaluator_user_id ?? record.primaryEvaluatorUserId),
  secondReviewerUserId:
    record.second_reviewer_user_id === null || record.second_reviewer_user_id === undefined
      ? null
      : Number(record.second_reviewer_user_id ?? record.secondReviewerUserId),
  decisionOwnerUserId:
    record.decision_owner_user_id === null || record.decision_owner_user_id === undefined
      ? null
      : Number(record.decision_owner_user_id ?? record.decisionOwnerUserId),
  createdAt: record.created_at ?? record.createdAt ?? null,
  updatedAt: record.updated_at ?? record.updatedAt ?? null,
  submittedAt: record.submitted_at ?? record.submittedAt ?? null,
  finalizedAt: record.finalized_at ?? record.finalizedAt ?? null,
  archivedAt: record.archived_at ?? record.archivedAt ?? null,
});

const canUserViewEvaluation = (evaluation, userId, userRole = 'member') => {
  const numericUserId = Number(userId);

  if (VIEW_ALL_GLOBAL_ROLES.has(userRole)) {
    return true;
  }

  return [
    evaluation.createdByUserId,
    evaluation.primaryEvaluatorUserId,
    evaluation.secondReviewerUserId,
    evaluation.decisionOwnerUserId,
  ].includes(numericUserId);
};

const buildTransitionUpdateInput = ({
  existingEvaluation,
  currentState,
  workflowMode,
  lifecycleState,
  timestampPatch = {},
}) => {
  const currentRevisionNumber = existingEvaluation.currentRevisionNumber + 1;
  const currentEtag = createEtagToken({
    publicId: existingEvaluation.publicId,
    revisionNumber: currentRevisionNumber,
    workflowMode,
    lifecycleState,
    stateJson: currentState,
  });

  return {
    workflowMode,
    lifecycleState,
    stateSchemaVersion: existingEvaluation.stateSchemaVersion,
    frameworkVersion: existingEvaluation.frameworkVersion,
    currentStateJson: cloneValue(currentState),
    currentRevisionNumber,
    currentEtag,
    submittedAt:
      timestampPatch.submittedAt === undefined
        ? existingEvaluation.submittedAt
        : timestampPatch.submittedAt,
    finalizedAt:
      timestampPatch.finalizedAt === undefined
        ? existingEvaluation.finalizedAt
        : timestampPatch.finalizedAt,
    archivedAt:
      timestampPatch.archivedAt === undefined
        ? existingEvaluation.archivedAt
        : timestampPatch.archivedAt,
  };
};

const createInMemoryEvaluationsRepository = ({ revisionsRepository }) => {
  const evaluationsById = new Map();
  let nextId = 1;

  return {
    async create(evaluation, { savedByUserId, saveReason }) {
      const now = new Date().toISOString();
      const created = normalizeEvaluationRecord({
        id: nextId,
        ...evaluation,
        created_at: now,
        updated_at: now,
      });

      evaluationsById.set(created.id, created);
      nextId += 1;

      await revisionsRepository.append(
        buildRevisionRecord({
          evaluationId: created.id,
          workflowMode: created.workflowMode,
          lifecycleState: created.lifecycleState,
          stateSchemaVersion: created.stateSchemaVersion,
          frameworkVersion: created.frameworkVersion,
          stateJson: created.currentStateJson,
          revisionNumber: created.currentRevisionNumber,
          savedByUserId,
          saveReason,
        }),
      );

      return cloneValue(created);
    },
    async listVisibleToUser(userId, { userRole } = {}) {
      return [...evaluationsById.values()]
        .filter((evaluation) => canUserViewEvaluation(evaluation, userId, userRole))
        .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
        .map((evaluation) => cloneValue(evaluation));
    },
    async getVisibleById(id, userId, { userRole } = {}) {
      const evaluation = evaluationsById.get(Number(id)) ?? null;

      if (!evaluation || !canUserViewEvaluation(evaluation, userId, userRole)) {
        return null;
      }

      return cloneValue(evaluation);
    },
    async replaceState({ id, userId, userRole, expectedIfMatch, currentState, saveReason }) {
      const existing = evaluationsById.get(Number(id)) ?? null;

      if (!existing || !canUserViewEvaluation(existing, userId, userRole)) {
        return { kind: 'not_found', evaluation: null };
      }

      if (!matchesIfMatchHeader(existing.currentEtag, expectedIfMatch)) {
        return { kind: 'conflict', evaluation: cloneValue(existing) };
      }

      const update = buildUpdateEvaluationInput({
        existingEvaluation: existing,
        currentState,
        saveReason,
      });
      const updated = {
        ...existing,
        ...update,
        updatedAt: new Date().toISOString(),
      };

      delete updated.saveReason;
      evaluationsById.set(updated.id, updated);

      await revisionsRepository.append(
        buildRevisionRecord({
          evaluationId: updated.id,
          workflowMode: updated.workflowMode,
          lifecycleState: updated.lifecycleState,
          stateSchemaVersion: updated.stateSchemaVersion,
          frameworkVersion: updated.frameworkVersion,
          stateJson: updated.currentStateJson,
          revisionNumber: updated.currentRevisionNumber,
          savedByUserId: Number(userId),
          saveReason: update.saveReason,
        }),
      );

      return { kind: 'updated', evaluation: cloneValue(updated) };
    },
    async updateAssignmentPointers({
      id,
      primaryEvaluatorUserId,
      secondReviewerUserId,
      decisionOwnerUserId,
    }) {
      const existing = evaluationsById.get(Number(id)) ?? null;

      if (!existing) {
        return null;
      }

      const updated = {
        ...existing,
        primaryEvaluatorUserId,
        secondReviewerUserId,
        decisionOwnerUserId,
        updatedAt: new Date().toISOString(),
      };

      evaluationsById.set(updated.id, updated);
      return cloneValue(updated);
    },
    async transitionLifecycle({
      id,
      userId,
      userRole,
      expectedIfMatch,
      currentState,
      workflowMode,
      lifecycleState,
      timestampPatch,
      saveReason,
    }) {
      const existing = evaluationsById.get(Number(id)) ?? null;

      if (!existing || !canUserViewEvaluation(existing, userId, userRole)) {
        return { kind: 'not_found', evaluation: null };
      }

      if (!matchesIfMatchHeader(existing.currentEtag, expectedIfMatch)) {
        return { kind: 'conflict', evaluation: cloneValue(existing) };
      }

      const update = buildTransitionUpdateInput({
        existingEvaluation: existing,
        currentState,
        workflowMode,
        lifecycleState,
        timestampPatch,
      });
      const updated = {
        ...existing,
        ...update,
        updatedAt: new Date().toISOString(),
      };

      evaluationsById.set(updated.id, updated);

      await revisionsRepository.append(
        buildRevisionRecord({
          evaluationId: updated.id,
          workflowMode: updated.workflowMode,
          lifecycleState: updated.lifecycleState,
          stateSchemaVersion: updated.stateSchemaVersion,
          frameworkVersion: updated.frameworkVersion,
          stateJson: updated.currentStateJson,
          revisionNumber: updated.currentRevisionNumber,
          savedByUserId: Number(userId),
          saveReason,
        }),
      );

      return { kind: 'updated', evaluation: cloneValue(updated) };
    },
    async close() {},
  };
};

const createPostgresEvaluationsRepository = ({ env, revisionsRepository }) => {
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

  const visibilityClause = `
    (
      created_by_user_id = $2
      OR primary_evaluator_user_id = $2
      OR second_reviewer_user_id = $2
      OR decision_owner_user_id = $2
    )
  `;

  return {
    async create(evaluation, { savedByUserId, saveReason }) {
      return withClient(async (client) => {
        await client.query('BEGIN');

        try {
          const result = await client.query(
            `
              INSERT INTO evaluations (
                public_id,
                title_snapshot,
                workflow_mode,
                lifecycle_state,
                state_schema_version,
                framework_version,
                current_state_json,
                current_revision_number,
                current_etag,
                primary_evaluator_user_id,
                second_reviewer_user_id,
                decision_owner_user_id,
                created_by_user_id
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13)
              RETURNING *
            `,
            [
              evaluation.publicId,
              evaluation.titleSnapshot,
              evaluation.workflowMode,
              evaluation.lifecycleState,
              evaluation.stateSchemaVersion,
              evaluation.frameworkVersion,
              JSON.stringify(evaluation.currentStateJson),
              evaluation.currentRevisionNumber,
              evaluation.currentEtag,
              evaluation.primaryEvaluatorUserId,
              evaluation.secondReviewerUserId,
              evaluation.decisionOwnerUserId,
              evaluation.createdByUserId,
            ],
          );

          const created = normalizeEvaluationRecord(result.rows[0]);

          await revisionsRepository.append(
            buildRevisionRecord({
              evaluationId: created.id,
              workflowMode: created.workflowMode,
              lifecycleState: created.lifecycleState,
              stateSchemaVersion: created.stateSchemaVersion,
              frameworkVersion: created.frameworkVersion,
              stateJson: created.currentStateJson,
              revisionNumber: created.currentRevisionNumber,
              savedByUserId,
              saveReason,
            }),
            { client },
          );

          await client.query('COMMIT');
          return created;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });
    },
    async listVisibleToUser(userId, { userRole } = {}) {
      return withClient(async (client) => {
        const result = VIEW_ALL_GLOBAL_ROLES.has(userRole)
          ? await client.query(
              `
                SELECT *
                FROM evaluations
                ORDER BY updated_at DESC, id DESC
              `,
            )
          : await client.query(
              `
                SELECT *
                FROM evaluations
                WHERE created_by_user_id = $1
                   OR primary_evaluator_user_id = $1
                   OR second_reviewer_user_id = $1
                   OR decision_owner_user_id = $1
                ORDER BY updated_at DESC, id DESC
              `,
              [Number(userId)],
            );

        return result.rows.map((row) => normalizeEvaluationRecord(row));
      });
    },
    async getVisibleById(id, userId, { userRole } = {}) {
      return withClient(async (client) => {
        const result = VIEW_ALL_GLOBAL_ROLES.has(userRole)
          ? await client.query(
              `
                SELECT *
                FROM evaluations
                WHERE id = $1
                LIMIT 1
              `,
              [Number(id)],
            )
          : await client.query(
              `
                SELECT *
                FROM evaluations
                WHERE id = $1 AND ${visibilityClause}
                LIMIT 1
              `,
              [Number(id), Number(userId)],
            );

        return result.rows[0] ? normalizeEvaluationRecord(result.rows[0]) : null;
      });
    },
    async replaceState({ id, userId, userRole, expectedIfMatch, currentState, saveReason }) {
      return withClient(async (client) => {
        await client.query('BEGIN');

        try {
          const currentResult = VIEW_ALL_GLOBAL_ROLES.has(userRole)
            ? await client.query(
                `
                  SELECT *
                  FROM evaluations
                  WHERE id = $1
                  FOR UPDATE
                `,
                [Number(id)],
              )
            : await client.query(
                `
                  SELECT *
                  FROM evaluations
                  WHERE id = $1 AND ${visibilityClause}
                  FOR UPDATE
                `,
                [Number(id), Number(userId)],
              );

          if (!currentResult.rows[0]) {
            await client.query('ROLLBACK');
            return { kind: 'not_found', evaluation: null };
          }

          const existing = normalizeEvaluationRecord(currentResult.rows[0]);

          if (!matchesIfMatchHeader(existing.currentEtag, expectedIfMatch)) {
            await client.query('ROLLBACK');
            return { kind: 'conflict', evaluation: existing };
          }

          const update = buildUpdateEvaluationInput({
            existingEvaluation: existing,
            currentState,
            saveReason,
          });

          const updateResult = await client.query(
            `
              UPDATE evaluations
              SET workflow_mode = $2,
                  lifecycle_state = $3,
                  state_schema_version = $4,
                  framework_version = $5,
                  current_state_json = $6::jsonb,
                  current_revision_number = $7,
                  current_etag = $8,
                  updated_at = NOW()
              WHERE id = $1
              RETURNING *
            `,
            [
              existing.id,
              update.workflowMode,
              update.lifecycleState,
              update.stateSchemaVersion,
              update.frameworkVersion,
              JSON.stringify(update.currentStateJson),
              update.currentRevisionNumber,
              update.currentEtag,
            ],
          );

          const updated = normalizeEvaluationRecord(updateResult.rows[0]);

          await revisionsRepository.append(
            buildRevisionRecord({
              evaluationId: updated.id,
              workflowMode: updated.workflowMode,
              lifecycleState: updated.lifecycleState,
              stateSchemaVersion: updated.stateSchemaVersion,
              frameworkVersion: updated.frameworkVersion,
              stateJson: updated.currentStateJson,
              revisionNumber: updated.currentRevisionNumber,
              savedByUserId: Number(userId),
              saveReason: update.saveReason,
            }),
            { client },
          );

          await client.query('COMMIT');
          return { kind: 'updated', evaluation: updated };
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });
    },
    async updateAssignmentPointers(
      { id, primaryEvaluatorUserId, secondReviewerUserId, decisionOwnerUserId },
      { client } = {},
    ) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            UPDATE evaluations
            SET primary_evaluator_user_id = $2,
                second_reviewer_user_id = $3,
                decision_owner_user_id = $4,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
          `,
          [Number(id), primaryEvaluatorUserId, secondReviewerUserId, decisionOwnerUserId],
        );

        return result.rows[0] ? normalizeEvaluationRecord(result.rows[0]) : null;
      }, client);
    },
    async transitionLifecycle(
      {
        id,
        userId,
        userRole,
        expectedIfMatch,
        currentState,
        workflowMode,
        lifecycleState,
        timestampPatch,
        saveReason,
      },
      { client } = {},
    ) {
      return withClient(async (dbClient) => {
        const currentResult = VIEW_ALL_GLOBAL_ROLES.has(userRole)
          ? await dbClient.query(
              `
                SELECT *
                FROM evaluations
                WHERE id = $1
                FOR UPDATE
              `,
              [Number(id)],
            )
          : await dbClient.query(
              `
                SELECT *
                FROM evaluations
                WHERE id = $1 AND ${visibilityClause}
                FOR UPDATE
              `,
              [Number(id), Number(userId)],
            );

        if (!currentResult.rows[0]) {
          return { kind: 'not_found', evaluation: null };
        }

        const existing = normalizeEvaluationRecord(currentResult.rows[0]);

        if (!matchesIfMatchHeader(existing.currentEtag, expectedIfMatch)) {
          return { kind: 'conflict', evaluation: existing };
        }

        const update = buildTransitionUpdateInput({
          existingEvaluation: existing,
          currentState,
          workflowMode,
          lifecycleState,
          timestampPatch,
        });

        const updateResult = await dbClient.query(
          `
            UPDATE evaluations
            SET workflow_mode = $2,
                lifecycle_state = $3,
                current_state_json = $4::jsonb,
                current_revision_number = $5,
                current_etag = $6,
                submitted_at = $7,
                finalized_at = $8,
                archived_at = $9,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
          `,
          [
            Number(id),
            update.workflowMode,
            update.lifecycleState,
            JSON.stringify(update.currentStateJson),
            update.currentRevisionNumber,
            update.currentEtag,
            update.submittedAt,
            update.finalizedAt,
            update.archivedAt,
          ],
        );

        const updated = normalizeEvaluationRecord(updateResult.rows[0]);

        await revisionsRepository.append(
          buildRevisionRecord({
            evaluationId: updated.id,
            workflowMode: updated.workflowMode,
            lifecycleState: updated.lifecycleState,
            stateSchemaVersion: updated.stateSchemaVersion,
            frameworkVersion: updated.frameworkVersion,
            stateJson: updated.currentStateJson,
            revisionNumber: updated.currentRevisionNumber,
            savedByUserId: Number(userId),
            saveReason,
          }),
          { client: dbClient },
        );

        return { kind: 'updated', evaluation: updated };
      }, client);
    },
    async close() {},
  };
};

export const createEvaluationsRepository = ({ env, revisionsRepository } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresEvaluationsRepository({ env, revisionsRepository })
    : createInMemoryEvaluationsRepository({ revisionsRepository });
