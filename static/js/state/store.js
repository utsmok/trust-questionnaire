import {
  CANONICAL_PAGE_SEQUENCE,
  QUICK_JUMP_SECTION_IDS,
  getSectionDefinition,
} from '../config/sections.js';
import {
  CRITERIA_BY_CODE,
  CRITERION_FIELD_IDS,
  FIELD_TYPES,
  QUESTIONNAIRE_FIELDS_BY_ID,
} from '../config/questionnaire-schema.js';
import { SECTION_IDS } from '../config/sections.js';
import { OPTION_SETS } from '../config/option-sets.js';
import { SKIP_STATES } from '../config/rules.js';
import {
  createEmptyEvaluationState,
  deriveQuestionnaireState,
} from './derive.js';

export const ACTIVE_PAGE_VISIBILITY_THRESHOLD = 0.18;

const PANEL_NAMES = Object.freeze({
  CONTEXT: 'context',
  QUESTIONNAIRE: 'questionnaire',
});

const DEFAULT_PANEL_METRICS = Object.freeze({
  progressPercent: 0,
  canScrollUp: false,
  canScrollDown: false,
});

const DEFAULT_SURFACE_VISIBILITY = Object.freeze({
  contextSidebar: true,
  aboutSurface: false,
  helpSurface: false,
});

const DEFAULT_REFERENCE_DRAWER_STATES = Object.freeze({
  'answer-sets': true,
  'scoring-model': false,
  'evidence-requirements': false,
});

const uniquePageOrder = (pageOrder) => {
  const nextPageOrder = Array.isArray(pageOrder) && pageOrder.length
    ? pageOrder
    : CANONICAL_PAGE_SEQUENCE;

  return [...new Set(nextPageOrder.filter(Boolean))];
};

const clonePanelMetrics = (metrics = DEFAULT_PANEL_METRICS) => ({
  progressPercent: Number.isFinite(metrics.progressPercent) ? metrics.progressPercent : 0,
  canScrollUp: Boolean(metrics.canScrollUp),
  canScrollDown: Boolean(metrics.canScrollDown),
});

const cloneSurfaceVisibility = (surfaces = DEFAULT_SURFACE_VISIBILITY) => ({
  contextSidebar: surfaces.contextSidebar !== false,
  aboutSurface: Boolean(surfaces.aboutSurface),
  helpSurface: Boolean(surfaces.helpSurface),
});

const cloneReferenceDrawerStates = (referenceDrawers = DEFAULT_REFERENCE_DRAWER_STATES) => ({
  ...DEFAULT_REFERENCE_DRAWER_STATES,
  ...Object.fromEntries(
    Object.entries(referenceDrawers ?? {}).map(([drawerId, isOpen]) => [drawerId, Boolean(isOpen)]),
  ),
});

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const cloneRecordLookup = (records = {}) =>
  Object.fromEntries(
    Object.entries(records ?? {}).map(([recordId, record]) => [
      recordId,
      isPlainObject(record) ? { ...record } : record,
    ]),
  );

const CRITERION_SKIP_RECORD_KEYS = Object.freeze([
  'skipState',
  'skipReasonCode',
  'skip_reason_code',
  'criterionSkipReasonCode',
  'criterion_skip_reason_code',
  'skipRationale',
  'skip_rationale',
  'criterionSkipRationale',
  'criterion_skip_rationale',
  'userSkipped',
  'skipped',
  'systemSkipped',
]);

const CRITERION_SKIP_REASON_KEYS = new Set([
  'skipReasonCode',
  'skip_reason_code',
  'criterionSkipReasonCode',
  'criterion_skip_reason_code',
]);

const CRITERION_SKIP_RATIONALE_KEYS = new Set([
  'skipRationale',
  'skip_rationale',
  'criterionSkipRationale',
  'criterion_skip_rationale',
]);

const createEvidenceId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `evidence-${globalThis.crypto.randomUUID()}`;
  }

  return `evidence-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

  return [];
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

const normalizeEvidenceSizeValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : null;
};

const normalizeEvidenceItem = (
  item,
  {
    scope = 'evaluation',
    criterionCode = null,
  } = {},
) => {
  if (!isPlainObject(item)) {
    return null;
  }

  const resolvedCriterionCode = normalizeTextValue(criterionCode ?? item.criterionCode);
  const resolvedName = normalizeTextValue(item.name ?? item.filename ?? item.fileName ?? item.label);
  const resolvedMimeType = normalizeTextValue(item.mimeType) ?? inferMimeTypeFromName(resolvedName);
  const resolvedDataUrl = normalizeTextValue(item.dataUrl ?? item.url ?? item.href);
  const resolvedSectionId =
    resolvedCriterionCode
      ? CRITERIA_BY_CODE[resolvedCriterionCode]?.sectionId ?? normalizeTextValue(item.sectionId)
      : normalizeTextValue(item.sectionId) ?? SECTION_IDS.S2;

  return {
    id: normalizeTextValue(item.id),
    assetId:
      normalizeTextValue(item.assetId ?? item.asset_id)
      ?? normalizeTextValue(item.id),
    scope:
      resolvedCriterionCode || scope === 'criterion'
        ? 'criterion'
        : 'evaluation',
    sectionId: resolvedSectionId,
    criterionCode: resolvedCriterionCode,
    evidenceType: normalizeTextValue(item.evidenceType ?? item.type),
    note: normalizeTextValue(item.note ?? item.notes),
    name: resolvedName,
    mimeType: resolvedMimeType,
    size: normalizeEvidenceSizeValue(item.size),
    isImage: item.isImage === true || isImageMimeType(resolvedMimeType),
    dataUrl: resolvedDataUrl,
    previewDataUrl:
      normalizeTextValue(item.previewDataUrl)
      ?? (isImageMimeType(resolvedMimeType) ? resolvedDataUrl : null),
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

const normalizeTextValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const nextValue = String(value);
  return nextValue === '' ? null : nextValue;
};

const normalizeDelimitedList = (value, splitter = /[\n,]+/) => {
  const values = Array.isArray(value)
    ? value
    : value instanceof Set
      ? Array.from(value)
      : typeof value === 'string'
        ? value.split(splitter)
        : value === null || value === undefined
          ? []
          : [value];

  return [...new Set(values
    .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry).trim()))
    .filter(Boolean))];
};

const normalizeOptionValue = (field, optionValue) => {
  if (!field?.optionSetId) {
    return optionValue;
  }

  const optionSet = OPTION_SETS[field.optionSetId] ?? null;
  const matchedOption = optionSet?.options.find((option) => String(option.value) === String(optionValue));

  return matchedOption?.value ?? optionValue;
};

const normalizeDateRangeValue = (value) => {
  if (Array.isArray(value)) {
    const [start, end] = value;
    const normalizedRange = {
      start: normalizeTextValue(start),
      end: normalizeTextValue(end),
    };

    return normalizedRange.start || normalizedRange.end ? normalizedRange : null;
  }

  if (!isPlainObject(value)) {
    return null;
  }

  const normalizedRange = {
    start: normalizeTextValue(value.start),
    end: normalizeTextValue(value.end),
  };

  return normalizedRange.start || normalizedRange.end ? normalizedRange : null;
};

const normalizeNumberValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? normalizedValue : null;
};

const normalizeFieldValue = (fieldId, value) => {
  const field = QUESTIONNAIRE_FIELDS_BY_ID[fieldId];

  if (!field) {
    return value;
  }

  switch (field.type) {
    case FIELD_TYPES.SINGLE_SELECT: {
      const normalizedValue = normalizeTextValue(value);
      return normalizedValue === null ? null : normalizeOptionValue(field, normalizedValue);
    }
    case FIELD_TYPES.MULTI_SELECT:
    case FIELD_TYPES.CHECKLIST:
      return normalizeDelimitedList(value).map((entry) => normalizeOptionValue(field, entry));
    case FIELD_TYPES.SHORT_TEXT:
    case FIELD_TYPES.LONG_TEXT:
    case FIELD_TYPES.URL:
    case FIELD_TYPES.DATE:
    case FIELD_TYPES.PERSON:
      return normalizeTextValue(value);
    case FIELD_TYPES.URL_LIST:
      return normalizeDelimitedList(value, /\n+/);
    case FIELD_TYPES.DATE_RANGE:
      return normalizeDateRangeValue(value);
    case FIELD_TYPES.NUMBER:
    case FIELD_TYPES.PERCENT:
      return normalizeNumberValue(value);
    case FIELD_TYPES.PEOPLE_LIST:
      return normalizeDelimitedList(value);
    default:
      return value;
  }
};

const normalizeSectionValue = (key, value) => {
  switch (key) {
    case 'sectionNote':
    case 'section_note':
    case 'sectionSkipReasonCode':
    case 'section_skip_reason_code':
    case 'sectionSkipRationale':
    case 'section_skip_rationale':
      return normalizeTextValue(value);
    default:
      return value;
  }
};

const normalizeCriterionValue = (key, value) => {
  switch (key) {
    case 'skipState':
    case 'skipReasonCode':
    case 'skip_reason_code':
    case 'criterionSkipReasonCode':
    case 'criterion_skip_reason_code':
    case 'skipRationale':
    case 'skip_rationale':
    case 'criterionSkipRationale':
    case 'criterion_skip_rationale':
      return normalizeTextValue(value);
    default:
      return value;
  }
};

const areNormalizedValuesEqual = (left, right) => {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => areNormalizedValuesEqual(value, right[index]));
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return leftKeys.length === rightKeys.length
      && leftKeys.every((key) => areNormalizedValuesEqual(left[key], right[key]));
  }

  return false;
};

const applyNormalizedFieldValue = (fields, fieldId, value) => {
  const field = QUESTIONNAIRE_FIELDS_BY_ID[fieldId] ?? null;
  const isDeletableArray = Array.isArray(value) && value.length === 0 && field?.explicitNoneAllowed !== true;

  if (value === null || value === undefined || isDeletableArray) {
    delete fields[fieldId];
    return;
  }

  fields[fieldId] = value;
};

const applyNormalizedSectionValue = (sections, sectionId, key, value) => {
  const currentRecord = isPlainObject(sections[sectionId]) ? { ...sections[sectionId] } : {};

  if (value === null || value === undefined || value === '') {
    delete currentRecord[key];
  } else {
    currentRecord[key] = value;
  }

  if (Object.keys(currentRecord).length === 0) {
    delete sections[sectionId];
    return;
  }

  sections[sectionId] = currentRecord;
};

const applyNormalizedCriterionValue = (criteria, criterionCode, key, value) => {
  const currentRecord = isPlainObject(criteria[criterionCode]) ? { ...criteria[criterionCode] } : {};

  if (value === null || value === undefined || value === '') {
    delete currentRecord[key];
  } else {
    currentRecord[key] = value;
  }

  if (Object.keys(currentRecord).length === 0) {
    delete criteria[criterionCode];
    return;
  }

  criteria[criterionCode] = currentRecord;
};

const clearCriterionSkipRecord = (criteria, criterionCode) => {
  const currentRecord = isPlainObject(criteria[criterionCode]) ? { ...criteria[criterionCode] } : null;

  if (!currentRecord) {
    return;
  }

  CRITERION_SKIP_RECORD_KEYS.forEach((key) => {
    delete currentRecord[key];
  });

  if (Object.keys(currentRecord).length === 0) {
    delete criteria[criterionCode];
    return;
  }

  criteria[criterionCode] = currentRecord;
};

const cloneEvaluation = (evaluation = createEmptyEvaluationState()) => ({
  workflow: { ...(evaluation.workflow ?? {}) },
  fields: { ...(evaluation.fields ?? {}) },
  sections: cloneRecordLookup(evaluation.sections),
  criteria: cloneRecordLookup(evaluation.criteria),
  evidence: {
    ...(evaluation.evidence ?? {}),
    evaluation: finalizeEvidenceItemsForInsert(
      normalizeEvidenceItems(evaluation.evidence?.evaluation, {
        scope: 'evaluation',
      }),
    ),
    criteria: cloneEvidenceCriteria(evaluation.evidence?.criteria),
  },
  overrides: {
    ...(evaluation.overrides ?? {}),
    principleJudgments: { ...(evaluation.overrides?.principleJudgments ?? {}) },
  },
});

const resolveActivePageId = (pageOrder, requestedPageId) => {
  if (requestedPageId && pageOrder.includes(requestedPageId)) {
    return requestedPageId;
  }

  return pageOrder[0] ?? null;
};

const resolveContextTopicId = (pageId) => getSectionDefinition(pageId)?.contextTopicId ?? null;

const normalizePageRatios = (pageOrder, pageRatiosById = {}) =>
  Object.fromEntries(
    pageOrder.map((pageId) => [pageId, Number(pageRatiosById[pageId]) || 0]),
  );

const createUiState = ({
  pageOrder,
  activePageId,
  activeSubAnchorId,
  pageRatiosById,
  panelMetrics,
  surfaces,
  referenceDrawers,
}) => {
  const normalizedPageOrder = uniquePageOrder(pageOrder);
  const resolvedActivePageId = resolveActivePageId(normalizedPageOrder, activePageId);

  return {
    pageOrder: normalizedPageOrder,
    activePageId: resolvedActivePageId,
    activeSubAnchorId:
      typeof activeSubAnchorId === 'string' && activeSubAnchorId.trim() !== ''
        ? activeSubAnchorId
        : null,
    activeContextTopicId: resolveContextTopicId(resolvedActivePageId),
    pageRatiosById: normalizePageRatios(normalizedPageOrder, pageRatiosById),
    panelMetrics: {
      [PANEL_NAMES.CONTEXT]: clonePanelMetrics(panelMetrics?.[PANEL_NAMES.CONTEXT]),
      [PANEL_NAMES.QUESTIONNAIRE]: clonePanelMetrics(panelMetrics?.[PANEL_NAMES.QUESTIONNAIRE]),
    },
    surfaces: cloneSurfaceVisibility(surfaces),
    referenceDrawers: cloneReferenceDrawerStates(referenceDrawers),
  };
};

const createState = ({ initialEvaluation, pageOrder }) => {
  const evaluation = cloneEvaluation(initialEvaluation);
  const derived = deriveQuestionnaireState(evaluation);
  const ui = createUiState({ pageOrder, activePageId: pageOrder?.[0] ?? null });

  return { evaluation, derived, ui };
};

const createStateWithEvaluation = (previousState, evaluation) => ({
  evaluation,
  derived: deriveQuestionnaireState(evaluation),
  ui: createUiState({
    ...previousState.ui,
    pageOrder: previousState.ui.pageOrder,
    activePageId: previousState.ui.activePageId,
  }),
});

const pickBestVisiblePageId = (
  pageOrder,
  pageRatiosById,
  threshold = ACTIVE_PAGE_VISIBILITY_THRESHOLD,
) => {
  let bestPageId = null;
  let bestRatio = 0;

  for (const pageId of pageOrder) {
    const ratio = Number(pageRatiosById[pageId]) || 0;

    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestPageId = pageId;
    }
  }

  return bestRatio >= threshold ? bestPageId : null;
};

const getAllEvidenceItems = (evaluation = createEmptyEvaluationState()) => [
  ...(evaluation.evidence?.evaluation ?? []),
  ...Object.values(evaluation.evidence?.criteria ?? {}).flatMap((items) =>
    Array.isArray(items) ? items : []),
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

  return getAllEvidenceItems(evaluation).find((item) => item?.assetId === normalizedAssetId) ?? null;
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

export const selectPageOrder = (state) => state.ui.pageOrder;

export const selectQuickJumpPageIds = (state) =>
  QUICK_JUMP_SECTION_IDS.filter((pageId) => state.ui.pageOrder.includes(pageId));

export const selectActivePageDefinition = (state) =>
  getSectionDefinition(state.ui.activePageId);

export const selectActiveSubAnchorId = (state) => state.ui.activeSubAnchorId;

export const selectShellSurfaceState = (state, surfaceName) =>
  Boolean(state.ui.surfaces?.[surfaceName]);

export const selectReferenceDrawerState = (state, drawerId) =>
  Boolean(state.ui.referenceDrawers?.[drawerId]);

export const selectCriterionScore = (state, criterionCode) =>
  state.derived.criterionStates.byCode[criterionCode]?.score ?? null;

export const selectPrincipleCompletion = (state, sectionId) => {
  const criterionStates = Object.values(state.derived.criterionStates.byCode).filter(
    (criterionState) => criterionState.sectionId === sectionId,
  );
  const scoredCount = criterionStates.filter(
    (criterionState) => criterionState.scorePresent,
  ).length;
  const totalCount = criterionStates.length;

  return {
    scoredCount,
    totalCount,
    isComplete: totalCount > 0 && scoredCount === totalCount,
  };
};

export const createAppStore = ({
  initialEvaluation = createEmptyEvaluationState(),
  pageOrder = CANONICAL_PAGE_SEQUENCE,
} = {}) => {
  const listeners = new Set();
  let state = createState({ initialEvaluation, pageOrder });

  const notify = (nextState, previousState) => {
    listeners.forEach((listener) => {
      listener(nextState, previousState);
    });
  };

  const commit = (updater) => {
    const previousState = state;
    const nextState = updater(previousState);

    if (!nextState || nextState === previousState) {
      return state;
    }

    state = nextState;
    notify(state, previousState);
    return state;
  };

  const replaceEvaluation = (nextEvaluation) =>
    commit((previousState) => {
      const evaluation = cloneEvaluation(nextEvaluation);
      return createStateWithEvaluation(previousState, evaluation);
    });

  const setFieldValue = (fieldId, value) =>
    commit((previousState) => {
      if (!fieldId) {
        return previousState;
      }

      const normalizedValue = normalizeFieldValue(fieldId, value);
      const currentValue = previousState.evaluation.fields[fieldId];

      if (areNormalizedValuesEqual(currentValue, normalizedValue)) {
        return previousState;
      }

      const evaluation = cloneEvaluation(previousState.evaluation);
      applyNormalizedFieldValue(evaluation.fields, fieldId, normalizedValue);

      return createStateWithEvaluation(previousState, evaluation);
    });

  const setSectionValue = (sectionId, key, value) =>
    commit((previousState) => {
      if (!sectionId || !key) {
        return previousState;
      }

      const normalizedValue = normalizeSectionValue(key, value);
      const currentValue = previousState.evaluation.sections?.[sectionId]?.[key];

      if (areNormalizedValuesEqual(currentValue, normalizedValue)) {
        return previousState;
      }

      const evaluation = cloneEvaluation(previousState.evaluation);
      applyNormalizedSectionValue(evaluation.sections, sectionId, key, normalizedValue);

      return createStateWithEvaluation(previousState, evaluation);
    });

  const setCriterionValue = (criterionCode, key, value) =>
    commit((previousState) => {
      if (!criterionCode || !CRITERIA_BY_CODE[criterionCode] || !key) {
        return previousState;
      }

      const normalizedValue = normalizeCriterionValue(key, value);
      const currentValue = previousState.evaluation.criteria?.[criterionCode]?.[key];

      if (areNormalizedValuesEqual(currentValue, normalizedValue)) {
        return previousState;
      }

      const evaluation = cloneEvaluation(previousState.evaluation);
      applyNormalizedCriterionValue(evaluation.criteria, criterionCode, key, normalizedValue);

      if (
        normalizedValue
        && (CRITERION_SKIP_REASON_KEYS.has(key) || CRITERION_SKIP_RATIONALE_KEYS.has(key))
      ) {
        applyNormalizedCriterionValue(
          evaluation.criteria,
          criterionCode,
          'skipState',
          SKIP_STATES.USER_SKIPPED,
        );
      }

      return createStateWithEvaluation(previousState, evaluation);
    });

  const setCriterionSkipRequested = (criterionCode, isRequested = true) =>
    commit((previousState) => {
      if (!criterionCode || !CRITERIA_BY_CODE[criterionCode]) {
        return previousState;
      }

      const evaluation = cloneEvaluation(previousState.evaluation);

      if (isRequested) {
        applyNormalizedCriterionValue(
          evaluation.criteria,
          criterionCode,
          'skipState',
          SKIP_STATES.USER_SKIPPED,
        );
      } else {
        clearCriterionSkipRecord(evaluation.criteria, criterionCode);
      }

      if (areNormalizedValuesEqual(
        previousState.evaluation.criteria?.[criterionCode] ?? null,
        evaluation.criteria?.[criterionCode] ?? null,
      )) {
        return previousState;
      }

      return createStateWithEvaluation(previousState, evaluation);
    });

  const clearCriterionSkip = (criterionCode) =>
    setCriterionSkipRequested(criterionCode, false);

  const setCriterionSkipReasonCode = (criterionCode, value) =>
    setCriterionValue(criterionCode, 'skipReasonCode', value);

  const setCriterionSkipRationale = (criterionCode, value) =>
    setCriterionValue(criterionCode, 'skipRationale', value);

  const setCriterionScore = (criterionCode, score) => {
    const scoreFieldId = CRITERION_FIELD_IDS[criterionCode]?.score;

    if (!scoreFieldId) {
      return state;
    }

    return setFieldValue(scoreFieldId, score);
  };

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
      evaluation.evidence.evaluation = [
        ...evaluation.evidence.evaluation,
        ...normalizedItems,
      ];

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
      evaluation.evidence.criteria[criterionCode] = [
        ...currentItems,
        ...normalizedItems,
      ];

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

  const setActivePage = (pageId) =>
    commit((previousState) => {
      if (!previousState.ui.pageOrder.includes(pageId)) {
        return previousState;
      }

      return {
        ...previousState,
        ui: createUiState({
          ...previousState.ui,
          activePageId: pageId,
        }),
      };
    });

  const setActiveSubAnchor = (anchorId) =>
    commit((previousState) => {
      const nextAnchorId = typeof anchorId === 'string' && anchorId.trim() !== ''
        ? anchorId
        : null;

      if (previousState.ui.activeSubAnchorId === nextAnchorId) {
        return previousState;
      }

      return {
        ...previousState,
        ui: createUiState({
          ...previousState.ui,
          activeSubAnchorId: nextAnchorId,
        }),
      };
    });

  const recordPageVisibilities = (
    entries,
    threshold = ACTIVE_PAGE_VISIBILITY_THRESHOLD,
  ) =>
    commit((previousState) => {
      if (!Array.isArray(entries) || entries.length === 0) {
        return previousState;
      }

      const nextPageRatiosById = {
        ...previousState.ui.pageRatiosById,
      };

      for (const entry of entries) {
        const pageId = entry?.pageId;

        if (!pageId || !previousState.ui.pageOrder.includes(pageId)) {
          continue;
        }

        nextPageRatiosById[pageId] = Number(entry.ratio) || 0;
      }

      const bestVisiblePageId = pickBestVisiblePageId(
        previousState.ui.pageOrder,
        nextPageRatiosById,
        threshold,
      );

      return {
        ...previousState,
        ui: createUiState({
          ...previousState.ui,
          pageRatiosById: nextPageRatiosById,
          activePageId: bestVisiblePageId ?? previousState.ui.activePageId,
        }),
      };
    });

  const recordPageVisibility = (pageId, ratio, threshold) =>
    recordPageVisibilities([{ pageId, ratio }], threshold);

  const setPanelMetrics = (panelName, metrics) =>
    commit((previousState) => {
      if (!Object.values(PANEL_NAMES).includes(panelName)) {
        return previousState;
      }

      return {
        ...previousState,
        ui: createUiState({
          ...previousState.ui,
          panelMetrics: {
            ...previousState.ui.panelMetrics,
            [panelName]: clonePanelMetrics(metrics),
          },
        }),
      };
    });

  const setSurfaceOpen = (surfaceName, isOpen) =>
    commit((previousState) => {
      if (!(surfaceName in previousState.ui.surfaces)) {
        return previousState;
      }

      return {
        ...previousState,
        ui: createUiState({
          ...previousState.ui,
          surfaces: {
            ...previousState.ui.surfaces,
            [surfaceName]: Boolean(isOpen),
          },
        }),
      };
    });

  const toggleSurface = (surfaceName) =>
    setSurfaceOpen(surfaceName, !state.ui.surfaces?.[surfaceName]);

  const setReferenceDrawerOpen = (drawerId, isOpen) =>
    commit((previousState) => {
      if (!drawerId) {
        return previousState;
      }

      return {
        ...previousState,
        ui: createUiState({
          ...previousState.ui,
          referenceDrawers: {
            ...previousState.ui.referenceDrawers,
            [drawerId]: Boolean(isOpen),
          },
        }),
      };
    });

  const toggleReferenceDrawer = (drawerId) =>
    setReferenceDrawerOpen(drawerId, !state.ui.referenceDrawers?.[drawerId]);

  return {
    getState: () => state,
    subscribe: (listener, { immediate = false } = {}) => {
      listeners.add(listener);

      if (immediate) {
        listener(state, state);
      }

      return () => {
        listeners.delete(listener);
      };
    },
    actions: {
      replaceEvaluation,
      setFieldValue,
      setSectionValue,
      setCriterionValue,
      setCriterionSkipRequested,
      setCriterionSkipReasonCode,
      setCriterionSkipRationale,
      clearCriterionSkip,
      setCriterionScore,
      addEvaluationEvidenceItems,
      addCriterionEvidenceItems,
      reuseCriterionEvidenceAsset,
      replaceCriterionEvidenceItem,
      removeEvaluationEvidenceItem,
      removeCriterionEvidenceItem,
      unlinkCriterionEvidenceItem: removeCriterionEvidenceItem,
      removeEvidenceAsset,
      setActivePage,
      setActiveSubAnchor,
      recordPageVisibility,
      recordPageVisibilities,
      setPanelMetrics,
      setSurfaceOpen,
      toggleSurface,
      setReferenceDrawerOpen,
      toggleReferenceDrawer,
    },
  };
};
