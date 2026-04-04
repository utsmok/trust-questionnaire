import { CRITERIA } from '../../config/questionnaire-schema.js';
import { SKIP_STATES } from '../../config/rules.js';
import {
  EMPTY_OBJECT,
  PRINCIPLE_JUDGMENT_FIELD_IDS,
  getFieldValue,
  isDownwardOverride,
  normalizeState,
} from './helpers.js';
import { SECTION_IDS } from '../../config/sections.js';
import { PRINCIPLE_SECTION_IDS } from '../../config/sections.js';
import { deriveCriterionStates } from './criterion.js';
import { derivePageStates } from './workflow.js';

export const derivePrincipleJudgment = (sectionId, evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const criterionStates =
    context.criterionStates ?? deriveCriterionStates(state, context.pageStates).byCode;
  const criterionCodes = CRITERIA.filter((criterion) => criterion.sectionId === sectionId).map(
    (criterion) => criterion.code,
  );
  const criterionResults = criterionCodes.map((criterionCode) => criterionStates[criterionCode]);
  const allScored = criterionResults.every(
    (criterionState) => criterionState?.scorePresent === true,
  );
  const anySkipped = criterionResults.some(
    (criterionState) =>
      criterionState?.skipState === SKIP_STATES.USER_SKIPPED ||
      criterionState?.skipState === SKIP_STATES.INHERITED_SECTION_SKIP,
  );

  let computedValue = null;

  if (allScored && !anySkipped) {
    const scores = criterionResults.map((criterionState) => criterionState.score);

    if (scores.includes(0)) {
      computedValue = 'fail';
    } else if (scores.includes(1)) {
      computedValue = 'conditional_pass';
    } else {
      computedValue = 'pass';
    }
  }

  const fieldId = PRINCIPLE_JUDGMENT_FIELD_IDS[sectionId];
  const overrideCandidate =
    state.overrides.principleJudgments?.[sectionId] ?? getFieldValue(state, fieldId) ?? null;

  let value = computedValue;
  let source = 'computed';
  let overrideAccepted = false;
  let overrideIgnoredReason = null;

  if (overrideCandidate && computedValue) {
    if (overrideCandidate === computedValue) {
      value = computedValue;
    } else if (isDownwardOverride(computedValue, overrideCandidate)) {
      value = overrideCandidate;
      source = 'override';
      overrideAccepted = true;
    } else {
      overrideIgnoredReason = 'Upward overrides are not allowed.';
    }
  } else if (overrideCandidate && !computedValue) {
    overrideIgnoredReason =
      'Judgment override was provided before all criterion scores were available.';
  }

  return {
    sectionId,
    fieldId,
    criterionCodes,
    computedValue,
    value,
    source,
    overrideAccepted,
    overrideIgnoredReason,
    isComplete: computedValue !== null,
  };
};

export const derivePrincipleJudgments = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const criterionStatesBundle = context.criterionStates ?? deriveCriterionStates(state, pageStates);
  const bySectionId = {};
  const byFieldId = {};

  for (const sectionId of PRINCIPLE_SECTION_IDS) {
    const judgment = derivePrincipleJudgment(sectionId, state, {
      pageStates,
      criterionStates: criterionStatesBundle.byCode,
    });

    bySectionId[sectionId] = judgment;
    byFieldId[judgment.fieldId] = judgment.value;
  }

  return { bySectionId, byFieldId };
};
