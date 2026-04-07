import { formatEtagHeader } from '../services/etag.js';

const toNumericId = (value) => Number.parseInt(String(value ?? ''), 10);

const serializeRevisionSummary = (revision) => ({
  evaluationId: revision.evaluationId,
  revisionNumber: revision.revisionNumber,
  workflowMode: revision.workflowMode,
  lifecycleState: revision.lifecycleState,
  stateSchemaVersion: revision.stateSchemaVersion,
  frameworkVersion: revision.frameworkVersion,
  saveReason: revision.saveReason,
  savedByUserId: revision.savedByUserId,
  createdAt: revision.createdAt,
});

const serializeRevision = (revision) => ({
  ...serializeRevisionSummary(revision),
  state: revision.stateJson,
});

const requireAuthenticatedUser = async (app, request, reply) => {
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

export const registerRevisionRoutes = async (app) => {
  app.get('/api/evaluations/:id/revisions', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    const reviewId = toNumericId(request.params.id);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return reply.code(400).send({ message: 'A valid review id is required.' });
    }

    const review = await app.evaluationRepository.getVisibleById(reviewId, user.id);

    if (!review) {
      return reply.code(404).send({ message: 'Review not found.' });
    }

    reply.header('etag', formatEtagHeader(review.currentEtag));

    const revisions = await app.revisionRepository.listByEvaluationId(review.id);
    return { revisions: revisions.map((revision) => serializeRevisionSummary(revision)) };
  });

  app.get('/api/evaluations/:id/revisions/:revisionNumber', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    const reviewId = toNumericId(request.params.id);
    const revisionNumber = toNumericId(request.params.revisionNumber);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return reply.code(400).send({ message: 'A valid review id is required.' });
    }

    if (!Number.isInteger(revisionNumber) || revisionNumber <= 0) {
      return reply.code(400).send({ message: 'A valid revision number is required.' });
    }

    const review = await app.evaluationRepository.getVisibleById(reviewId, user.id);

    if (!review) {
      return reply.code(404).send({ message: 'Review not found.' });
    }

    const revision = await app.revisionRepository.getByEvaluationIdAndRevisionNumber(
      review.id,
      revisionNumber,
    );

    if (!revision) {
      return reply.code(404).send({ message: 'Revision not found.' });
    }

    return { revision: serializeRevision(revision) };
  });
};
