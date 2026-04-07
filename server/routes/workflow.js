import { createDbClient } from '../db/client.js';

import { FIELD_IDS } from '../../static/js/config/questionnaire-schema.js';
import { SAVE_REASONS } from '../services/evaluation-state.js';
import { planLifecycleTransition } from '../services/lifecycle.js';
import {
  applyReviewHeaders,
  buildSerializedReview,
  requireAuthenticatedUser,
  requireCsrf,
  toNumericId,
} from './evaluations.js';
import { AUDIT_EVENT_TYPES } from '../services/audit-log.js';

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

const cloneState = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneState(entry));
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneState(entry)]));
  }

  return value;
};

const buildNextTransitionState = (review, resultingWorkflowMode) => {
  const nextState = cloneState(review.currentStateJson);
  nextState.workflow = {
    ...(nextState.workflow ?? {}),
    mode: resultingWorkflowMode,
  };
  nextState.fields = {
    ...(nextState.fields ?? {}),
    [FIELD_IDS.S0.SUBMISSION_TYPE]: resultingWorkflowMode,
  };
  return nextState;
};

const toTransitionErrorStatus = (error) =>
  error.message.startsWith('Actor is not allowed') ? 403 : 400;

export const registerWorkflowRoutes = async (app) => {
  app.post('/api/evaluations/:id/transitions', async (request, reply) => {
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

    const ifMatch = request.headers['if-match'];

    if (typeof ifMatch !== 'string' || !ifMatch.trim()) {
      return reply.code(428).send({ message: 'An If-Match header is required.' });
    }

    const review = await app.evaluationRepository.getVisibleById(reviewId, user.id, {
      userRole: user.role,
    });

    if (!review) {
      return reply.code(404).send({ message: 'Review not found.' });
    }

    const transitionId =
      typeof request.body?.transitionId === 'string' ? request.body.transitionId.trim() : '';
    const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim() : '';

    if (!transitionId) {
      return reply.code(400).send({ message: 'A transitionId is required.' });
    }

    try {
      const transitionPlan = planLifecycleTransition({
        review,
        transitionId,
        actorContext: app.authorizationService.getActorContext({ review, user }),
      });
      const transitionState = buildNextTransitionState(
        review,
        transitionPlan.resultingWorkflowMode,
      );

      const result = await runWithTransaction(app, async (client) => {
        const transitionResult = await app.evaluationRepository.transitionLifecycle(
          {
            id: reviewId,
            userId: user.id,
            userRole: user.role,
            expectedIfMatch: ifMatch,
            currentState: transitionState,
            workflowMode: transitionPlan.resultingWorkflowMode,
            lifecycleState: transitionPlan.toLifecycleState,
            timestampPatch: transitionPlan.timestampPatch,
            saveReason: SAVE_REASONS.LIFECYCLE_TRANSITION,
          },
          client ? { client } : undefined,
        );

        if (transitionResult.kind !== 'updated') {
          return { transitionResult, transitionRecord: null };
        }

        const transitionRecord = await app.workflowTransitionsRepository.append(
          {
            evaluationId: reviewId,
            transitionId: transitionPlan.transitionId,
            fromLifecycleState: transitionPlan.fromLifecycleState,
            toLifecycleState: transitionPlan.toLifecycleState,
            resultingWorkflowMode: transitionPlan.resultingWorkflowMode,
            resultingRevisionNumber: transitionResult.evaluation.currentRevisionNumber,
            actorUserId: user.id,
            reason,
          },
          client ? { client } : undefined,
        );

        return { transitionResult, transitionRecord };
      });

      if (result.transitionResult.kind === 'not_found') {
        return reply.code(404).send({ message: 'Review not found.' });
      }

      if (result.transitionResult.kind === 'conflict') {
        applyReviewHeaders(reply, result.transitionResult.evaluation);
        return reply.code(412).send({
          message: 'The saved review has changed on the server. Reload before applying a transition.',
          review: await buildSerializedReview(app, result.transitionResult.evaluation, user),
        });
      }

      await app.auditLogService.record({
        evaluationId: reviewId,
        actorUserId: user.id,
        eventType: AUDIT_EVENT_TYPES.LIFECYCLE_TRANSITION,
        summary: `${user.displayName ?? user.email} applied transition ${transitionPlan.transitionId}.`,
        relatedRevisionNumber: result.transitionResult.evaluation.currentRevisionNumber,
        metadataJson: {
          transitionId: transitionPlan.transitionId,
          fromLifecycleState: transitionPlan.fromLifecycleState,
          toLifecycleState: transitionPlan.toLifecycleState,
          resultingWorkflowMode: transitionPlan.resultingWorkflowMode,
          reason,
        },
      });

      applyReviewHeaders(reply, result.transitionResult.evaluation);
      return {
        transition: result.transitionRecord,
        review: await buildSerializedReview(app, result.transitionResult.evaluation, user),
      };
    } catch (error) {
      return reply.code(toTransitionErrorStatus(error)).send({ message: error.message });
    }
  });
};
