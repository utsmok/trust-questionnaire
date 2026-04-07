import { isEvidenceServiceError } from '../services/evidence-service.js';
import { AUDIT_EVENT_TYPES } from '../services/audit-log.js';

const toNumericId = (value) => Number.parseInt(String(value ?? ''), 10);

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

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

const requireCsrf = (app, request, reply) => {
  if (!app.sessionManager.validateCsrf(request)) {
    reply.code(403).send({ message: 'A valid CSRF token is required.' });
    return false;
  }

  return true;
};

const serializeAsset = (asset, evaluationId) => ({
  assetId: asset.assetId,
  assetKind: asset.assetKind,
  sourceType: asset.sourceType,
  storageProvider: asset.storageProvider,
  storageKey: asset.storageKey,
  contentHash: asset.contentHash,
  createdByUserId: asset.createdByUserId,
  createdAt: asset.createdAt,
  deletedAt: asset.deletedAt,
  originalName: asset.originalName,
  sanitizedName: asset.sanitizedName,
  mimeType: asset.mimeType,
  sizeBytes: asset.sizeBytes,
  imageWidth: asset.imageWidth,
  imageHeight: asset.imageHeight,
  previewStorageKey: asset.previewStorageKey,
  capturedAtClient: asset.capturedAtClient,
  receivedAtServer: asset.receivedAtServer,
  originUrl: asset.originUrl,
  originTitle: asset.originTitle,
  captureToolVersion: asset.captureToolVersion,
  browserName: asset.browserName,
  browserVersion: asset.browserVersion,
  pageLanguage: asset.pageLanguage,
  redactionStatus: asset.redactionStatus,
  importSource: asset.importSource,
  downloadUrl: asset.storageKey
    ? `/api/evaluations/${evaluationId}/evidence/assets/${asset.assetId}/download`
    : null,
});

const serializeLink = (link) => ({
  linkId: link.linkId,
  evaluationId: link.evaluationId,
  assetId: link.assetId,
  scopeType: link.scopeType,
  sectionId: link.sectionId,
  criterionCode: link.criterionCode,
  evidenceType: link.evidenceType,
  note: link.note,
  linkedByUserId: link.linkedByUserId,
  linkedAt: link.linkedAt,
  replacedFromLinkId: link.replacedFromLinkId,
  deletedAt: link.deletedAt,
});

const serializeCaptureSummary = (capture) =>
  capture
    ? {
        captureId: capture.captureId,
        selectionText: capture.selectionText,
        originUrl: capture.originUrl,
        originTitle: capture.originTitle,
        capturedAtClient: capture.capturedAtClient,
        browserName: capture.browserName,
        browserVersion: capture.browserVersion,
        extensionVersion: capture.extensionVersion,
      }
    : null;

const serializeCaptureTarget = (target) => ({
  scopeType: target.scopeType,
  sectionId: target.sectionId,
  criterionCode: target.criterionCode,
  label: target.label,
});

const sendEvidenceError = (reply, error) => {
  if (isEvidenceServiceError(error)) {
    return reply.code(error.statusCode).send({ message: error.message });
  }

  return reply.code(500).send({ message: 'Evidence API request failed.' });
};

const buildDownloadFilename = (asset) =>
  normalizeText(asset?.sanitizedName) ?? normalizeText(asset?.originalName) ?? `${asset?.assetId ?? 'evidence'}`;

export const registerEvidenceRoutes = async (app) => {
  app.get('/api/evaluations/:id/evidence', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    const reviewId = toNumericId(request.params.id);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return reply.code(400).send({ message: 'A valid review id is required.' });
    }

    try {
      const evidence = await app.evidenceService.listEvidence({
        evaluationId: reviewId,
        actorUserId: user.id,
      });

      return {
        evidence: {
          assets: evidence.assets.map((asset) => serializeAsset(asset, reviewId)),
          links: evidence.links.map((link) => serializeLink(link)),
          summary: evidence.summary,
        },
      };
    } catch (error) {
      return sendEvidenceError(reply, error);
    }
  });

  app.post('/api/evaluations/:id/evidence/uploads', async (request, reply) => {
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
      const upload = await app.evidenceService.initializeUpload({
        evaluationId: reviewId,
        actorUserId: user.id,
        upload: request.body ?? {},
      });

      return reply.code(201).send({ upload });
    } catch (error) {
      return sendEvidenceError(reply, error);
    }
  });

  app.post('/api/evaluations/:id/evidence/assets', async (request, reply) => {
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
      const asset = await app.evidenceService.finalizeUpload({
        evaluationId: reviewId,
        actorUserId: user.id,
        uploadToken: request.body?.uploadToken,
        contentBase64: request.body?.contentBase64,
        dataUrl: request.body?.dataUrl,
      });

      await app.auditLogService.record({
        evaluationId: reviewId,
        actorUserId: user.id,
        eventType: AUDIT_EVENT_TYPES.EVIDENCE_ASSET_UPLOADED,
        summary: `${user.displayName ?? user.email} uploaded evidence asset ${asset.assetId}.`,
        relatedAssetId: asset.assetId,
        metadataJson: {
          assetKind: asset.assetKind,
          sourceType: asset.sourceType,
          originalName: asset.originalName,
        },
      });

      return reply.code(201).send({ asset: serializeAsset(asset, reviewId) });
    } catch (error) {
      return sendEvidenceError(reply, error);
    }
  });

  app.post('/api/evaluations/:id/evidence/links', async (request, reply) => {
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
      const link = await app.evidenceService.createLink({
        evaluationId: reviewId,
        actorUserId: user.id,
        assetId: request.body?.assetId,
        scopeType: request.body?.scopeType,
        criterionCode: request.body?.criterionCode,
        evidenceType: request.body?.evidenceType,
        note: request.body?.note,
      });

      await app.auditLogService.record({
        evaluationId: reviewId,
        actorUserId: user.id,
        eventType: AUDIT_EVENT_TYPES.EVIDENCE_LINK_CREATED,
        summary: `${user.displayName ?? user.email} linked evidence ${link.assetId} to ${link.scopeType}.`,
        scopeType: link.scopeType,
        sectionId: link.sectionId,
        criterionCode: link.criterionCode,
        relatedAssetId: link.assetId,
        relatedLinkId: link.linkId,
      });

      return reply.code(201).send({ link: serializeLink(link) });
    } catch (error) {
      return sendEvidenceError(reply, error);
    }
  });

  app.patch('/api/evaluations/:id/evidence/links/:linkId', async (request, reply) => {
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
      const link = await app.evidenceService.updateLink({
        evaluationId: reviewId,
        actorUserId: user.id,
        linkId: request.params.linkId,
        scopeType: request.body?.scopeType,
        criterionCode: request.body?.criterionCode,
        evidenceType: request.body?.evidenceType,
        note: request.body?.note,
      });

      await app.auditLogService.record({
        evaluationId: reviewId,
        actorUserId: user.id,
        eventType: AUDIT_EVENT_TYPES.EVIDENCE_LINK_UPDATED,
        summary: `${user.displayName ?? user.email} updated evidence link ${link.linkId}.`,
        scopeType: link.scopeType,
        sectionId: link.sectionId,
        criterionCode: link.criterionCode,
        relatedAssetId: link.assetId,
        relatedLinkId: link.linkId,
      });

      return { link: serializeLink(link) };
    } catch (error) {
      return sendEvidenceError(reply, error);
    }
  });

  app.get('/api/evaluations/:id/evidence/review-inbox', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    const reviewId = toNumericId(request.params.id);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return reply.code(400).send({ message: 'A valid review id is required.' });
    }

    try {
      const [evidence, captureTargets, captureEvents] = await Promise.all([
        app.evidenceService.listEvidence({
          evaluationId: reviewId,
          actorUserId: user.id,
        }),
        app.captureService.listCaptureTargets({
          evaluationId: reviewId,
          user,
        }),
        app.captureEventsRepository.listByEvaluationId(reviewId),
      ]);
      const assetById = new Map(
        evidence.assets.map((asset) => [asset.assetId, serializeAsset(asset, reviewId)]),
      );
      const captureByLinkId = new Map();

      captureEvents.forEach((capture) => {
        if (!capture.linkId) {
          return;
        }

        captureByLinkId.set(capture.linkId, capture);
      });

      const items = evidence.links
        .filter((link) => link.scopeType === 'review_inbox')
        .map((link) => ({
          link: serializeLink(link),
          asset: assetById.get(link.assetId) ?? null,
          capture: serializeCaptureSummary(captureByLinkId.get(link.linkId) ?? null),
        }));

      return {
        inbox: {
          items,
          availableTargets: captureTargets.targets
            .filter((target) => target.scopeType !== 'review_inbox')
            .map((target) => serializeCaptureTarget(target)),
          summary: {
            itemCount: items.length,
          },
        },
      };
    } catch (error) {
      return sendEvidenceError(reply, error);
    }
  });

  app.delete('/api/evaluations/:id/evidence/links/:linkId', async (request, reply) => {
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
      await app.evidenceService.deleteLink({
        evaluationId: reviewId,
        actorUserId: user.id,
        linkId: request.params.linkId,
      });

      await app.auditLogService.record({
        evaluationId: reviewId,
        actorUserId: user.id,
        eventType: AUDIT_EVENT_TYPES.EVIDENCE_LINK_DELETED,
        summary: `${user.displayName ?? user.email} deleted evidence link ${request.params.linkId}.`,
        relatedLinkId: request.params.linkId,
      });

      return reply.code(204).send();
    } catch (error) {
      return sendEvidenceError(reply, error);
    }
  });

  app.delete('/api/evaluations/:id/evidence/assets/:assetId', async (request, reply) => {
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
      await app.evidenceService.deleteAsset({
        evaluationId: reviewId,
        actorUserId: user.id,
        assetId: request.params.assetId,
      });

      await app.auditLogService.record({
        evaluationId: reviewId,
        actorUserId: user.id,
        eventType: AUDIT_EVENT_TYPES.EVIDENCE_ASSET_DELETED,
        summary: `${user.displayName ?? user.email} deleted evidence asset ${request.params.assetId}.`,
        relatedAssetId: request.params.assetId,
      });

      return reply.code(204).send();
    } catch (error) {
      return sendEvidenceError(reply, error);
    }
  });

  app.get('/api/evaluations/:id/evidence/manifest', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    const reviewId = toNumericId(request.params.id);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return reply.code(400).send({ message: 'A valid review id is required.' });
    }

    try {
      return await app.evidenceService.getManifest({
        evaluationId: reviewId,
        actorUserId: user.id,
      });
    } catch (error) {
      return sendEvidenceError(reply, error);
    }
  });

  app.get('/api/evaluations/:id/evidence/assets/:assetId/download', async (request, reply) => {
    const user = await requireAuthenticatedUser(app, request, reply);

    if (!user) {
      return reply;
    }

    const reviewId = toNumericId(request.params.id);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return reply.code(400).send({ message: 'A valid review id is required.' });
    }

    try {
      const { asset, body } = await app.evidenceService.downloadAsset({
        evaluationId: reviewId,
        actorUserId: user.id,
        assetId: request.params.assetId,
        linkId: request.query?.linkId,
      });

      reply.header('cache-control', 'private, no-store');
      reply.header('content-type', asset.mimeType ?? 'application/octet-stream');
      reply.header('content-length', String(body.byteLength));
      reply.header(
        'content-disposition',
        `attachment; filename="${buildDownloadFilename(asset).replace(/"/g, '')}"`,
      );

      return reply.send(body);
    } catch (error) {
      return sendEvidenceError(reply, error);
    }
  });
};
