import { CRITERIA, CRITERIA_BY_CODE } from '../config/questionnaire-schema.js';
import { PRINCIPLE_SECTION_IDS, SECTION_IDS } from '../config/sections.js';
import {
  EMPTY_ARRAY,
  isPlainObject,
  normalizeTextValue,
  extractEvidenceItems,
  inferMimeTypeFromName,
  isImageMimeType,
} from '../utils/shared.js';

export const EVIDENCE_MANIFEST_VERSION = 1;

const normalizeNumberValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : null;
};

export const serializeEvidenceItem = (
  item,
  { scope = 'evaluation', criterionCode = null, sectionId = null } = {},
) => {
  if (!isPlainObject(item)) {
    return null;
  }

  const resolvedCriterionCode = normalizeTextValue(criterionCode ?? item.criterionCode);
  const resolvedName = normalizeTextValue(
    item.name ?? item.filename ?? item.fileName ?? item.label,
  );
  const resolvedMimeType = normalizeTextValue(item.mimeType) ?? inferMimeTypeFromName(resolvedName);
  const resolvedSectionId = resolvedCriterionCode
    ? (CRITERIA_BY_CODE[resolvedCriterionCode]?.sectionId ??
      normalizeTextValue(sectionId ?? item.sectionId))
    : (normalizeTextValue(sectionId ?? item.sectionId) ?? SECTION_IDS.S2);
  const resolvedScope = resolvedCriterionCode || scope === 'criterion' ? 'criterion' : 'evaluation';
  const resolvedDataUrl = normalizeTextValue(item.dataUrl ?? item.url ?? item.href);
  const resolvedPreviewDataUrl =
    normalizeTextValue(item.previewDataUrl) ??
    (resolvedMimeType && isImageMimeType(resolvedMimeType) ? resolvedDataUrl : null);

  return Object.freeze({
    id: normalizeTextValue(item.id),
    assetId: normalizeTextValue(item.assetId ?? item.asset_id) ?? normalizeTextValue(item.id),
    scope: resolvedScope,
    sectionId: resolvedSectionId,
    criterionCode: resolvedCriterionCode,
    evidenceType: normalizeTextValue(item.evidenceType ?? item.type),
    name: resolvedName,
    note: normalizeTextValue(item.note ?? item.notes),
    mimeType: resolvedMimeType,
    size: normalizeNumberValue(item.size),
    isImage: item.isImage === true || isImageMimeType(resolvedMimeType),
    dataUrl: resolvedDataUrl,
    previewDataUrl: resolvedPreviewDataUrl,
    addedAt: normalizeTextValue(item.addedAt ?? item.createdAt ?? item.uploadedAt),
  });
};

const createCriterionManifestEntry = (criterion, evaluation) => {
  const items = extractEvidenceItems(evaluation?.evidence?.criteria?.[criterion.code])
    .map((item) =>
      serializeEvidenceItem(item, {
        scope: 'criterion',
        criterionCode: criterion.code,
        sectionId: criterion.sectionId,
      }),
    )
    .filter(Boolean);

  return Object.freeze({
    criterionCode: criterion.code,
    sectionId: criterion.sectionId,
    itemCount: items.length,
    items,
  });
};

export const createEvidenceManifest = (
  evaluation,
  { generatedAt = new Date().toISOString() } = {},
) => {
  const evaluationItems = extractEvidenceItems(evaluation?.evidence?.evaluation)
    .map((item) =>
      serializeEvidenceItem(item, {
        scope: 'evaluation',
        sectionId: SECTION_IDS.S2,
      }),
    )
    .filter(Boolean);

  const criteria = Object.freeze(
    Object.fromEntries(
      CRITERIA.map((criterion) => [
        criterion.code,
        createCriterionManifestEntry(criterion, evaluation),
      ]),
    ),
  );

  const sections = {
    [SECTION_IDS.S2]: Object.freeze({
      sectionId: SECTION_IDS.S2,
      scope: 'evaluation',
      itemCount: evaluationItems.length,
      items: evaluationItems,
    }),
  };

  PRINCIPLE_SECTION_IDS.forEach((sectionId) => {
    const sectionCriteria = CRITERIA.filter((criterion) => criterion.sectionId === sectionId);
    const sectionItemCount = sectionCriteria.reduce(
      (total, criterion) => total + (criteria[criterion.code]?.itemCount ?? 0),
      0,
    );

    sections[sectionId] = Object.freeze({
      sectionId,
      scope: 'criterion',
      criterionCodes: Object.freeze(sectionCriteria.map((criterion) => criterion.code)),
      itemCount: sectionItemCount,
      criteria: Object.freeze(
        Object.fromEntries(
          sectionCriteria.map((criterion) => [criterion.code, criteria[criterion.code]]),
        ),
      ),
    });
  });

  const totalCriterionItemCount = Object.values(criteria).reduce(
    (total, criterionEntry) => total + (criterionEntry?.itemCount ?? 0),
    0,
  );

  return Object.freeze({
    schemaVersion: EVIDENCE_MANIFEST_VERSION,
    generatedAt,
    evaluation: Object.freeze({
      itemCount: evaluationItems.length,
      items: evaluationItems,
    }),
    sections: Object.freeze(sections),
    criteria,
    summary: Object.freeze({
      evaluationItemCount: evaluationItems.length,
      criterionItemCount: totalCriterionItemCount,
      totalItemCount: evaluationItems.length + totalCriterionItemCount,
    }),
  });
};

export const serializeEvidenceManifest = (manifest, space = 2) =>
  JSON.stringify(manifest, null, space);
