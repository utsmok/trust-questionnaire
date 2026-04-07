import crypto from 'node:crypto';

import { CRITERIA, CRITERIA_BY_CODE } from '../../static/js/config/questionnaire-schema.js';
import { SKIP_STATES } from '../../static/js/config/rules.js';
import { SECTION_IDS } from '../../static/js/config/sections.js';
import { deriveCriterionState, derivePageStates } from '../../static/js/state/derive/index.js';
import { AUDIT_EVENT_TYPES } from './audit-log.js';

const createServiceError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const isCaptureServiceError = (error) => Number.isInteger(error?.statusCode);

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const requireNonEmptyText = (value, fieldName) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    throw createServiceError(400, `${fieldName} is required.`);
  }

  return normalized;
};

const normalizeScopeType = (value) => normalizeText(value)?.toLowerCase() ?? 'evaluation';

const resolveTargetPermissionFailure = (sectionPermission, fallbackMessage) => {
  if (sectionPermission?.reason) {
    return sectionPermission.reason;
  }

  return fallbackMessage;
};

const getReviewLevelSectionPermission = (authority) =>
  authority.sectionPermissions?.[SECTION_IDS.S2] ?? null;

const buildEvaluationTarget = () => ({
  scopeType: 'evaluation',
  sectionId: SECTION_IDS.S2,
  criterionCode: null,
  label: 'Review-level evidence',
});

const buildReviewInboxTarget = () => ({
  scopeType: 'review_inbox',
  sectionId: null,
  criterionCode: null,
  label: 'Review inbox',
});

const requireEditableEvaluationTarget = ({ authority }) => {
  const sectionPermission = getReviewLevelSectionPermission(authority);

  if (!sectionPermission?.isEditable) {
    throw createServiceError(
      409,
      `Evaluation-level capture is not allowed right now. ${resolveTargetPermissionFailure(
        sectionPermission,
        'Section S2 is currently not editable.',
      )}`,
    );
  }

  return buildEvaluationTarget();
};

const requireEditableReviewInboxTarget = ({ authority }) => {
  const sectionPermission = getReviewLevelSectionPermission(authority);

  if (!sectionPermission?.isEditable) {
    throw createServiceError(
      409,
      `Review-inbox capture is not allowed right now. ${resolveTargetPermissionFailure(
        sectionPermission,
        'Section S2 is currently not editable.',
      )}`,
    );
  }

  return buildReviewInboxTarget();
};

const requireEditableCriterionTarget = ({ evaluation, authority, criterionCode }) => {
  const criterion = CRITERIA_BY_CODE[criterionCode] ?? null;

  if (!criterion) {
    throw createServiceError(400, `Unknown criterionCode: ${criterionCode ?? '<missing>'}.`);
  }

  const sectionPermission = authority.sectionPermissions?.[criterion.sectionId] ?? null;

  if (!sectionPermission?.isEditable) {
    throw createServiceError(
      409,
      `${criterion.code} is not available for direct capture right now. ${resolveTargetPermissionFailure(
        sectionPermission,
        `Section ${criterion.sectionId} is currently not editable.`,
      )}`,
    );
  }

  const pageStates = derivePageStates(evaluation.currentStateJson, {
    workflowAuthority: authority,
  });
  const criterionState = deriveCriterionState(criterion.code, evaluation.currentStateJson, {
    pageStates,
  });

  if (
    criterionState.skipState === SKIP_STATES.USER_SKIPPED ||
    criterionState.skipState === SKIP_STATES.INHERITED_SECTION_SKIP ||
    criterionState.skipState === SKIP_STATES.SYSTEM_SKIPPED
  ) {
    throw createServiceError(
      409,
      `${criterion.code} cannot accept direct capture because the criterion is currently skipped.`,
    );
  }

  return {
    scopeType: 'criterion',
    sectionId: criterion.sectionId,
    criterionCode: criterion.code,
    label: `${criterion.code} · ${criterion.label}`,
  };
};

const resolveCriterionTarget = ({ evaluation, authority, criterionCode, pageStates = null } = {}) => {
  const criterion = CRITERIA_BY_CODE[criterionCode] ?? null;

  if (!criterion) {
    return null;
  }

  const sectionPermission = authority.sectionPermissions?.[criterion.sectionId] ?? null;

  if (!sectionPermission?.isEditable) {
    return null;
  }

  const derivedPageStates =
    pageStates ??
    derivePageStates(evaluation.currentStateJson, {
      workflowAuthority: authority,
    });
  const criterionState = deriveCriterionState(criterion.code, evaluation.currentStateJson, {
    pageStates: derivedPageStates,
  });

  if (
    criterionState.skipState === SKIP_STATES.USER_SKIPPED ||
    criterionState.skipState === SKIP_STATES.INHERITED_SECTION_SKIP ||
    criterionState.skipState === SKIP_STATES.SYSTEM_SKIPPED
  ) {
    return null;
  }

  return {
    scopeType: 'criterion',
    sectionId: criterion.sectionId,
    criterionCode: criterion.code,
    label: `${criterion.code} · ${criterion.label}`,
  };
};

const buildAvailableCaptureTargets = ({ review, authority } = {}) => {
  const targets = [];
  const reviewLevelPermission = getReviewLevelSectionPermission(authority);

  if (reviewLevelPermission?.isEditable) {
    targets.push(buildEvaluationTarget());
    targets.push(buildReviewInboxTarget());
  }

  const pageStates = derivePageStates(review.currentStateJson, {
    workflowAuthority: authority,
  });

  CRITERIA.forEach((criterion) => {
    const target = resolveCriterionTarget({
      evaluation: review,
      authority,
      criterionCode: criterion.code,
      pageStates,
    });

    if (target) {
      targets.push(target);
    }
  });

  return targets;
};

const loadVisibleReview = async ({ evaluationRepository, evaluationId, user }) => {
  const review = await evaluationRepository.getVisibleById(Number(evaluationId), Number(user.id), {
    userRole: user.role,
  });

  if (!review) {
    throw createServiceError(404, 'Review not found.');
  }

  return review;
};

const validateCaptureTarget = async ({
  evaluationRepository,
  authorizationService,
  evaluationId,
  user,
  scopeType,
  criterionCode,
}) => {
  const review = await loadVisibleReview({ evaluationRepository, evaluationId, user });
  const authority = authorizationService.buildWorkflowAuthority({ review, user });
  const normalizedScopeType = normalizeScopeType(scopeType);

  if (normalizedScopeType === 'evaluation') {
    return {
      review,
      authority,
      target: requireEditableEvaluationTarget({ authority }),
    };
  }

  if (normalizedScopeType === 'review_inbox') {
    return {
      review,
      authority,
      target: requireEditableReviewInboxTarget({ authority }),
    };
  }

  if (normalizedScopeType === 'criterion') {
    return {
      review,
      authority,
      target: requireEditableCriterionTarget({
        evaluation: review,
        authority,
        criterionCode: requireNonEmptyText(criterionCode, 'criterionCode'),
      }),
    };
  }

  throw createServiceError(400, 'scopeType must be evaluation, criterion, or review_inbox.');
};

const requireCaptureForSession = async ({ captureEventsRepository, captureId, extensionSessionId }) => {
  const capture = await captureEventsRepository.getById(captureId);

  if (!capture || capture.extensionSessionId !== extensionSessionId || capture.revokedAt) {
    throw createServiceError(404, 'Capture session not found.');
  }

  return capture;
};

export const createCaptureService = ({
  evaluationRepository,
  authorizationService,
  evidenceService,
  captureEventsRepository,
  auditLogService,
} = {}) =>
  Object.freeze({
    async initializeCapture({ extensionSession, user, capture } = {}) {
      if (!extensionSession?.sessionId || !user?.id) {
        throw createServiceError(401, 'A paired extension session is required.');
      }

      const evaluationId = Number(capture?.evaluationId);

      if (!Number.isInteger(evaluationId) || evaluationId <= 0) {
        throw createServiceError(400, 'A valid review id is required.');
      }

      const { review, target } = await validateCaptureTarget({
        evaluationRepository,
        authorizationService,
        evaluationId,
        user,
        scopeType: capture?.scopeType,
        criterionCode: capture?.criterionCode,
      });
      const evidenceType = requireNonEmptyText(capture?.evidenceType, 'evidenceType');
      const note = requireNonEmptyText(capture?.note, 'note');
      const upload = await evidenceService.initializeUpload({
        evaluationId: review.id,
        actorUserId: user.id,
        upload: {
          assetKind: capture?.assetKind,
          originalName: capture?.originalName,
          mimeType: capture?.mimeType,
          sizeBytes: capture?.sizeBytes,
          contentHash: capture?.contentHash,
          capturedAtClient: capture?.capturedAtClient,
          originUrl: capture?.originUrl,
          originTitle: capture?.originTitle,
          sourceType: 'extension_capture',
          captureToolVersion: capture?.extensionVersion,
          browserName: capture?.browserName,
          browserVersion: capture?.browserVersion,
          pageLanguage: capture?.pageLanguage,
        },
      });
      const createdAt = new Date().toISOString();
      const captureId = `capture-${crypto.randomUUID()}`;
      const persisted = await captureEventsRepository.create({
        captureId,
        extensionSessionId: extensionSession.sessionId,
        userId: Number(user.id),
        evaluationId: review.id,
        scopeType: target.scopeType,
        sectionId: target.sectionId,
        criterionCode: target.criterionCode,
        evidenceType,
        note,
        assetKind: upload.assetKind,
        sourceType: 'extension_capture',
        originalName: upload.originalName,
        mimeType: upload.mimeType,
        sizeBytes: upload.sizeBytes,
        contentHash: upload.contentHash,
        capturedAtClient: upload.capturedAtClient,
        originUrl: upload.originUrl,
        originTitle: upload.originTitle,
        selectionText: capture?.selectionText,
        browserName: normalizeText(capture?.browserName),
        browserVersion: normalizeText(capture?.browserVersion),
        extensionVersion: normalizeText(capture?.extensionVersion),
        pageLanguage: normalizeText(capture?.pageLanguage),
        uploadToken: upload.uploadToken,
        uploadExpiresAt: upload.expiresAt,
        status: 'initialized',
        assetId: null,
        linkId: null,
        createdAt,
        uploadedAt: null,
        finalizedAt: null,
        revokedAt: null,
      });

      await auditLogService?.record({
        evaluationId: review.id,
        actorUserId: user.id,
        eventType: AUDIT_EVENT_TYPES.CAPTURE_INITIALIZED,
        summary: `${user.displayName ?? user.email} initialized extension capture ${persisted.captureId}.`,
        scopeType: persisted.scopeType,
        sectionId: persisted.sectionId,
        criterionCode: persisted.criterionCode,
        metadataJson: {
          extensionSessionId: extensionSession.sessionId,
          assetKind: persisted.assetKind,
          evidenceType: persisted.evidenceType,
          originUrl: persisted.originUrl,
        },
      });

      return { capture: persisted, review };
    },

    async listCaptureReviews({ user } = {}) {
      if (!user?.id) {
        throw createServiceError(401, 'An authenticated user is required.');
      }

      const reviews = await evaluationRepository.listVisibleToUser(user.id, {
        userRole: user.role,
      });

      return reviews.map((review) => {
        const authority = authorizationService.buildWorkflowAuthority({ review, user });
        const targets = buildAvailableCaptureTargets({ review, authority });

        return {
          review,
          authority,
          availableTargetCount: targets.length,
          captureEnabled: targets.length > 0,
        };
      });
    },

    async listCaptureTargets({ evaluationId, user } = {}) {
      if (!user?.id) {
        throw createServiceError(401, 'An authenticated user is required.');
      }

      const review = await loadVisibleReview({ evaluationRepository, evaluationId, user });
      const authority = authorizationService.buildWorkflowAuthority({ review, user });

      return {
        review,
        authority,
        targets: buildAvailableCaptureTargets({ review, authority }),
      };
    },

    async uploadCapture({ extensionSession, user, captureId, contentBase64, dataUrl } = {}) {
      if (!extensionSession?.sessionId || !user?.id) {
        throw createServiceError(401, 'A paired extension session is required.');
      }

      const capture = await requireCaptureForSession({
        captureEventsRepository,
        captureId,
        extensionSessionId: extensionSession.sessionId,
      });

      if (capture.status !== 'initialized') {
        throw createServiceError(409, 'Capture upload is no longer pending.');
      }

      const asset = await evidenceService.finalizeUpload({
        evaluationId: capture.evaluationId,
        actorUserId: user.id,
        uploadToken: capture.uploadToken,
        contentBase64,
        dataUrl,
      });
      const uploadedAt = new Date().toISOString();
      const updatedCapture = await captureEventsRepository.update(capture.captureId, {
        status: 'uploaded',
        assetId: asset.assetId,
        uploadedAt,
      });

      await auditLogService?.record({
        evaluationId: capture.evaluationId,
        actorUserId: user.id,
        eventType: AUDIT_EVENT_TYPES.EVIDENCE_ASSET_UPLOADED,
        summary: `${user.displayName ?? user.email} uploaded extension capture asset ${asset.assetId}.`,
        relatedAssetId: asset.assetId,
        metadataJson: {
          captureId: capture.captureId,
          sourceType: 'extension_capture',
          extensionSessionId: extensionSession.sessionId,
          assetKind: asset.assetKind,
          originalName: asset.originalName,
        },
      });

      return {
        capture: updatedCapture,
        asset,
      };
    },

    async finalizeCapture({ extensionSession, user, captureId } = {}) {
      if (!extensionSession?.sessionId || !user?.id) {
        throw createServiceError(401, 'A paired extension session is required.');
      }

      const capture = await requireCaptureForSession({
        captureEventsRepository,
        captureId,
        extensionSessionId: extensionSession.sessionId,
      });

      if (capture.status !== 'uploaded' || !capture.assetId) {
        throw createServiceError(409, 'Capture finalize requires an uploaded asset.');
      }

      await validateCaptureTarget({
        evaluationRepository,
        authorizationService,
        evaluationId: capture.evaluationId,
        user,
        scopeType: capture.scopeType,
        criterionCode: capture.criterionCode,
      });

      const link = await evidenceService.createLink({
        evaluationId: capture.evaluationId,
        actorUserId: user.id,
        assetId: capture.assetId,
        scopeType: capture.scopeType,
        criterionCode: capture.criterionCode,
        evidenceType: capture.evidenceType,
        note: capture.note,
      });
      const finalizedAt = new Date().toISOString();
      const updatedCapture = await captureEventsRepository.update(capture.captureId, {
        status: 'finalized',
        linkId: link.linkId,
        finalizedAt,
      });

      await auditLogService?.record({
        evaluationId: capture.evaluationId,
        actorUserId: user.id,
        eventType: AUDIT_EVENT_TYPES.EVIDENCE_LINK_CREATED,
        summary: `${user.displayName ?? user.email} finalized extension capture ${capture.captureId} into evidence link ${link.linkId}.`,
        scopeType: link.scopeType,
        sectionId: link.sectionId,
        criterionCode: link.criterionCode,
        relatedAssetId: link.assetId,
        relatedLinkId: link.linkId,
        metadataJson: {
          captureId: capture.captureId,
          extensionSessionId: extensionSession.sessionId,
          sourceType: 'extension_capture',
        },
      });

      return {
        capture: updatedCapture,
        link,
      };
    },
  });
