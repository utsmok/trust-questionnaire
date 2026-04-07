import { isCaptureServiceError } from '../services/capture-service.js';
import { isExtensionSessionError } from '../services/extension-session.js';

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const extractBearerToken = (request) => {
  const authorization = normalizeText(request.headers.authorization);

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }

  return normalizeText(authorization.slice('Bearer '.length));
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

const serializeCapture = (capture) => ({
  captureId: capture.captureId,
  evaluationId: capture.evaluationId,
  scopeType: capture.scopeType,
  sectionId: capture.sectionId,
  criterionCode: capture.criterionCode,
  evidenceType: capture.evidenceType,
  note: capture.note,
  assetKind: capture.assetKind,
  sourceType: capture.sourceType,
  originalName: capture.originalName,
  mimeType: capture.mimeType,
  sizeBytes: capture.sizeBytes,
  contentHash: capture.contentHash,
  capturedAtClient: capture.capturedAtClient,
  originUrl: capture.originUrl,
  originTitle: capture.originTitle,
  selectionText: capture.selectionText,
  browserName: capture.browserName,
  browserVersion: capture.browserVersion,
  extensionVersion: capture.extensionVersion,
  pageLanguage: capture.pageLanguage,
  uploadExpiresAt: capture.uploadExpiresAt,
  status: capture.status,
  assetId: capture.assetId,
  linkId: capture.linkId,
  createdAt: capture.createdAt,
  uploadedAt: capture.uploadedAt,
  finalizedAt: capture.finalizedAt,
});

const serializeExtensionReviewSummary = (entry) => ({
  id: entry.review.id,
  publicId: entry.review.publicId,
  titleSnapshot: entry.review.titleSnapshot,
  workflowMode: entry.review.workflowMode,
  lifecycleState: entry.review.lifecycleState,
  currentRevisionNumber: entry.review.currentRevisionNumber,
  updatedAt: entry.review.updatedAt,
  captureEnabled: Boolean(entry.captureEnabled),
  availableTargetCount: entry.availableTargetCount ?? 0,
});

const serializeCaptureTarget = (target) => ({
  scopeType: target.scopeType,
  sectionId: target.sectionId,
  criterionCode: target.criterionCode,
  label: target.label,
});

const sendCaptureError = (reply, error) => {
  if (isCaptureServiceError(error) || isExtensionSessionError(error)) {
    return reply.code(error.statusCode).send({ message: error.message });
  }

  return reply.code(500).send({ message: 'Capture API request failed.' });
};

const requireExtensionPrincipal = async (app, request, reply) => {
  const accessToken = extractBearerToken(request);

  if (!accessToken) {
    reply.code(401).send({ message: 'A valid extension access token is required.' });
    return null;
  }

  try {
    const principal = await app.extensionSessionService.authenticateAccessToken(accessToken);
    const user = await app.userRepository.getById(principal.session.userId);

    if (!user || !user.isActive) {
      reply.code(401).send({ message: 'The paired extension session is no longer valid.' });
      return null;
    }

    return {
      accessToken,
      principal,
      user,
    };
  } catch (error) {
    sendCaptureError(reply, error);
    return null;
  }
};

export const registerCaptureRoutes = async (app) => {
  app.get('/api/captures/reviews', async (request, reply) => {
    const extensionPrincipal = await requireExtensionPrincipal(app, request, reply);

    if (!extensionPrincipal) {
      return reply;
    }

    try {
      const reviews = await app.captureService.listCaptureReviews({
        user: extensionPrincipal.user,
      });

      await app.extensionSessionService.touchSession(extensionPrincipal.principal.session.sessionId);

      return {
        user: {
          id: extensionPrincipal.user.id,
          email: extensionPrincipal.user.email,
          displayName: extensionPrincipal.user.displayName,
        },
        reviews: reviews.map((entry) => serializeExtensionReviewSummary(entry)),
      };
    } catch (error) {
      return sendCaptureError(reply, error);
    }
  });

  app.get('/api/captures/reviews/:reviewId/targets', async (request, reply) => {
    const extensionPrincipal = await requireExtensionPrincipal(app, request, reply);

    if (!extensionPrincipal) {
      return reply;
    }

    try {
      const result = await app.captureService.listCaptureTargets({
        evaluationId: request.params.reviewId,
        user: extensionPrincipal.user,
      });

      await app.extensionSessionService.touchSession(extensionPrincipal.principal.session.sessionId);

      return {
        review: serializeExtensionReviewSummary({
          review: result.review,
          captureEnabled: result.targets.length > 0,
          availableTargetCount: result.targets.length,
        }),
        targets: result.targets.map((target) => serializeCaptureTarget(target)),
      };
    } catch (error) {
      return sendCaptureError(reply, error);
    }
  });

  app.post('/api/captures/init', async (request, reply) => {
    const extensionPrincipal = await requireExtensionPrincipal(app, request, reply);

    if (!extensionPrincipal) {
      return reply;
    }

    try {
      const result = await app.captureService.initializeCapture({
        extensionSession: extensionPrincipal.principal.session,
        user: extensionPrincipal.user,
        capture: request.body ?? {},
      });

      await app.extensionSessionService.touchSession(extensionPrincipal.principal.session.sessionId);

      return reply.code(201).send({
        capture: serializeCapture(result.capture),
      });
    } catch (error) {
      return sendCaptureError(reply, error);
    }
  });

  app.post('/api/captures/:captureId/upload', async (request, reply) => {
    const extensionPrincipal = await requireExtensionPrincipal(app, request, reply);

    if (!extensionPrincipal) {
      return reply;
    }

    try {
      const result = await app.captureService.uploadCapture({
        extensionSession: extensionPrincipal.principal.session,
        user: extensionPrincipal.user,
        captureId: request.params.captureId,
        contentBase64: request.body?.contentBase64,
        dataUrl: request.body?.dataUrl,
      });

      await app.extensionSessionService.touchSession(extensionPrincipal.principal.session.sessionId);

      return reply.send({
        capture: serializeCapture(result.capture),
        asset: serializeAsset(result.asset, result.capture.evaluationId),
      });
    } catch (error) {
      return sendCaptureError(reply, error);
    }
  });

  app.post('/api/captures/:captureId/finalize', async (request, reply) => {
    const extensionPrincipal = await requireExtensionPrincipal(app, request, reply);

    if (!extensionPrincipal) {
      return reply;
    }

    try {
      const result = await app.captureService.finalizeCapture({
        extensionSession: extensionPrincipal.principal.session,
        user: extensionPrincipal.user,
        captureId: request.params.captureId,
      });
      const asset = await app.evidenceAssetRepository.getById(result.capture.assetId);

      await app.extensionSessionService.touchSession(extensionPrincipal.principal.session.sessionId);

      return reply.code(201).send({
        capture: serializeCapture(result.capture),
        asset: asset ? serializeAsset(asset, result.capture.evaluationId) : null,
        link: serializeLink(result.link),
      });
    } catch (error) {
      return sendCaptureError(reply, error);
    }
  });
};
