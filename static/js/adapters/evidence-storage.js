import { CRITERIA, CRITERIA_BY_CODE } from '../config/questionnaire-schema.js';
import { SECTION_IDS } from '../config/sections.js';

export const EVIDENCE_MANIFEST_VERSION = 1;

const EMPTY_ARRAY = Object.freeze([]);
const PRINCIPLE_SECTION_IDS = Object.freeze([
  SECTION_IDS.TR,
  SECTION_IDS.RE,
  SECTION_IDS.UC,
  SECTION_IDS.SE,
  SECTION_IDS.TC,
]);

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeTextValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const nextValue = String(value).trim();
  return nextValue === '' ? null : nextValue;
};

const normalizeNumberValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : null;
};

const extractEvidenceItems = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (isPlainObject(value)) {
    if (Array.isArray(value.items)) {
      return value.items;
    }

    if (Array.isArray(value.files)) {
      return value.files;
    }
  }

  return EMPTY_ARRAY;
};

const inferMimeTypeFromName = (name) => {
  const normalizedName = normalizeTextValue(name);

  if (!normalizedName || !normalizedName.includes('.')) {
    return null;
  }

  const extension = normalizedName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'pdf':
      return 'application/pdf';
    case 'json':
      return 'application/json';
    case 'csv':
      return 'text/csv';
    case 'txt':
      return 'text/plain';
    case 'md':
      return 'text/markdown';
    case 'html':
      return 'text/html';
    default:
      return null;
  }
};

const isImageMimeType = (mimeType) =>
  typeof mimeType === 'string' && mimeType.startsWith('image/');

export const serializeEvidenceItem = (
  item,
  {
    scope = 'evaluation',
    criterionCode = null,
    sectionId = null,
  } = {},
) => {
  if (!isPlainObject(item)) {
    return null;
  }

  const resolvedCriterionCode = normalizeTextValue(criterionCode ?? item.criterionCode);
  const resolvedName = normalizeTextValue(item.name ?? item.filename ?? item.fileName ?? item.label);
  const resolvedMimeType = normalizeTextValue(item.mimeType) ?? inferMimeTypeFromName(resolvedName);
  const resolvedSectionId =
    resolvedCriterionCode
      ? CRITERIA_BY_CODE[resolvedCriterionCode]?.sectionId ?? normalizeTextValue(sectionId ?? item.sectionId)
      : normalizeTextValue(sectionId ?? item.sectionId) ?? SECTION_IDS.S2;
  const resolvedScope =
    resolvedCriterionCode || scope === 'criterion'
      ? 'criterion'
      : 'evaluation';
  const resolvedDataUrl = normalizeTextValue(item.dataUrl ?? item.url ?? item.href);
  const resolvedPreviewDataUrl = normalizeTextValue(item.previewDataUrl) ?? (
    resolvedMimeType && isImageMimeType(resolvedMimeType) ? resolvedDataUrl : null
  );

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
      }))
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
  {
    generatedAt = new Date().toISOString(),
  } = {},
) => {
  const evaluationItems = extractEvidenceItems(evaluation?.evidence?.evaluation)
    .map((item) =>
      serializeEvidenceItem(item, {
        scope: 'evaluation',
        sectionId: SECTION_IDS.S2,
      }))
    .filter(Boolean);

  const criteria = Object.freeze(
    Object.fromEntries(
      CRITERIA.map((criterion) => [criterion.code, createCriterionManifestEntry(criterion, evaluation)]),
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
        Object.fromEntries(sectionCriteria.map((criterion) => [criterion.code, criteria[criterion.code]])),
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
