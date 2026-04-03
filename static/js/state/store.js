import {
  CANONICAL_PAGE_SEQUENCE,
  QUICK_JUMP_SECTION_IDS,
  getSectionDefinition,
} from '../config/sections.js';
import { CRITERION_FIELD_IDS } from '../config/questionnaire-schema.js';
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

const cloneEvaluation = (evaluation = createEmptyEvaluationState()) => ({
  workflow: { ...(evaluation.workflow ?? {}) },
  fields: { ...(evaluation.fields ?? {}) },
  sections: { ...(evaluation.sections ?? {}) },
  criteria: { ...(evaluation.criteria ?? {}) },
  evidence: {
    ...(evaluation.evidence ?? {}),
    evaluation: Array.isArray(evaluation.evidence?.evaluation)
      ? [...evaluation.evidence.evaluation]
      : [],
    criteria: { ...(evaluation.evidence?.criteria ?? {}) },
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
  pageRatiosById,
  panelMetrics,
}) => {
  const normalizedPageOrder = uniquePageOrder(pageOrder);
  const resolvedActivePageId = resolveActivePageId(normalizedPageOrder, activePageId);

  return {
    pageOrder: normalizedPageOrder,
    activePageId: resolvedActivePageId,
    activeContextTopicId: resolveContextTopicId(resolvedActivePageId),
    pageRatiosById: normalizePageRatios(normalizedPageOrder, pageRatiosById),
    panelMetrics: {
      [PANEL_NAMES.CONTEXT]: clonePanelMetrics(panelMetrics?.[PANEL_NAMES.CONTEXT]),
      [PANEL_NAMES.QUESTIONNAIRE]: clonePanelMetrics(panelMetrics?.[PANEL_NAMES.QUESTIONNAIRE]),
    },
  };
};

const createState = ({ initialEvaluation, pageOrder }) => {
  const evaluation = cloneEvaluation(initialEvaluation);
  const derived = deriveQuestionnaireState(evaluation);
  const ui = createUiState({ pageOrder, activePageId: pageOrder?.[0] ?? null });

  return { evaluation, derived, ui };
};

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

export const selectActivePageDefinition = (state) =>
  getSectionDefinition(state.ui.activePageId);

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
      const derived = deriveQuestionnaireState(evaluation);
      const ui = createUiState({
        ...previousState.ui,
        pageOrder: previousState.ui.pageOrder,
        activePageId: previousState.ui.activePageId,
      });

      return { evaluation, derived, ui };
    });

  const setFieldValue = (fieldId, value) =>
    commit((previousState) => {
      if (!fieldId) {
        return previousState;
      }

      const evaluation = cloneEvaluation(previousState.evaluation);
      evaluation.fields[fieldId] = value;

      return {
        evaluation,
        derived: deriveQuestionnaireState(evaluation),
        ui: createUiState({
          ...previousState.ui,
          pageOrder: previousState.ui.pageOrder,
          activePageId: previousState.ui.activePageId,
        }),
      };
    });

  const setCriterionScore = (criterionCode, score) => {
    const scoreFieldId = CRITERION_FIELD_IDS[criterionCode]?.score;

    if (!scoreFieldId) {
      return state;
    }

    return setFieldValue(scoreFieldId, score);
  };

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
      setCriterionScore,
      setActivePage,
      recordPageVisibility,
      recordPageVisibilities,
      setPanelMetrics,
    },
  };
};
