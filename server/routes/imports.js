import { buildSerializedReview, requireAuthenticatedUser, requireCsrf, toNumericId } from './evaluations.js';

const normalizeFormat = (value) => (String(value ?? 'json').trim().toLowerCase() === 'zip' ? 'zip' : 'json');

export const registerImportRoutes = async (app) => {
  app.get('/api/evaluations/:id/imports', async (request, reply) => {
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

    const imports = await app.importer.listImportRecords(reviewId);
    return { imports };
  });

  app.post('/api/evaluations/:id/imports', async (request, reply) => {
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

    try {
      const imported = await app.importer.importLegacyEvidenceManifest({
        evaluationId: reviewId,
        actorUser: user,
        payload: request.body ?? {},
        sourceFormat: normalizeFormat(request.body?.sourceFormat),
      });
      const review = await app.evaluationRepository.getVisibleById(reviewId, user.id, {
        userRole: user.role,
      });

      return reply.code(201).send({
        importRecord: imported.record,
        importedLinkCount: imported.importedLinkCount,
        review: await buildSerializedReview(app, review, user),
      });
    } catch (error) {
      return reply.code(400).send({ message: error.message });
    }
  });

  app.post('/api/import/evaluations', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    if (!requireCsrf(app, request, reply)) {
      return reply;
    }

    try {
      const imported = await app.importer.importCanonicalReview({
        actorUser: user,
        payload: request.body ?? {},
        sourceFormat: normalizeFormat(request.body?.sourceFormat),
      });

      return reply.code(201).send({
        importRecord: imported.record,
        review: await buildSerializedReview(app, imported.importedReview, user),
      });
    } catch (error) {
      return reply.code(400).send({ message: error.message });
    }
  });
};
