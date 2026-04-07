import crypto from 'node:crypto';

import { createEvidenceManifest } from '../../static/js/adapters/evidence-storage.js';
import { CRITERIA_BY_CODE } from '../../static/js/config/questionnaire-schema.js';
import { assetKindRequiresStoredBytes } from '../storage/upload-policy.js';

const createServiceError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const isEvidenceServiceError = (error) => Number.isInteger(error?.statusCode);

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

const generateIdentifier = (prefix) => `${prefix}-${crypto.randomUUID()}`;

const isImageMimeType = (mimeType) => normalizeText(mimeType)?.toLowerCase().startsWith('image/');

const hashBuffer = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const decodeInlineBytes = ({ contentBase64, dataUrl } = {}) => {
  const normalizedBase64 = normalizeText(contentBase64)?.replace(/\s+/g, '') ?? null;

  if (normalizedBase64) {
    return Buffer.from(normalizedBase64, 'base64');
  }

  const normalizedDataUrl = normalizeText(dataUrl);

  if (!normalizedDataUrl) {
    return null;
  }

  const match = normalizedDataUrl.match(/^data:([^;,]+)?;base64,(.+)$/i);

  if (!match) {
    throw createServiceError(400, 'dataUrl must be a base64-encoded data URL.');
  }

  return Buffer.from(match[2], 'base64');
};

const buildStorageKey = ({ evaluationId, assetId, sanitizedName }) =>
  `evaluations/${evaluationId}/assets/${assetId}--${sanitizedName ?? 'evidence'}`;

const buildScopeInput = ({ scopeType, criterionCode } = {}) => {
  const normalizedScopeType = normalizeText(scopeType)?.toLowerCase() ?? 'evaluation';

  if (normalizedScopeType === 'evaluation') {
    return Object.freeze({
      scopeType: 'evaluation',
      sectionId: null,
      criterionCode: null,
    });
  }

  if (normalizedScopeType === 'review_inbox') {
    return Object.freeze({
      scopeType: 'review_inbox',
      sectionId: null,
      criterionCode: null,
    });
  }

  if (normalizedScopeType !== 'criterion') {
    throw createServiceError(400, `Unsupported scopeType: ${scopeType ?? '<missing>'}.`);
  }

  const normalizedCriterionCode = requireNonEmptyText(criterionCode, 'criterionCode');
  const criterion = CRITERIA_BY_CODE[normalizedCriterionCode] ?? null;

  if (!criterion) {
    throw createServiceError(400, `Unknown criterionCode: ${criterionCode}.`);
  }

  return Object.freeze({
    scopeType: 'criterion',
    sectionId: criterion.sectionId,
    criterionCode: criterion.code,
  });
};

const projectCompatibilityItem = (link, asset) => ({
  id: link.linkId,
  assetId: asset.assetId,
  scope: link.scopeType,
  sectionId: link.scopeType === 'criterion' ? link.sectionId : null,
  criterionCode: link.criterionCode,
  evidenceType: link.evidenceType,
  note: link.note,
  name: asset.originalName ?? asset.sanitizedName ?? asset.assetId,
  mimeType: asset.mimeType,
  size: asset.sizeBytes,
  isImage: asset.assetKind === 'image' || isImageMimeType(asset.mimeType),
  addedAt: asset.capturedAtClient ?? link.linkedAt ?? asset.createdAt ?? asset.receivedAtServer,
});

const assertVisibleEvaluation = async ({ evaluationRepository, evaluationId, actorUserId }) => {
  const evaluation = await evaluationRepository.getVisibleById(Number(evaluationId), Number(actorUserId));

  if (!evaluation) {
    throw createServiceError(404, 'Review not found.');
  }

  return evaluation;
};

const loadActiveEvidence = async ({ evidenceAssetRepository, evidenceLinkRepository, evaluationId }) => {
  const links = await evidenceLinkRepository.listByEvaluationId(Number(evaluationId));
  const assetIds = [...new Set(links.map((link) => link.assetId).filter(Boolean))];
  const assets = await evidenceAssetRepository.getByIds(assetIds);
  const assetMap = new Map(assets.filter((asset) => !asset.deletedAt).map((asset) => [asset.assetId, asset]));

  return Object.freeze({
    links: links.filter((link) => assetMap.has(link.assetId) && !link.deletedAt),
    assets: assets.filter((asset) => !asset.deletedAt && links.some((link) => link.assetId === asset.assetId && !link.deletedAt)),
    assetMap,
  });
};

export const createEvidenceService = ({
  evaluationRepository,
  evidenceAssetRepository,
  evidenceLinkRepository,
  objectStore,
  uploadPolicy,
} = {}) =>
  Object.freeze({
    async initializeUpload({ evaluationId, actorUserId, upload } = {}) {
      await assertVisibleEvaluation({ evaluationRepository, evaluationId, actorUserId });
      return uploadPolicy.initializeUpload({ evaluationId, actorUserId, upload });
    },

    async finalizeUpload({ evaluationId, actorUserId, uploadToken, contentBase64, dataUrl } = {}) {
      await assertVisibleEvaluation({ evaluationRepository, evaluationId, actorUserId });

      let uploadEnvelope;

      try {
        uploadEnvelope = uploadPolicy.consumeUploadToken({
          uploadToken,
          evaluationId,
          actorUserId,
        });
      } catch (error) {
        throw createServiceError(400, error.message);
      }

      const buffer = decodeInlineBytes({ contentBase64, dataUrl });

      if (assetKindRequiresStoredBytes(uploadEnvelope.assetKind)) {
        if (!buffer || buffer.byteLength === 0) {
          throw createServiceError(400, 'Uploaded evidence bytes are required to finalize this asset.');
        }

        if (
          Number.isInteger(uploadEnvelope.sizeBytes) &&
          uploadEnvelope.sizeBytes !== buffer.byteLength
        ) {
          throw createServiceError(400, 'The uploaded evidence bytes do not match the initialized size.');
        }
      }

      const computedHash = buffer ? hashBuffer(buffer) : uploadEnvelope.contentHash;

      if (buffer && uploadEnvelope.contentHash && uploadEnvelope.contentHash !== computedHash) {
        throw createServiceError(400, 'The uploaded evidence hash does not match the initialized upload.');
      }

      const assetId = generateIdentifier('asset');
      const storageKey = buffer
        ? buildStorageKey({
            evaluationId: Number(evaluationId),
            assetId,
            sanitizedName: uploadEnvelope.sanitizedName,
          })
        : null;

      if (buffer && storageKey) {
        await objectStore.writeObject({
          key: storageKey,
          body: buffer,
        });
      }

      try {
        return await evidenceAssetRepository.create({
          assetId,
          assetKind: uploadEnvelope.assetKind,
          sourceType: uploadEnvelope.sourceType,
          storageProvider: buffer ? objectStore.driver : null,
          storageKey,
          contentHash: computedHash,
          createdByUserId: Number(actorUserId),
          originalName: uploadEnvelope.originalName ?? uploadEnvelope.sanitizedName,
          sanitizedName: uploadEnvelope.sanitizedName,
          mimeType: uploadEnvelope.mimeType,
          sizeBytes: uploadEnvelope.sizeBytes ?? (buffer ? buffer.byteLength : null),
          imageWidth: null,
          imageHeight: null,
          previewStorageKey: null,
          capturedAtClient: uploadEnvelope.capturedAtClient,
          receivedAtServer: new Date().toISOString(),
          originUrl: uploadEnvelope.originUrl,
          originTitle: uploadEnvelope.originTitle,
          captureToolVersion: uploadEnvelope.captureToolVersion,
          browserName: uploadEnvelope.browserName,
          browserVersion: uploadEnvelope.browserVersion,
          pageLanguage: uploadEnvelope.pageLanguage,
          redactionStatus: null,
          importSource: null,
        });
      } catch (error) {
        if (storageKey) {
          await objectStore.deleteObject(storageKey).catch(() => {});
        }

        throw error;
      }
    },

    async listEvidence({ evaluationId, actorUserId } = {}) {
      await assertVisibleEvaluation({ evaluationRepository, evaluationId, actorUserId });
      const { links, assets } = await loadActiveEvidence({
        evidenceAssetRepository,
        evidenceLinkRepository,
        evaluationId,
      });

      return Object.freeze({
        assets,
        links,
        summary: Object.freeze({
          assetCount: assets.length,
          linkCount: links.length,
          evaluationLinkCount: links.filter((link) => link.scopeType === 'evaluation').length,
          criterionLinkCount: links.filter((link) => link.scopeType === 'criterion').length,
          reviewInboxLinkCount: links.filter((link) => link.scopeType === 'review_inbox').length,
        }),
      });
    },

    async createLink({ evaluationId, actorUserId, assetId, scopeType, criterionCode, evidenceType, note } = {}) {
      await assertVisibleEvaluation({ evaluationRepository, evaluationId, actorUserId });
      const asset = await evidenceAssetRepository.getById(String(assetId));

      if (!asset || asset.deletedAt) {
        throw createServiceError(404, 'Evidence asset not found.');
      }

      const scope = buildScopeInput({ scopeType, criterionCode });
      const normalizedEvidenceType = requireNonEmptyText(evidenceType, 'evidenceType');
      const normalizedNote = requireNonEmptyText(note, 'note');
      const duplicateLink = await evidenceLinkRepository.findActiveByScope({
        evaluationId: Number(evaluationId),
        assetId: asset.assetId,
        scopeType: scope.scopeType,
        criterionCode: scope.criterionCode,
      });

      if (duplicateLink) {
        throw createServiceError(409, 'An active evidence link for this asset and scope already exists.');
      }

      return evidenceLinkRepository.create({
        linkId: generateIdentifier('link'),
        evaluationId: Number(evaluationId),
        assetId: asset.assetId,
        scopeType: scope.scopeType,
        sectionId: scope.sectionId,
        criterionCode: scope.criterionCode,
        evidenceType: normalizedEvidenceType,
        note: normalizedNote,
        linkedByUserId: Number(actorUserId),
        linkedAt: new Date().toISOString(),
        replacedFromLinkId: null,
        deletedAt: null,
      });
    },

    async updateLink({
      evaluationId,
      actorUserId,
      linkId,
      scopeType,
      criterionCode,
      evidenceType,
      note,
    } = {}) {
      await assertVisibleEvaluation({ evaluationRepository, evaluationId, actorUserId });
      const existing = await evidenceLinkRepository.getByIdForEvaluation({
        evaluationId: Number(evaluationId),
        linkId,
      });

      if (!existing || existing.deletedAt) {
        throw createServiceError(404, 'Evidence link not found.');
      }

      const nextEvidenceType =
        evidenceType === undefined
          ? existing.evidenceType
          : requireNonEmptyText(evidenceType, 'evidenceType');
      const nextNote = note === undefined ? existing.note : requireNonEmptyText(note, 'note');
      const nextScope = buildScopeInput({
        scopeType: scopeType === undefined ? existing.scopeType : scopeType,
        criterionCode: criterionCode === undefined ? existing.criterionCode : criterionCode,
      });
      const duplicateLink = await evidenceLinkRepository.findActiveByScope({
        evaluationId: Number(evaluationId),
        assetId: existing.assetId,
        scopeType: nextScope.scopeType,
        criterionCode: nextScope.criterionCode,
      });

      if (duplicateLink && duplicateLink.linkId !== existing.linkId) {
        throw createServiceError(409, 'An active evidence link for this asset and scope already exists.');
      }

      const updated = await evidenceLinkRepository.updateMetadata({
        evaluationId: Number(evaluationId),
        linkId: existing.linkId,
        scopeType: nextScope.scopeType,
        sectionId: nextScope.sectionId,
        criterionCode: nextScope.criterionCode,
        evidenceType: nextEvidenceType,
        note: nextNote,
      });

      if (!updated) {
        throw createServiceError(404, 'Evidence link not found.');
      }

      return updated;
    },

    async deleteLink({ evaluationId, actorUserId, linkId } = {}) {
      await assertVisibleEvaluation({ evaluationRepository, evaluationId, actorUserId });
      const deleted = await evidenceLinkRepository.softDelete({
        evaluationId: Number(evaluationId),
        linkId,
        deletedAt: new Date().toISOString(),
      });

      if (!deleted) {
        throw createServiceError(404, 'Evidence link not found.');
      }
    },

    async deleteAsset({ evaluationId, actorUserId, assetId } = {}) {
      await assertVisibleEvaluation({ evaluationRepository, evaluationId, actorUserId });
      const asset = await evidenceAssetRepository.getById(String(assetId));

      if (!asset || asset.deletedAt) {
        throw createServiceError(404, 'Evidence asset not found.');
      }

      const activeLinks = await evidenceLinkRepository.listByAssetId(asset.assetId);

      if (activeLinks.length === 0 || !activeLinks.some((link) => link.evaluationId === Number(evaluationId))) {
        throw createServiceError(404, 'Evidence asset not found for this review.');
      }

      if (activeLinks.some((link) => link.evaluationId !== Number(evaluationId))) {
        throw createServiceError(
          409,
          'This asset is linked to another review and cannot yet be removed through a review-scoped delete.',
        );
      }

      const deletedAt = new Date().toISOString();
      await evidenceLinkRepository.softDeleteByAssetId(asset.assetId, { deletedAt });
      await evidenceAssetRepository.softDelete(asset.assetId, { deletedAt });

      if (asset.storageKey) {
        await objectStore.deleteObject(asset.storageKey).catch(() => {});
      }
    },

    async getManifest({ evaluationId, actorUserId } = {}) {
      await assertVisibleEvaluation({ evaluationRepository, evaluationId, actorUserId });
      const { links, assetMap } = await loadActiveEvidence({
        evidenceAssetRepository,
        evidenceLinkRepository,
        evaluationId,
      });

      const compatibilityEvaluation = {
        evidence: {
          evaluation: [],
          criteria: {},
        },
      };

      links
        .filter((link) => link.scopeType !== 'review_inbox')
        .forEach((link) => {
          const asset = assetMap.get(link.assetId);

          if (!asset) {
            return;
          }

          const compatibilityItem = projectCompatibilityItem(link, asset);

          if (link.scopeType === 'criterion') {
            if (!compatibilityEvaluation.evidence.criteria[link.criterionCode]) {
              compatibilityEvaluation.evidence.criteria[link.criterionCode] = [];
            }

            compatibilityEvaluation.evidence.criteria[link.criterionCode].push(compatibilityItem);
            return;
          }

          compatibilityEvaluation.evidence.evaluation.push(compatibilityItem);
        });

      return createEvidenceManifest(compatibilityEvaluation, {
        generatedAt: new Date().toISOString(),
      });
    },

    async downloadAsset({ evaluationId, actorUserId, assetId, linkId = null } = {}) {
      await assertVisibleEvaluation({ evaluationRepository, evaluationId, actorUserId });
      const asset = await evidenceAssetRepository.getById(String(assetId));

      if (!asset || asset.deletedAt) {
        throw createServiceError(404, 'Evidence asset not found.');
      }

      const activeLinks = (await evidenceLinkRepository.listByAssetId(asset.assetId)).filter(
        (link) => link.evaluationId === Number(evaluationId),
      );

      if (activeLinks.length === 0) {
        throw createServiceError(404, 'Evidence asset not found for this review.');
      }

      if (linkId && !activeLinks.some((link) => link.linkId === linkId)) {
        throw createServiceError(404, 'Evidence link not found for this review.');
      }

      if (!asset.storageKey) {
        throw createServiceError(409, 'This evidence asset does not have a stored binary payload.');
      }

      let storedObject;

      try {
        storedObject = await objectStore.readObject(asset.storageKey);
      } catch (error) {
        if (error?.code === 'ENOENT') {
          throw createServiceError(404, 'Stored evidence bytes were not found.');
        }

        throw error;
      }

      await evidenceAssetRepository.appendDownloadEvent({
        evaluationId: Number(evaluationId),
        assetId: asset.assetId,
        linkId: normalizeText(linkId),
        actorUserId: Number(actorUserId),
        eventType: 'download_authorized',
      });

      return Object.freeze({
        asset,
        body: storedObject.body,
      });
    },
  });
