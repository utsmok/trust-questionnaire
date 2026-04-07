import { AUDIT_EVENT_TYPES } from '../services/audit-log.js';
import {
  requireAuthenticatedUser,
  requireCsrf,
  toNumericId,
} from './evaluations.js';

const normalizeFormat = (value) => (String(value ?? 'json').trim().toLowerCase() === 'zip' ? 'zip' : 'json');

export const registerExportRoutes = async (app) => {
  app.get('/api/evaluations/:id/exports', async (request, reply) => {
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

    const exports = await app.exporter.listExportJobs(reviewId);
    return { exports };
  });

  app.post('/api/evaluations/:id/exports', async (request, reply) => {
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
      const job = await app.exporter.createExportJob({
        evaluationId: reviewId,
        actorUser: user,
        format: normalizeFormat(request.body?.format),
        includeEvidenceFiles: Boolean(request.body?.includeEvidenceFiles),
        includeReportingCsv: Boolean(request.body?.includeReportingCsv ?? true),
      });

      await app.auditLogService.record({
        evaluationId: reviewId,
        actorUserId: user.id,
        eventType: AUDIT_EVENT_TYPES.EXPORT_CREATED,
        summary: `${user.displayName ?? user.email} created a ${job.format.toUpperCase()} export package.`,
        relatedExportJobId: job.jobId,
        metadataJson: {
          format: job.format,
          includeEvidenceFiles: job.includeEvidenceFiles,
          includeReportingCsv: job.includeReportingCsv,
        },
      });

      return reply.code(201).send({
        export: {
          ...job,
          downloadUrl: `/api/evaluations/${reviewId}/exports/${encodeURIComponent(job.jobId)}/download`,
        },
      });
    } catch (error) {
      return reply.code(400).send({ message: error.message });
    }
  });

  app.get('/api/evaluations/:id/exports/:jobId/download', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    const reviewId = toNumericId(request.params.id);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return reply.code(400).send({ message: 'A valid review id is required.' });
    }

    try {
      const rendered = await app.exporter.renderDownload({
        evaluationId: reviewId,
        actorUser: user,
        jobId: request.params.jobId,
      });

      reply.header('cache-control', 'private, no-store');
      reply.header('content-type', rendered.contentType);
      reply.header('content-length', String(rendered.body.byteLength));
      reply.header('content-disposition', `attachment; filename="${rendered.fileName}"`);
      return reply.send(rendered.body);
    } catch (error) {
      return reply.code(404).send({ message: error.message });
    }
  });
};
