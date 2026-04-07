import { createDbClient } from '../db/client.js';

import {
  applyReviewHeaders,
  buildSerializedReview,
  requireAuthenticatedUser,
  requireCsrf,
  toNumericId,
} from './evaluations.js';
import { AUDIT_EVENT_TYPES } from '../services/audit-log.js';

const ASSIGNMENT_ROLE_BY_FIELD = Object.freeze({
  primaryEvaluatorUserId: 'primary_evaluator',
  secondReviewerUserId: 'second_reviewer',
  decisionOwnerUserId: 'decision_participant',
});

const runWithTransaction = async (app, callback) => {
  if (app.runtimeEnv.userStorageDriver !== 'pg') {
    return callback(null);
  }

  const client = createDbClient(app.runtimeEnv);
  await client.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
};

const buildRequestedAssignmentPatch = (review, body = {}) => {
  const assignmentSource = body.assignments ?? body;

  return {
    primaryEvaluatorUserId:
      Object.hasOwn(assignmentSource, 'primaryEvaluatorUserId')
        ? assignmentSource.primaryEvaluatorUserId
        : review.primaryEvaluatorUserId,
    secondReviewerUserId:
      Object.hasOwn(assignmentSource, 'secondReviewerUserId')
        ? assignmentSource.secondReviewerUserId
        : review.secondReviewerUserId,
    decisionOwnerUserId:
      Object.hasOwn(assignmentSource, 'decisionOwnerUserId')
        ? assignmentSource.decisionOwnerUserId
        : review.decisionOwnerUserId,
  };
};

const normalizeNullableUserId = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : NaN;
};

const validateAssignmentPatch = async (app, assignmentPatch) => {
  const normalized = {};

  for (const [fieldName, role] of Object.entries(ASSIGNMENT_ROLE_BY_FIELD)) {
    const normalizedUserId = normalizeNullableUserId(assignmentPatch[fieldName]);

    if (Number.isNaN(normalizedUserId)) {
      throw new Error(`A valid user id is required for ${fieldName}.`);
    }

    if (normalizedUserId === null) {
      normalized[fieldName] = null;
      continue;
    }

    const user = await app.userRepository.getById(normalizedUserId);

    if (!app.authorizationService.canAssignRoleToUser({ role, user })) {
      throw new Error(`User ${normalizedUserId} cannot hold assignment role ${role}.`);
    }

    normalized[fieldName] = normalizedUserId;
  }

  return normalized;
};

const buildRepositoryAssignmentPatch = (assignmentPatch) => ({
  primary_evaluator: assignmentPatch.primaryEvaluatorUserId,
  second_reviewer: assignmentPatch.secondReviewerUserId,
  decision_participant: assignmentPatch.decisionOwnerUserId,
});

const serializeAssignments = (assignments) => ({
  assignments: assignments.map((assignment) => ({
    id: assignment.id,
    role: assignment.role,
    userId: assignment.userId,
    assignedByUserId: assignment.assignedByUserId,
    assignedAt: assignment.assignedAt,
  })),
});

export const registerAssignmentRoutes = async (app) => {
  app.get('/api/evaluations/:id/assignments', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    const reviewId = toNumericId(request.params.id);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return reply.code(400).send({ message: 'A valid review id is required.' });
    }

    const review = await app.evaluationRepository.getVisibleById(reviewId, user.id, {
      userRole: user.role,
    });

    if (!review) {
      return reply.code(404).send({ message: 'Review not found.' });
    }

    const assignments = await app.assignmentsRepository.listActiveByEvaluationId(reviewId);
    return serializeAssignments(assignments);
  });

  app.post('/api/evaluations/:id/assignments', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    if (!requireCsrf(app, request, reply)) {
      return reply;
    }

    const reviewId = toNumericId(request.params.id);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return reply.code(400).send({ message: 'A valid review id is required.' });
    }

    const review = await app.evaluationRepository.getVisibleById(reviewId, user.id, {
      userRole: user.role,
    });

    if (!review) {
      return reply.code(404).send({ message: 'Review not found.' });
    }

    if (!app.authorizationService.canUserManageAssignments({ review, user })) {
      return reply.code(403).send({ message: 'Only coordinators may manage assignments.' });
    }

    try {
      const normalizedPatch = await validateAssignmentPatch(
        app,
        buildRequestedAssignmentPatch(review, request.body),
      );

      const updated = await runWithTransaction(app, async (client) => {
        const assignments = await app.assignmentsRepository.syncAssignments(
          {
            evaluationId: reviewId,
            assignments: buildRepositoryAssignmentPatch(normalizedPatch),
            assignedByUserId: user.id,
          },
          client ? { client } : undefined,
        );

        const updatedReview = await app.evaluationRepository.updateAssignmentPointers(
          {
            id: reviewId,
            primaryEvaluatorUserId: normalizedPatch.primaryEvaluatorUserId,
            secondReviewerUserId: normalizedPatch.secondReviewerUserId,
            decisionOwnerUserId: normalizedPatch.decisionOwnerUserId,
          },
          client ? { client } : undefined,
        );

        return { assignments, updatedReview };
      });

      await app.auditLogService.record({
        evaluationId: reviewId,
        actorUserId: user.id,
        eventType: AUDIT_EVENT_TYPES.ASSIGNMENTS_UPDATED,
        summary: `${user.displayName ?? user.email} updated assignments.`,
        metadataJson: {
          primaryEvaluatorUserId: normalizedPatch.primaryEvaluatorUserId,
          secondReviewerUserId: normalizedPatch.secondReviewerUserId,
          decisionOwnerUserId: normalizedPatch.decisionOwnerUserId,
        },
      });

      applyReviewHeaders(reply, updated.updatedReview);
      return {
        ...serializeAssignments(updated.assignments),
        review: await buildSerializedReview(app, updated.updatedReview, user),
      };
    } catch (error) {
      return reply.code(400).send({ message: error.message });
    }
  });
};
