import { CRITERIA_BY_CODE } from '../../static/js/config/questionnaire-schema.js';
import { SECTION_REGISTRY } from '../../static/js/config/sections.js';
import {
  buildSerializedReview,
  requireAuthenticatedUser,
  requireCsrf,
  toNumericId,
} from './evaluations.js';
import { AUDIT_EVENT_TYPES } from '../services/audit-log.js';

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const formatActorName = (user) => user?.displayName ?? user?.email ?? `User ${user?.id ?? 'unknown'}`;

const serializeComment = (comment) => ({
  id: comment.id,
  evaluationId: comment.evaluationId,
  scopeType: comment.scopeType,
  sectionId: comment.sectionId,
  criterionCode: comment.criterionCode,
  body: comment.body,
  createdByUserId: comment.createdByUserId,
  createdAt: comment.createdAt,
});

const serializeActivityEvent = (event) => ({
  id: event.id,
  kind: 'audit_event',
  eventType: event.eventType,
  summary: event.summary,
  scopeType: event.scopeType,
  sectionId: event.sectionId,
  criterionCode: event.criterionCode,
  relatedCommentId: event.relatedCommentId,
  relatedAssetId: event.relatedAssetId,
  relatedLinkId: event.relatedLinkId,
  relatedRevisionNumber: event.relatedRevisionNumber,
  relatedExportJobId: event.relatedExportJobId,
  relatedImportRecordId: event.relatedImportRecordId,
  metadata: event.metadataJson ?? {},
  actorUserId: event.actorUserId,
  createdAt: event.createdAt,
});

const normalizeCommentScope = ({ scopeType, sectionId, criterionCode }) => {
  const normalizedScopeType = normalizeText(scopeType) ?? 'review';

  if (normalizedScopeType === 'review') {
    return {
      scopeType: 'review',
      sectionId: null,
      criterionCode: null,
    };
  }

  if (normalizedScopeType === 'section') {
    const normalizedSectionId = normalizeText(sectionId);
    const matchedSection = SECTION_REGISTRY.find((section) => section.id === normalizedSectionId);

    if (!matchedSection) {
      throw new Error('A valid sectionId is required for section comments.');
    }

    return {
      scopeType: 'section',
      sectionId: matchedSection.id,
      criterionCode: null,
    };
  }

  if (normalizedScopeType === 'criterion') {
    const normalizedCriterionCode = normalizeText(criterionCode);
    const criterion = CRITERIA_BY_CODE[normalizedCriterionCode] ?? null;

    if (!criterion) {
      throw new Error('A valid criterionCode is required for criterion comments.');
    }

    return {
      scopeType: 'criterion',
      sectionId: criterion.sectionId,
      criterionCode: criterion.code,
    };
  }

  throw new Error(`Unsupported comment scopeType: ${scopeType ?? '<missing>'}.`);
};

export const registerCommentRoutes = async (app) => {
  app.get('/api/evaluations/:id/comments', async (request, reply) => {
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

    const comments = await app.commentsRepository.listByEvaluationId(reviewId);
    return {
      review: await buildSerializedReview(app, review, user),
      comments: comments.map((comment) => serializeComment(comment)),
    };
  });

  app.post('/api/evaluations/:id/comments', async (request, reply) => {
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

    try {
      const body = normalizeText(request.body?.body);

      if (!body) {
        throw new Error('Comment body is required.');
      }

      const scope = normalizeCommentScope({
        scopeType: request.body?.scopeType,
        sectionId: request.body?.sectionId,
        criterionCode: request.body?.criterionCode,
      });

      const comment = await app.commentsRepository.create({
        evaluationId: reviewId,
        scopeType: scope.scopeType,
        sectionId: scope.sectionId,
        criterionCode: scope.criterionCode,
        body,
        createdByUserId: user.id,
      });

      await app.auditLogService.record({
        evaluationId: reviewId,
        actorUserId: user.id,
        eventType: AUDIT_EVENT_TYPES.COMMENT_CREATED,
        summary: `${formatActorName(user)} added a ${scope.scopeType} comment.`,
        scopeType: scope.scopeType,
        sectionId: scope.sectionId,
        criterionCode: scope.criterionCode,
        relatedCommentId: comment.id,
      });

      return reply.code(201).send({ comment: serializeComment(comment) });
    } catch (error) {
      return reply.code(400).send({ message: error.message });
    }
  });

  app.get('/api/evaluations/:id/activity', async (request, reply) => {
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

    const [comments, auditEvents] = await Promise.all([
      app.commentsRepository.listByEvaluationId(reviewId),
      app.auditLogService.listByEvaluationId(reviewId),
    ]);

    return {
      review: await buildSerializedReview(app, review, user),
      comments: comments.map((comment) => ({
        ...serializeComment(comment),
        kind: 'comment',
      })),
      auditEvents: auditEvents.map((event) => serializeActivityEvent(event)),
    };
  });
};
