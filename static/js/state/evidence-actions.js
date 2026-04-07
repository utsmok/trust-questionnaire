import { CRITERIA_BY_CODE } from '../config/questionnaire-schema.js';
import { SECTION_IDS } from '../config/sections.js';
import {
  isPlainObject,
  isImageMimeType,
  extractEvidenceItems,
  inferMimeTypeFromName,
} from '../utils/shared.js';
import { createEmptyEvaluationState } from './derive.js';

const normalizeTextValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const nextValue = String(value);
  return nextValue === '' ? null : nextValue;
};

const createEvidenceId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `evidence-${globalThis.crypto.randomUUID()}`;
  }

  return `evidence-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeEvidenceSizeValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : null;
};

const normalizeEvidenceItem = (item, { scope = 'evaluation', criterionCode = null } = {}) => {
  if (!isPlainObject(item)) {
    return null;
  }

  const resolvedCriterionCode = normalizeTextValue(criterionCode ?? item.criterionCode);
  const resolvedName = normalizeTextValue(
    item.name ?? item.filename ?? item.fileName ?? item.label,
  );
  const resolvedMimeType = normalizeTextValue(item.mimeType) ?? inferMimeTypeFromName(resolvedName);
  const resolvedDataUrl = normalizeTextValue(item.dataUrl ?? item.url ?? item.href);
  const resolvedSectionId = resolvedCriterionCode
    ? (CRITERIA_BY_CODE[resolvedCriterionCode]?.sectionId ?? normalizeTextValue(item.sectionId))
    : (normalizeTextValue(item.sectionId) ?? SECTION_IDS.S2);

  return {
    id: normalizeTextValue(item.id),
    assetId: normalizeTextValue(item.assetId ?? item.asset_id) ?? normalizeTextValue(item.id),
    scope: resolvedCriterionCode || scope === 'criterion' ? 'criterion' : 'evaluation',
    sectionId: resolvedSectionId,
    criterionCode: resolvedCriterionCode,
    evidenceType: normalizeTextValue(item.evidenceType ?? item.type),
    note: normalizeTextValue(item.note ?? item.notes),
    name: resolvedName,
    mimeType: resolvedMimeType,
    size: normalizeEvidenceSizeValue(item.size),
    isImage: item.isImage === true || isImageMimeType(resolvedMimeType),
    dataUrl: resolvedDataUrl,
    downloadUrl: normalizeTextValue(item.downloadUrl ?? item.download_url),
    previewDataUrl:
      normalizeTextValue(item.previewDataUrl) ??
      (isImageMimeType(resolvedMimeType) ? resolvedDataUrl : null),
    addedAt: normalizeTextValue(item.addedAt ?? item.createdAt ?? item.uploadedAt),
  };
};

const normalizeEvidenceItems = (items, options = {}) =>
  extractEvidenceItems(items)
    .map((item) => normalizeEvidenceItem(item, options))
    .filter(Boolean);

const finalizeEvidenceItemsForInsert = (items) =>
  items
    .filter((item) => item?.name && item?.evidenceType && item?.note)
    .map((item) => {
      const associationId = item.id ?? createEvidenceId();

      return {
        ...item,
        id: associationId,
        assetId: item.assetId ?? associationId,
      };
    });

const cloneEvidenceCriteria = (criteria = {}) =>
  Object.fromEntries(
    Object.entries(criteria ?? {}).map(([criterionCode, entry]) => [
      criterionCode,
      finalizeEvidenceItemsForInsert(
        normalizeEvidenceItems(entry, {
          scope: 'criterion',
          criterionCode,
        }),
      ),
    ]),
  );

const getAllEvidenceItems = (evaluation = createEmptyEvaluationState()) => [
  ...(evaluation.evidence?.evaluation ?? []),
  ...Object.values(evaluation.evidence?.criteria ?? {}).flatMap((items) =>
    Array.isArray(items) ? items : [],
  ),
];

const findEvidenceItemById = (evaluation, itemId) => {
  const normalizedItemId = normalizeTextValue(itemId);

  if (!normalizedItemId) {
    return null;
  }

  return getAllEvidenceItems(evaluation).find((item) => item?.id === normalizedItemId) ?? null;
};

const findEvidenceItemByAssetId = (evaluation, assetId) => {
  const normalizedAssetId = normalizeTextValue(assetId);

  if (!normalizedAssetId) {
    return null;
  }

  return (
    getAllEvidenceItems(evaluation).find((item) => item?.assetId === normalizedAssetId) ?? null
  );
};

const removeEvidenceAssetAssociations = (evaluation, assetId) => {
  const normalizedAssetId = normalizeTextValue(assetId);

  if (!normalizedAssetId) {
    return false;
  }

  let changed = false;
  const nextEvaluationItems = (evaluation.evidence.evaluation ?? []).filter((item) => {
    const keepItem = item?.assetId !== normalizedAssetId;
    changed ||= !keepItem;
    return keepItem;
  });

  evaluation.evidence.evaluation = nextEvaluationItems;

  Object.entries(evaluation.evidence.criteria ?? {}).forEach(([criterionCode, items]) => {
    const nextItems = (Array.isArray(items) ? items : []).filter((item) => {
      const keepItem = item?.assetId !== normalizedAssetId;
      changed ||= !keepItem;
      return keepItem;
    });

    if (nextItems.length === 0) {
      delete evaluation.evidence.criteria[criterionCode];
      return;
    }

    evaluation.evidence.criteria[criterionCode] = nextItems;
  });

  return changed;
};

const createCriterionEvidenceAssociation = ({
  sourceItem,
  criterionCode,
  evidenceType,
  note,
  id = null,
} = {}) => {
  if (!sourceItem || !criterionCode || !CRITERIA_BY_CODE[criterionCode]) {
    return null;
  }

  const [association] = finalizeEvidenceItemsForInsert([
    {
      id,
      assetId: sourceItem.assetId ?? sourceItem.id ?? null,
      scope: 'criterion',
      sectionId: CRITERIA_BY_CODE[criterionCode].sectionId,
      criterionCode,
      evidenceType: normalizeTextValue(evidenceType) ?? sourceItem.evidenceType,
      note: normalizeTextValue(note) ?? sourceItem.note,
      name: sourceItem.name,
      mimeType: sourceItem.mimeType,
      size: sourceItem.size,
      isImage: sourceItem.isImage,
      dataUrl: sourceItem.dataUrl,
      previewDataUrl: sourceItem.previewDataUrl,
      addedAt: normalizeTextValue(sourceItem.addedAt) ?? new Date().toISOString(),
    },
  ]);

  return association ?? null;
};

export const createEvidenceActions = ({
  commit,
  getState,
  cloneEvaluation,
  createStateWithEvaluation,
  areNormalizedValuesEqual,
}) => {
  const replaceEvidenceProjection = ({ evaluationItems = [], criterionItems = {} } = {}) =>
    commit((previousState) => {
      const nextEvaluationItems = finalizeEvidenceItemsForInsert(
        normalizeEvidenceItems(evaluationItems, {
          scope: 'evaluation',
        }),
      );
      const nextCriterionItems = Object.fromEntries(
        Object.entries(criterionItems ?? {}).map(([criterionCode, items]) => [
          criterionCode,
          finalizeEvidenceItemsForInsert(
            normalizeEvidenceItems(items, {
              scope: 'criterion',
              criterionCode,
            }),
          ),
        ]),
      );
      const currentEvaluationItems = previousState.evaluation.evidence?.evaluation ?? [];
      const currentCriterionItems = previousState.evaluation.evidence?.criteria ?? {};

      if (
        areNormalizedValuesEqual(currentEvaluationItems, nextEvaluationItems) &&
        areNormalizedValuesEqual(currentCriterionItems, nextCriterionItems)
      ) {
        return previousState;
      }

      const evaluation = cloneEvaluation(previousState.evaluation);
      evaluation.evidence.evaluation = nextEvaluationItems;
      evaluation.evidence.criteria = nextCriterionItems;

      return createStateWithEvaluation(previousState, evaluation);
    });

  const addEvaluationEvidenceItems = (items) =>
    commit((previousState) => {
      const normalizedItems = finalizeEvidenceItemsForInsert(
        normalizeEvidenceItems(items, {
          scope: 'evaluation',
        }),
      );

      if (normalizedItems.length === 0) {
        return previousState;
      }

      const evaluation = cloneEvaluation(previousState.evaluation);
      evaluation.evidence.evaluation = [...evaluation.evidence.evaluation, ...normalizedItems];

      return createStateWithEvaluation(previousState, evaluation);
    });

  const addCriterionEvidenceItems = (criterionCode, items) =>
    commit((previousState) => {
      if (!criterionCode || !CRITERIA_BY_CODE[criterionCode]) {
        return previousState;
      }

      const normalizedItems = finalizeEvidenceItemsForInsert(
        normalizeEvidenceItems(items, {
          scope: 'criterion',
          criterionCode,
        }),
      );

      if (normalizedItems.length === 0) {
        return previousState;
      }

      const evaluation = cloneEvaluation(previousState.evaluation);
      const currentItems = evaluation.evidence.criteria[criterionCode] ?? [];
      evaluation.evidence.criteria[criterionCode] = [...currentItems, ...normalizedItems];

      return createStateWithEvaluation(previousState, evaluation);
    });

  const reuseCriterionEvidenceAsset = (criterionCode, assetId, { evidenceType, note } = {}) =>
    commit((previousState) => {
      if (!criterionCode || !CRITERIA_BY_CODE[criterionCode]) {
        return previousState;
      }

      const normalizedAssetId = normalizeTextValue(assetId);
      const sourceItem = findEvidenceItemByAssetId(previousState.evaluation, normalizedAssetId);

      if (!normalizedAssetId || !sourceItem) {
        return previousState;
      }

      const currentItems = previousState.evaluation.evidence.criteria?.[criterionCode] ?? [];
      if (currentItems.some((item) => item?.assetId === normalizedAssetId)) {
        return previousState;
      }

      const association = createCriterionEvidenceAssociation({
        sourceItem,
        criterionCode,
        evidenceType,
        note,
      });

      if (!association) {
        return previousState;
      }

      const evaluation = cloneEvaluation(previousState.evaluation);
      const nextItems = evaluation.evidence.criteria[criterionCode] ?? [];
      evaluation.evidence.criteria[criterionCode] = [...nextItems, association];

      return createStateWithEvaluation(previousState, evaluation);
    });

  const replaceCriterionEvidenceItem = (criterionCode, itemId, replacement = {}) =>
    commit((previousState) => {
      if (!criterionCode || !CRITERIA_BY_CODE[criterionCode]) {
        return previousState;
      }

      const normalizedItemId = normalizeTextValue(itemId);
      if (!normalizedItemId) {
        return previousState;
      }

      const currentItems = previousState.evaluation.evidence.criteria?.[criterionCode] ?? [];
      const itemIndex = currentItems.findIndex((item) => item?.id === normalizedItemId);

      if (itemIndex === -1) {
        return previousState;
      }

      const currentItem = currentItems[itemIndex];
      const sourceAssetId = normalizeTextValue(replacement.assetId);
      const replacementSourceItem = sourceAssetId
        ? findEvidenceItemByAssetId(previousState.evaluation, sourceAssetId)
        : isPlainObject(replacement.item)
          ? replacement.item
          : replacement;

      if (!replacementSourceItem) {
        return previousState;
      }

      const association = createCriterionEvidenceAssociation({
        sourceItem: replacementSourceItem,
        criterionCode,
        evidenceType: replacement.evidenceType ?? currentItem.evidenceType,
        note: replacement.note ?? currentItem.note,
        id: currentItem.id,
      });

      if (!association) {
        return previousState;
      }

      if (
        currentItems.some(
          (item, index) => index !== itemIndex && item?.assetId === association.assetId,
        )
      ) {
        return previousState;
      }

      if (areNormalizedValuesEqual(currentItem, association)) {
        return previousState;
      }

      const evaluation = cloneEvaluation(previousState.evaluation);
      evaluation.evidence.criteria[criterionCode][itemIndex] = association;

      return createStateWithEvaluation(previousState, evaluation);
    });

  const removeEvaluationEvidenceItem = (itemId) =>
    commit((previousState) => {
      const normalizedItemId = normalizeTextValue(itemId);

      if (!normalizedItemId) {
        return previousState;
      }

      const evaluation = cloneEvaluation(previousState.evaluation);
      const nextItems = evaluation.evidence.evaluation.filter(
        (item) => item?.id !== normalizedItemId,
      );

      if (nextItems.length === evaluation.evidence.evaluation.length) {
        return previousState;
      }

      evaluation.evidence.evaluation = nextItems;
      return createStateWithEvaluation(previousState, evaluation);
    });

  const removeCriterionEvidenceItem = (criterionCode, itemId) =>
    commit((previousState) => {
      const normalizedCriterionCode = normalizeTextValue(criterionCode);
      const normalizedItemId = normalizeTextValue(itemId);

      if (!normalizedCriterionCode || !normalizedItemId) {
        return previousState;
      }

      const evaluation = cloneEvaluation(previousState.evaluation);
      const currentItems = evaluation.evidence.criteria[normalizedCriterionCode] ?? [];
      const nextItems = currentItems.filter((item) => item?.id !== normalizedItemId);

      if (nextItems.length === currentItems.length) {
        return previousState;
      }

      if (nextItems.length === 0) {
        delete evaluation.evidence.criteria[normalizedCriterionCode];
      } else {
        evaluation.evidence.criteria[normalizedCriterionCode] = nextItems;
      }

      return createStateWithEvaluation(previousState, evaluation);
    });

  const removeEvidenceAsset = (assetId) =>
    commit((previousState) => {
      const normalizedAssetId = normalizeTextValue(assetId);

      if (!normalizedAssetId) {
        return previousState;
      }

      const evaluation = cloneEvaluation(previousState.evaluation);
      const changed = removeEvidenceAssetAssociations(evaluation, normalizedAssetId);

      if (!changed) {
        return previousState;
      }

      return createStateWithEvaluation(previousState, evaluation);
    });

  const updateCriterionEvidenceItemNote = (criterionCode, itemId, note) =>
    commit((previousState) => {
      if (!criterionCode || !CRITERIA_BY_CODE[criterionCode]) {
        return previousState;
      }

      const normalizedItemId = normalizeTextValue(itemId);
      if (!normalizedItemId) {
        return previousState;
      }

      const currentItems = previousState.evaluation.evidence.criteria?.[criterionCode] ?? [];
      const itemIndex = currentItems.findIndex((item) => item?.id === normalizedItemId);

      if (itemIndex === -1) {
        return previousState;
      }

      const newNote = typeof note === 'string' ? note.trim() : '';
      const currentNote = currentItems[itemIndex].note ?? '';

      if (currentNote === newNote) {
        return previousState;
      }

      const evaluation = cloneEvaluation(previousState.evaluation);
      evaluation.evidence.criteria[criterionCode] = evaluation.evidence.criteria[criterionCode].map(
        (item, index) => (index === itemIndex ? { ...item, note: newNote || null } : item),
      );

      return createStateWithEvaluation(previousState, evaluation);
    });

  const updateEvaluationEvidenceItemNote = (itemId, note) =>
    commit((previousState) => {
      const normalizedItemId = normalizeTextValue(itemId);
      if (!normalizedItemId) {
        return previousState;
      }

      const currentItems = previousState.evaluation.evidence.evaluation ?? [];
      const itemIndex = currentItems.findIndex((item) => item?.id === normalizedItemId);

      if (itemIndex === -1) {
        return previousState;
      }

      const newNote = typeof note === 'string' ? note.trim() : '';
      const currentNote = currentItems[itemIndex].note ?? '';

      if (currentNote === newNote) {
        return previousState;
      }

      const evaluation = cloneEvaluation(previousState.evaluation);
      evaluation.evidence.evaluation = evaluation.evidence.evaluation.map((item, index) =>
        index === itemIndex ? { ...item, note: newNote || null } : item,
      );

      return createStateWithEvaluation(previousState, evaluation);
    });

  return {
    replaceEvidenceProjection,
    addEvaluationEvidenceItems,
    addCriterionEvidenceItems,
    reuseCriterionEvidenceAsset,
    replaceCriterionEvidenceItem,
    removeEvaluationEvidenceItem,
    removeCriterionEvidenceItem,
    removeEvidenceAsset,
    updateCriterionEvidenceItemNote,
    updateEvaluationEvidenceItemNote,
  };
};

export { normalizeEvidenceItems, finalizeEvidenceItemsForInsert, cloneEvidenceCriteria };
