import {
  SAVE_REASONS,
  buildCreateEvaluationInput,
  normalizeEvaluationState,
} from '../services/evaluation-state.js';
import { formatEtagHeader } from '../services/etag.js';
import { AUDIT_EVENT_TYPES } from '../services/audit-log.js';

export const toNumericId = (value) => Number.parseInt(String(value ?? ''), 10);

export const serializeReviewSummary = (evaluation) => ({
  id: evaluation.id,
  publicId: evaluation.publicId,
  titleSnapshot: evaluation.titleSnapshot,
  workflowMode: evaluation.workflowMode,
  lifecycleState: evaluation.lifecycleState,
  stateSchemaVersion: evaluation.stateSchemaVersion,
  frameworkVersion: evaluation.frameworkVersion,
  currentRevisionNumber: evaluation.currentRevisionNumber,
  etag: formatEtagHeader(evaluation.currentEtag),
  createdByUserId: evaluation.createdByUserId,
  assignment: {
    primaryEvaluatorUserId: evaluation.primaryEvaluatorUserId,
    secondReviewerUserId: evaluation.secondReviewerUserId,
    decisionOwnerUserId: evaluation.decisionOwnerUserId,
  },
  createdAt: evaluation.createdAt,
  updatedAt: evaluation.updatedAt,
});

const serializeUserSummary = (user) =>
  user
    ? {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      }
    : null;

const resolveAssignedUsers = async (app, evaluation) => {
  const [primaryEvaluator, secondReviewer, decisionParticipant] = await Promise.all([
    evaluation.primaryEvaluatorUserId
      ? app.userRepository.getById(evaluation.primaryEvaluatorUserId)
      : Promise.resolve(null),
    evaluation.secondReviewerUserId
      ? app.userRepository.getById(evaluation.secondReviewerUserId)
      : Promise.resolve(null),
    evaluation.decisionOwnerUserId
      ? app.userRepository.getById(evaluation.decisionOwnerUserId)
      : Promise.resolve(null),
  ]);

  return {
    primaryEvaluator: serializeUserSummary(primaryEvaluator),
    secondReviewer: serializeUserSummary(secondReviewer),
    decisionParticipant: serializeUserSummary(decisionParticipant),
  };
};

export const buildSerializedReview = async (app, evaluation, user) => ({
  ...serializeReviewSummary(evaluation),
  currentState: evaluation.currentStateJson,
  assignmentUsers: await resolveAssignedUsers(app, evaluation),
  workflowAuthority: app.authorizationService.buildWorkflowAuthority({ review: evaluation, user }),
});

export const requireAuthenticatedUser = async (app, request, reply) => {
  if (!request.authSession) {
    reply.code(401).send({ message: 'Authentication required.' });
    return null;
  }

  const user = await app.userRepository.getById(request.authSession.userId);

  if (!user || !user.isActive) {
    reply.code(401).send({ message: 'Authentication required.' });
    return null;
  }

  return user;
};

export const requireCsrf = (app, request, reply) => {
  if (!app.sessionManager.validateCsrf(request)) {
    reply.code(403).send({ message: 'A valid CSRF token is required.' });
    return false;
  }

  return true;
};

export const applyReviewHeaders = (reply, evaluation) => {
  reply.header('etag', formatEtagHeader(evaluation.currentEtag));
};

export const registerEvaluationRoutes = async (app) => {
  app.get('/api/evaluations', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    const reviews = await app.evaluationRepository.listVisibleToUser(user.id, {
      userRole: user.role,
    });
    return { reviews: reviews.map((review) => serializeReviewSummary(review)) };
  });

  app.post('/api/evaluations', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    if (!requireCsrf(app, request, reply)) {
      return reply;
    }

    try {
      const evaluationInput = buildCreateEvaluationInput({
        currentState: request.body?.currentState,
        createdByUserId: user.id,
        titleSnapshot: request.body?.titleSnapshot,
      });
      const review = await app.evaluationRepository.create(evaluationInput, {
        savedByUserId: user.id,
        saveReason: SAVE_REASONS.CREATE_REVIEW,
      });

      await app.auditLogService.record({
        evaluationId: review.id,
        actorUserId: user.id,
        eventType: AUDIT_EVENT_TYPES.REVIEW_CREATED,
        summary: `${user.displayName ?? user.email} created review ${review.publicId}.`,
        relatedRevisionNumber: review.currentRevisionNumber,
      });

      applyReviewHeaders(reply, review);
      return reply.code(201).send({ review: await buildSerializedReview(app, review, user) });
    } catch (error) {
      return reply.code(400).send({ message: error.message });
    }
  });

  app.get('/api/evaluations/:id', async (request, reply) => {
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

    applyReviewHeaders(reply, review);
    return { review: await buildSerializedReview(app, review, user) };
  });

  app.put('/api/evaluations/:id/state', async (request, reply) => {
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

    try {
      const existingReview = await app.evaluationRepository.getVisibleById(reviewId, user.id, {
        userRole: user.role,
      });

      if (!existingReview) {
        return reply.code(404).send({ message: 'Review not found.' });
      }

      const normalizedState = normalizeEvaluationState(request.body?.currentState, {
        requiredWorkflowMode: existingReview.workflowMode,
      });
      const stateAuthorization = app.authorizationService.authorizeStateWrite({
        review: existingReview,
        nextState: normalizedState,
        user,
      });

      if (!stateAuthorization.allowed) {
        return reply.code(403).send({
          message:
            'The current user cannot modify one or more changed sections in the active workflow/lifecycle stage.',
          changedSectionIds: stateAuthorization.changedSectionIds,
          changedFieldIds: stateAuthorization.changedFieldIds,
          blockedSectionIds: stateAuthorization.blockedSectionIds,
          lockedFieldIds: stateAuthorization.lockedFieldIds,
          workflowAuthority: stateAuthorization.authority,
        });
      }

      const result = await app.evaluationRepository.replaceState({
        id: reviewId,
        userId: user.id,
        userRole: user.role,
        expectedIfMatch: ifMatch,
        currentState: normalizedState,
        saveReason: request.body?.saveReason,
      });

      if (result.kind === 'not_found') {
        return reply.code(404).send({ message: 'Review not found.' });
      }

      if (result.kind === 'conflict') {
        applyReviewHeaders(reply, result.evaluation);
        return reply.code(412).send({
          message: 'The saved review has changed on the server. Reload before saving again.',
          review: await buildSerializedReview(app, result.evaluation, user),
        });
      }

      await app.auditLogService.record({
        evaluationId: result.evaluation.id,
        actorUserId: user.id,
        eventType: AUDIT_EVENT_TYPES.REVIEW_STATE_SAVED,
        summary: `${user.displayName ?? user.email} saved review state.`,
        relatedRevisionNumber: result.evaluation.currentRevisionNumber,
        metadataJson: {
          saveReason: request.body?.saveReason ?? null,
        },
      });

      applyReviewHeaders(reply, result.evaluation);
      return { review: await buildSerializedReview(app, result.evaluation, user) };
    } catch (error) {
      return reply.code(400).send({ message: error.message });
    }
  });
};
