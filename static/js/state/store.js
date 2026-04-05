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
import { OPTION_SETS } from '../config/option-sets.js';
import { SKIP_STATES } from '../config/rules.js';
import { createEmptyEvaluationState, deriveQuestionnaireState } from './derive.js';
import { isPlainObject, normalizeDelimitedList } from '../utils/shared.js';
import {
  createEvidenceActions,
  normalizeEvidenceItems,
  finalizeEvidenceItemsForInsert,
  cloneEvidenceCriteria,
} from './evidence-actions.js';

/**
 * @typedef {Object} EvaluationState
 * @property {{ mode: string }} workflow
 * @property {Object<string, *>} fields
 * @property {Object<string, Object<string, string|null>>} sections
 * @property {Object<string, Object<string, string|null>>} criteria
 * @property {{ evaluation: EvidenceItem[], criteria: Object<string, EvidenceItem[]> }} evidence
 * @property {{ principleJudgments: Object<string, *> }} overrides
 */

/**
 * @typedef {Object} EvidenceItem
 * @property {string|null} id
 * @property {string|null} assetId
 * @property {'evaluation'|'criterion'} scope
 * @property {string|null} sectionId
 * @property {string|null} criterionCode
 * @property {string|null} evidenceType
 * @property {string|null} note
 * @property {string|null} name
 * @property {string|null} mimeType
 * @property {number|null} size
 * @property {boolean} isImage
 * @property {string|null} dataUrl
 * @property {string|null} previewDataUrl
 * @property {string|null} addedAt
 */

/**
 * @typedef {Object} DerivedState
 * @property {string} workflowMode
 * @property {Object} pageStates
 * @property {Object} criterionStates
 * @property {Object} principleJudgments
 * @property {Object} evidenceCompleteness
 * @property {Object} completionChecklist
 * @property {Object} recommendationConstraints
 * @property {Object} workflowEscalations
 * @property {Object<string, *>} derivedFieldValues
 * @property {Object} fieldStates
 * @property {Object} crossFieldValidations
 * @property {Object} sectionStates
 * @property {Object} completionProgress
 * @property {Object} overallCompletion
 * @property {Object} validationSummary
 * @property {string[]} requiredFieldIds
 * @property {string[]} missingRequiredFieldIds
 * @property {string[]} invalidFieldIds
 * @property {string[]} attentionFieldIds
 * @property {string[]} blockedFieldIds
 */

/**
 * @typedef {Object} UiState
 * @property {string[]} pageOrder
 * @property {string|null} activePageId
 * @property {string|null} activeSubAnchorId
 * @property {string|null} activeContextTopicId
 * @property {Object<string, number>} pageRatiosById
 * @property {{ context: PanelMetrics, questionnaire: PanelMetrics }} panelMetrics
 * @property {{ isOpen: boolean, activeTab: string }} sidebarPanel
 * @property {Object<string, boolean>} referenceDrawers
 */

/**
 * @typedef {Object} PanelMetrics
 * @property {number} progressPercent
 * @property {boolean} canScrollUp
 * @property {boolean} canScrollDown
 */

/**
 * @typedef {Object} Condition
 * @property {string} [fieldId]
 * @property {string} [sectionId]
 * @property {'equals'|'not_equals'|'in'|'not_in'|'has_any'|'not_empty'|'empty'} [operator]
 * @property {*} [value]
 * @property {Condition[]} [all]
 * @property {Condition[]} [any]
 * @property {Condition} [not]
 */

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

const DEFAULT_SIDEBAR_PANEL = Object.freeze({
  isOpen: true,
  activeTab: 'guidance',
});

const DEFAULT_REFERENCE_DRAWER_STATES = Object.freeze({
  'answer-sets': true,
  'scoring-model': false,
  'evidence-requirements': false,
});

const uniquePageOrder = (pageOrder) => {
  const nextPageOrder =
    Array.isArray(pageOrder) && pageOrder.length ? pageOrder : CANONICAL_PAGE_SEQUENCE;

  return [...new Set(nextPageOrder.filter(Boolean))];
};

const clonePanelMetrics = (metrics = DEFAULT_PANEL_METRICS) => ({
  progressPercent: Number.isFinite(metrics.progressPercent) ? metrics.progressPercent : 0,
  canScrollUp: Boolean(metrics.canScrollUp),
  canScrollDown: Boolean(metrics.canScrollDown),
});

const cloneSidebarPanel = (sidebarPanel = DEFAULT_SIDEBAR_PANEL) => ({
  isOpen: sidebarPanel.isOpen !== false,
  activeTab: ['guidance', 'reference', 'about'].includes(sidebarPanel.activeTab)
    ? sidebarPanel.activeTab
    : 'guidance',
});

const cloneReferenceDrawerStates = (referenceDrawers = DEFAULT_REFERENCE_DRAWER_STATES) => ({
  ...DEFAULT_REFERENCE_DRAWER_STATES,
  ...Object.fromEntries(
    Object.entries(referenceDrawers ?? {}).map(([drawerId, isOpen]) => [drawerId, Boolean(isOpen)]),
  ),
});

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

const normalizeTextValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const nextValue = String(value);
  return nextValue === '' ? null : nextValue;
};

const normalizeOptionValue = (field, optionValue) => {
  if (!field?.optionSetId) {
    return optionValue;
  }

  const optionSet = OPTION_SETS[field.optionSetId] ?? null;
  const matchedOption = optionSet?.options.find(
    (option) => String(option.value) === String(optionValue),
  );

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
    return (
      left.length === right.length &&
      left.every((value, index) => areNormalizedValuesEqual(value, right[index]))
    );
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) => areNormalizedValuesEqual(left[key], right[key]))
    );
  }

  return false;
};

const applyNormalizedFieldValue = (fields, fieldId, value) => {
  const field = QUESTIONNAIRE_FIELDS_BY_ID[fieldId] ?? null;
  const isDeletableArray =
    Array.isArray(value) && value.length === 0 && field?.explicitNoneAllowed !== true;

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
  const currentRecord = isPlainObject(criteria[criterionCode])
    ? { ...criteria[criterionCode] }
    : {};

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
  const currentRecord = isPlainObject(criteria[criterionCode])
    ? { ...criteria[criterionCode] }
    : null;

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
  Object.fromEntries(pageOrder.map((pageId) => [pageId, Number(pageRatiosById[pageId]) || 0]));

const createUiState = ({
  pageOrder,
  activePageId,
  activeSubAnchorId,
  pageRatiosById,
  panelMetrics,
  sidebarPanel,
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
    sidebarPanel: cloneSidebarPanel(sidebarPanel),
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

export const selectPageOrder = (state) => state.ui.pageOrder;

export const selectQuickJumpPageIds = (state) =>
  QUICK_JUMP_SECTION_IDS.filter((pageId) => state.ui.pageOrder.includes(pageId));

export const selectActivePageDefinition = (state) => getSectionDefinition(state.ui.activePageId);

export const selectActiveSubAnchorId = (state) => state.ui.activeSubAnchorId;

export const selectSidebarOpen = (state) => Boolean(state.ui.sidebarPanel?.isOpen);

export const selectSidebarActiveTab = (state) => state.ui.sidebarPanel?.activeTab ?? 'guidance';

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
        normalizedValue &&
        (CRITERION_SKIP_REASON_KEYS.has(key) || CRITERION_SKIP_RATIONALE_KEYS.has(key))
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

      if (
        areNormalizedValuesEqual(
          previousState.evaluation.criteria?.[criterionCode] ?? null,
          evaluation.criteria?.[criterionCode] ?? null,
        )
      ) {
        return previousState;
      }

      return createStateWithEvaluation(previousState, evaluation);
    });

  const clearCriterionSkip = (criterionCode) => setCriterionSkipRequested(criterionCode, false);

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

  const evidenceActions = createEvidenceActions({
    commit,
    getState: () => state,
    cloneEvaluation,
    createStateWithEvaluation,
    areNormalizedValuesEqual,
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
      const nextAnchorId = typeof anchorId === 'string' && anchorId.trim() !== '' ? anchorId : null;

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

  const setActivePageWithAnchor = (pageId, anchorId) =>
    commit((previousState) => {
      if (!previousState.ui.pageOrder.includes(pageId)) {
        return previousState;
      }

      const nextAnchorId = typeof anchorId === 'string' && anchorId.trim() !== '' ? anchorId : null;

      if (
        previousState.ui.activePageId === pageId &&
        previousState.ui.activeSubAnchorId === nextAnchorId
      ) {
        return previousState;
      }

      return {
        ...previousState,
        ui: createUiState({
          ...previousState.ui,
          activePageId: pageId,
          activeSubAnchorId: nextAnchorId,
        }),
      };
    });

  const recordPageVisibilities = (entries, threshold = ACTIVE_PAGE_VISIBILITY_THRESHOLD) =>
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

      const prevMetrics = previousState.ui.panelMetrics[panelName];
      if (
        prevMetrics &&
        prevMetrics.progressPercent === metrics.progressPercent &&
        prevMetrics.canScrollUp === metrics.canScrollUp &&
        prevMetrics.canScrollDown === metrics.canScrollDown
      ) {
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

  const setSidebarOpen = (isOpen) =>
    commit((previousState) => ({
      ...previousState,
      ui: createUiState({
        ...previousState.ui,
        sidebarPanel: {
          ...previousState.ui.sidebarPanel,
          isOpen: Boolean(isOpen),
        },
      }),
    }));

  const setSidebarActiveTab = (tabId) =>
    commit((previousState) => {
      if (!['guidance', 'reference', 'about'].includes(tabId)) {
        return previousState;
      }

      if (previousState.ui.sidebarPanel.activeTab === tabId) {
        return previousState;
      }

      return {
        ...previousState,
        ui: createUiState({
          ...previousState.ui,
          sidebarPanel: {
            ...previousState.ui.sidebarPanel,
            activeTab: tabId,
          },
        }),
      };
    });

  const toggleSidebar = () => setSidebarOpen(!state.ui.sidebarPanel?.isOpen);

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
      addEvaluationEvidenceItems: evidenceActions.addEvaluationEvidenceItems,
      addCriterionEvidenceItems: evidenceActions.addCriterionEvidenceItems,
      reuseCriterionEvidenceAsset: evidenceActions.reuseCriterionEvidenceAsset,
      replaceCriterionEvidenceItem: evidenceActions.replaceCriterionEvidenceItem,
      removeEvaluationEvidenceItem: evidenceActions.removeEvaluationEvidenceItem,
      removeCriterionEvidenceItem: evidenceActions.removeCriterionEvidenceItem,
      unlinkCriterionEvidenceItem: evidenceActions.removeCriterionEvidenceItem,
      removeEvidenceAsset: evidenceActions.removeEvidenceAsset,
      updateCriterionEvidenceItemNote: evidenceActions.updateCriterionEvidenceItemNote,
      updateEvaluationEvidenceItemNote: evidenceActions.updateEvaluationEvidenceItemNote,
      setActivePage,
      setActiveSubAnchor,
      setActivePageWithAnchor,
      recordPageVisibility,
      recordPageVisibilities,
      setPanelMetrics,
      setSidebarOpen,
      setSidebarActiveTab,
      toggleSidebar,
      setReferenceDrawerOpen,
      toggleReferenceDrawer,
    },
  };
};
