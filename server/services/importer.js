import JSZip from 'jszip';

import {
  EVIDENCE_MANIFEST_VERSION,
  serializeEvidenceItem,
} from '../../static/js/adapters/evidence-storage.js';
import { CRITERIA_BY_CODE } from '../../static/js/config/questionnaire-schema.js';
import { SECTION_IDS, SECTION_REGISTRY } from '../../static/js/config/sections.js';
import { SAVE_REASONS, buildCreateEvaluationInput } from './evaluation-state.js';
import { createEtagToken } from './etag.js';

const normalizeText = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

const resolveCommentScope = (scopeType, sectionId, criterionCode) => {
  if (scopeType === 'criterion') {
    const criterion = CRITERIA_BY_CODE[criterionCode] ?? null;

    if (!criterion) {
      throw new Error(`Unknown criterion code for comment import: ${criterionCode}.`);
    }

    return {
      scopeType: 'criterion',
      sectionId: criterion.sectionId,
      criterionCode: criterion.code,
    };
  }

  if (scopeType === 'section') {
    const matched = SECTION_REGISTRY.find((section) => section.id === sectionId) ?? null;

    if (!matched) {
      throw new Error(`Unknown section id for comment import: ${sectionId}.`);
    }

    return {
      scopeType: 'section',
      sectionId: matched.id,
      criterionCode: null,
    };
  }

  return {
    scopeType: 'review',
    sectionId: null,
    criterionCode: null,
  };
};

const parseJsonPayload = (value, label) => {
  if (typeof value === 'object' && value !== null) {
    return value;
  }

  const text = normalizeText(value);

  if (!text) {
    throw new Error(`${label} is required.`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
};

const parseArchivePayload = async (base64Payload) => {
  const normalized = normalizeText(base64Payload);

  if (!normalized) {
    throw new Error('archiveBase64 is required for ZIP imports.');
  }

  const zip = await JSZip.loadAsync(Buffer.from(normalized, 'base64'));
  return zip;
};

const getZipFileString = async (zip, candidatePaths, label) => {
  for (const path of candidatePaths) {
    const file = zip.file(path);

    if (file) {
      return file.async('string');
    }
  }

  throw new Error(`${label} was not found in the ZIP payload.`);
};

const getZipFileBase64 = async (zip, candidatePaths) => {
  for (const path of candidatePaths) {
    const file = zip.file(path);

    if (file) {
      return file.async('base64');
    }
  }

  return null;
};

const coerceLegacyManifestItems = (manifest) => {
  const evaluationItems = Array.isArray(manifest?.evaluation?.items)
    ? manifest.evaluation.items
    : [];
  const criterionItems = Object.values(manifest?.criteria ?? {}).flatMap((entry) => entry?.items ?? []);
  return [...evaluationItems, ...criterionItems];
};

const resolveLegacyLinkPayload = (item) => {
  const serialized = serializeEvidenceItem(item, {
    scope: item?.scope,
    criterionCode: item?.criterionCode,
    sectionId: item?.sectionId,
  });

  if (!serialized) {
    return null;
  }

  if (serialized.scope === 'criterion') {
    const criterion = CRITERIA_BY_CODE[serialized.criterionCode] ?? null;

    if (!criterion) {
      return null;
    }

    return {
      scopeType: 'criterion',
      sectionId: criterion.sectionId,
      criterionCode: criterion.code,
      evidenceType: serialized.evidenceType ?? 'imported_manifest',
      note: serialized.note ?? 'Imported from legacy evidence manifest.',
      assetKind: serialized.isImage ? 'image' : serialized.dataUrl ? 'document' : 'metadata_only',
      mimeType: serialized.mimeType,
      originalName: serialized.name,
      sizeBytes: serialized.size,
      dataUrl: serialized.dataUrl,
      addedAt: serialized.addedAt,
    };
  }

  return {
    scopeType: 'evaluation',
    sectionId: null,
    criterionCode: null,
    evidenceType: serialized.evidenceType ?? 'imported_manifest',
    note: serialized.note ?? 'Imported from legacy evidence manifest.',
    assetKind: serialized.isImage ? 'image' : serialized.dataUrl ? 'document' : 'metadata_only',
    mimeType: serialized.mimeType,
    originalName: serialized.name,
    sizeBytes: serialized.size,
    dataUrl: serialized.dataUrl,
    addedAt: serialized.addedAt,
  };
};

const decodeDataUrlContent = (dataUrl) => {
  const normalized = normalizeText(dataUrl);

  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^data:([^;,]+)?;base64,(.+)$/i);
  return match ? match[2] : null;
};

export const createImporter = ({
  evaluationRepository,
  revisionsRepository,
  evidenceService,
  commentsRepository,
  workflowTransitionsRepository,
  importRecordsRepository,
  auditLogService,
  exportJobsRepository,
} = {}) =>
  Object.freeze({
    async listImportRecords(evaluationId) {
      return importRecordsRepository.listByEvaluationId(evaluationId);
    },

    async importLegacyEvidenceManifest({ evaluationId, actorUser, payload, sourceFormat = 'json' } = {}) {
      const review = await evaluationRepository.getVisibleById(evaluationId, actorUser.id, {
        userRole: actorUser.role,
      });

      if (!review) {
        throw new Error('Review not found.');
      }

      const manifest =
        sourceFormat === 'zip'
          ? parseJsonPayload(
              await getZipFileString(
                await parseArchivePayload(payload.archiveBase64),
                ['trust-evidence-manifest.json', 'evidence/trust-evidence-manifest.json'],
                'Legacy evidence manifest',
              ),
              'Legacy evidence manifest',
            )
          : parseJsonPayload(payload.manifest ?? payload.manifestJson ?? payload, 'Legacy evidence manifest');

      if (Number(manifest?.schemaVersion) !== EVIDENCE_MANIFEST_VERSION) {
        throw new Error(`Unsupported legacy evidence manifest version: ${manifest?.schemaVersion ?? 'unknown'}.`);
      }

      const importedLinks = [];

      for (const item of coerceLegacyManifestItems(manifest)) {
        const linkPayload = resolveLegacyLinkPayload(item);

        if (!linkPayload) {
          continue;
        }

        const upload = await evidenceService.initializeUpload({
          evaluationId,
          actorUserId: actorUser.id,
          upload: {
            originalName: linkPayload.originalName,
            mimeType: linkPayload.mimeType,
            sizeBytes: linkPayload.sizeBytes,
            assetKind: linkPayload.assetKind,
            sourceType: 'manifest_import',
            originUrl: null,
            originTitle: 'Legacy evidence manifest import',
            capturedAtClient: linkPayload.addedAt,
          },
        });

        const asset = await evidenceService.finalizeUpload({
          evaluationId,
          actorUserId: actorUser.id,
          uploadToken: upload.uploadToken,
          contentBase64: decodeDataUrlContent(linkPayload.dataUrl),
          dataUrl: linkPayload.dataUrl,
        });

        const link = await evidenceService.createLink({
          evaluationId,
          actorUserId: actorUser.id,
          assetId: asset.assetId,
          scopeType: linkPayload.scopeType,
          criterionCode: linkPayload.criterionCode,
          evidenceType: linkPayload.evidenceType,
          note: linkPayload.note,
        });

        importedLinks.push(link);
      }

      const record = await importRecordsRepository.create({
        evaluationId,
        importedEvaluationId: null,
        importClass: 'legacy_evidence_manifest_v1',
        sourceFormat,
        sourceName: sourceFormat === 'zip' ? 'trust-evidence-manifest.zip' : 'trust-evidence-manifest.json',
        importedByUserId: actorUser.id,
        summary: {
          importedLinkCount: importedLinks.length,
          schemaVersion: manifest.schemaVersion,
        },
      });

      await auditLogService.record({
        evaluationId,
        actorUserId: actorUser.id,
        eventType: 'import_completed',
        summary: `Imported ${importedLinks.length} legacy evidence item(s).`,
        relatedImportRecordId: record.importId,
        metadataJson: {
          importClass: 'legacy_evidence_manifest_v1',
          sourceFormat,
          importedLinkCount: importedLinks.length,
        },
      });

      return {
        record,
        importedLinkCount: importedLinks.length,
      };
    },

    async importCanonicalReview({ actorUser, payload, sourceFormat = 'json' } = {}) {
      const zip = sourceFormat === 'zip' ? await parseArchivePayload(payload.archiveBase64) : null;
      const canonical =
        sourceFormat === 'zip'
          ? parseJsonPayload(
              await getZipFileString(zip, ['trust-review-export.json'], 'Canonical review export'),
              'Canonical review export',
            )
          : parseJsonPayload(payload.reviewExport ?? payload.reviewExportJson ?? payload, 'Canonical review export');

      if (canonical?.package?.package_type !== 'trust_review_export') {
        throw new Error('Unsupported canonical review export package type.');
      }

      if (Number(canonical?.package?.package_version) !== 1) {
        throw new Error(`Unsupported canonical review export package version: ${canonical?.package?.package_version ?? 'unknown'}.`);
      }

      const record = canonical?.review?.record ?? null;

      if (!record?.current_state_json || !record?.state_schema_version || !record?.framework_version) {
        throw new Error('Canonical review export is missing the required review.record envelope.');
      }

      const evaluationInput = buildCreateEvaluationInput({
        currentState: record.current_state_json,
        createdByUserId: actorUser.id,
        titleSnapshot: record.title_snapshot ?? canonical?.review?.tool?.tool_name ?? 'Imported review',
      });
      evaluationInput.workflowMode = record.workflow_mode;
      evaluationInput.lifecycleState = record.lifecycle_state;
      evaluationInput.stateSchemaVersion = record.state_schema_version;
      evaluationInput.frameworkVersion = record.framework_version;
      evaluationInput.currentRevisionNumber = Number(record.current_revision_number ?? 1);
      evaluationInput.currentStateJson = record.current_state_json;
      evaluationInput.currentEtag = createEtagToken({
        publicId: evaluationInput.publicId,
        revisionNumber: evaluationInput.currentRevisionNumber,
        workflowMode: evaluationInput.workflowMode,
        lifecycleState: evaluationInput.lifecycleState,
        stateJson: evaluationInput.currentStateJson,
      });

      const createdReview = await evaluationRepository.create(evaluationInput, {
        savedByUserId: actorUser.id,
        saveReason: SAVE_REASONS.IMPORT_APPLY,
      });

      const importedAssetIdMap = new Map();
      for (const asset of canonical?.evidence?.assets ?? []) {
        const attachmentIndexEntry = (canonical?.attachments?.items ?? []).find(
          (entry) => entry.asset_id === asset.asset_id,
        );
        const contentBase64 =
          zip && attachmentIndexEntry?.archive_path
            ? await getZipFileBase64(zip, [attachmentIndexEntry.archive_path])
            : null;
        const storedAssetKind = contentBase64
          ? asset.asset_kind
          : asset.asset_kind === 'url' || asset.asset_kind === 'metadata_only'
            ? asset.asset_kind
            : 'metadata_only';
        const upload = await evidenceService.initializeUpload({
          evaluationId: createdReview.id,
          actorUserId: actorUser.id,
          upload: {
            originalName: asset.original_filename,
            mimeType: asset.mime_type,
            sizeBytes: asset.size_bytes,
            assetKind: storedAssetKind,
            sourceType: 'manifest_import',
            originUrl: asset.origin_url,
            originTitle: asset.origin_title,
            capturedAtClient: asset.captured_at_client,
          },
        });
        const importedAsset = await evidenceService.finalizeUpload({
          evaluationId: createdReview.id,
          actorUserId: actorUser.id,
          uploadToken: upload.uploadToken,
          contentBase64,
        });
        importedAssetIdMap.set(asset.asset_id, importedAsset.assetId);
      }

      for (const link of canonical?.evidence?.links ?? []) {
        const importedAssetId = importedAssetIdMap.get(link.asset_id);

        if (!importedAssetId) {
          continue;
        }

        await evidenceService.createLink({
          evaluationId: createdReview.id,
          actorUserId: actorUser.id,
          assetId: importedAssetId,
          scopeType: link.target_scope,
          criterionCode: link.criterion_code,
          evidenceType: link.evidence_type ?? 'imported_manifest',
          note: link.note ?? 'Imported from canonical review export.',
        });
      }

      const importedComments = [];
      for (const comment of canonical?.collaboration?.comments ?? []) {
        const scope = resolveCommentScope(comment.scope_type, comment.section_id, comment.criterion_code);
        importedComments.push(
          await commentsRepository.create({
            evaluationId: createdReview.id,
            scopeType: scope.scopeType,
            sectionId: scope.sectionId,
            criterionCode: scope.criterionCode,
            body: comment.body ?? '',
            createdByUserId: actorUser.id,
            createdAt: comment.created_at,
          }),
        );
      }

      for (const transition of canonical?.collaboration?.workflow_transitions ?? []) {
        await workflowTransitionsRepository.append({
          evaluationId: createdReview.id,
          transitionId: transition.transition_id,
          fromLifecycleState: transition.from_lifecycle_state,
          toLifecycleState: transition.to_lifecycle_state,
          resultingWorkflowMode: transition.resulting_workflow_mode,
          resultingRevisionNumber: Number(transition.resulting_revision_number ?? createdReview.currentRevisionNumber),
          actorUserId: actorUser.id,
          reason: transition.reason ?? 'Imported from canonical review export.',
        });
      }

      const historicalRevisions = (canonical?.revisions ?? [])
        .filter((revision) => Number(revision.revision_number) < createdReview.currentRevisionNumber)
        .sort((left, right) => Number(left.revision_number) - Number(right.revision_number));

      for (const revision of historicalRevisions) {
        await revisionsRepository.append({
          evaluationId: createdReview.id,
          revisionNumber: Number(revision.revision_number),
          workflowMode: revision.workflow_mode,
          lifecycleState: revision.lifecycle_state,
          stateSchemaVersion: revision.state_schema_version,
          frameworkVersion: revision.framework_version,
          stateJson: revision.state_json,
          savedByUserId: actorUser.id,
          saveReason: revision.save_reason ?? 'imported_revision',
          createdAt: revision.created_at,
        });
      }

      const recordEntry = await importRecordsRepository.create({
        evaluationId: null,
        importedEvaluationId: createdReview.id,
        importClass: 'canonical_review_export_v1',
        sourceFormat,
        sourceName: sourceFormat === 'zip' ? 'trust-review-package.zip' : 'trust-review-export.json',
        importedByUserId: actorUser.id,
        summary: {
          publicId: createdReview.publicId,
          importedCommentCount: importedComments.length,
          importedRevisionCount: historicalRevisions.length,
          importedEvidenceAssetCount: importedAssetIdMap.size,
        },
      });

      await auditLogService.record({
        evaluationId: createdReview.id,
        actorUserId: actorUser.id,
        eventType: 'import_completed',
        summary: `Imported review package ${record.public_id ?? ''}`.trim(),
        relatedImportRecordId: recordEntry.importId,
        metadataJson: {
          importClass: 'canonical_review_export_v1',
          sourceFormat,
          originalReviewId: record.review_id,
        },
      });

      return {
        importedReview: createdReview,
        record: recordEntry,
      };
    },
  });
