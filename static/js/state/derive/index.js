import {
  CRITERIA,
  FIELD_IDS,
  QUESTIONNAIRE_FIELDS,
  QUESTIONNAIRE_SECTIONS,
} from '../../config/questionnaire-schema.js';
import { WORKFLOW_MODES } from '../../config/sections.js';
import { EMPTY_OBJECT } from '../../utils/shared.js';
import { normalizeState } from './helpers.js';
import { derivePageStates } from './workflow.js';
import { deriveCriterionStates } from './criterion.js';
import { derivePrincipleJudgments } from './judgments.js';
import { deriveEvidenceCompleteness } from './evidence.js';
import { deriveCompletionChecklist, deriveCompletionProgress, deriveOverallCompletion, PROGRESS_STATES } from './progress.js';
import { buildDerivedFieldValues, deriveFieldStates, deriveRequiredFieldIds, deriveMissingRequiredFieldIds } from './fields.js';
import { deriveRecommendationConstraints } from './recommendation.js';
import { deriveWorkflowEscalations } from './workflow.js';
import { deriveSectionStates } from './section-state.js';
import { deriveCrossFieldValidations } from './validation.js';
import { deriveNavigationState } from './workflow.js';
import { deriveCriterionState } from './criterion.js';
import { derivePrincipleJudgment } from './judgments.js';

export { PROGRESS_STATES } from './progress.js';
export { derivePageStates, deriveNavigationState, deriveWorkflowEscalations } from './workflow.js';
export { deriveCriterionState, deriveCriterionStates } from './criterion.js';
export { derivePrincipleJudgment, derivePrincipleJudgments } from './judgments.js';
export { deriveEvidenceCompleteness } from './evidence.js';
export { deriveCompletionChecklist, deriveCompletionProgress, deriveOverallCompletion } from './progress.js';
export { deriveCrossFieldValidations } from './validation.js';
export { deriveFieldState, deriveFieldStates, buildDerivedFieldValues, deriveRequiredFieldIds, deriveMissingRequiredFieldIds } from './fields.js';
export { deriveRecommendationConstraints } from './recommendation.js';
export { deriveSectionStates } from './section-state.js';

const deriveValidationSummary = ({ fieldStates, criterionStates, sectionStates }) => ({
  fields: {
    attentionIds: QUESTIONNAIRE_FIELDS
      .filter((field) => fieldStates.byId[field.id]?.attention)
      .map((field) => field.id),
    invalidIds: QUESTIONNAIRE_FIELDS
      .filter((field) => fieldStates.byId[field.id]?.invalid)
      .map((field) => field.id),
    blockedIds: QUESTIONNAIRE_FIELDS
      .filter((field) => fieldStates.byId[field.id]?.blocked)
      .map((field) => field.id),
  },
  criteria: {
    attentionCodes: CRITERIA
      .filter((criterion) => criterionStates.byCode[criterion.code]?.attention)
      .map((criterion) => criterion.code),
    invalidCodes: CRITERIA
      .filter((criterion) => criterionStates.byCode[criterion.code]?.invalid)
      .map((criterion) => criterion.code),
    blockedCodes: CRITERIA
      .filter((criterion) => criterionStates.byCode[criterion.code]?.blocked)
      .map((criterion) => criterion.code),
  },
  sections: {
    attentionIds: QUESTIONNAIRE_SECTIONS
      .filter((section) => sectionStates.bySectionId[section.id]?.attention)
      .map((section) => section.id),
    invalidIds: QUESTIONNAIRE_SECTIONS
      .filter((section) => sectionStates.bySectionId[section.id]?.invalid)
      .map((section) => section.id),
    blockedIds: QUESTIONNAIRE_SECTIONS
      .filter((section) => sectionStates.bySectionId[section.id]?.blocked)
      .map((section) => section.id),
  },
});

export const createEmptyEvaluationState = () => ({
  workflow: { mode: WORKFLOW_MODES.NOMINATION },
  fields: {},
  sections: {},
  criteria: {},
  evidence: { evaluation: [], criteria: {} },
  overrides: { principleJudgments: {} },
});

export const deriveQuestionnaireState = (evaluation = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = derivePageStates(state);
  const criterionStates = deriveCriterionStates(state, pageStates);
  const principleJudgments = derivePrincipleJudgments(state, {
    pageStates,
    criterionStates,
  });
  const evidenceCompleteness = deriveEvidenceCompleteness(state, {
    pageStates,
    criterionStates,
  });
  const completionChecklist = deriveCompletionChecklist(state, {
    pageStates,
    criterionStates,
    evidenceCompleteness,
  });
  const derivedFieldValues = {
    ...principleJudgments.byFieldId,
    [FIELD_IDS.S8.COMPLETION_CHECKLIST]: completionChecklist.selectedValues,
  };
  const recommendationConstraints = deriveRecommendationConstraints(state, {
    pageStates,
    derivedFieldValues,
  });
  const workflowEscalations = deriveWorkflowEscalations(state, {
    pageStates,
    derivedFieldValues,
  });
  const fieldStates = deriveFieldStates(state, {
    pageStates,
    criterionStates,
    derivedFieldValues,
    recommendationConstraints,
  });
  const sectionStates = deriveSectionStates(state, {
    pageStates,
    fieldStates,
    recommendationConstraints,
    criterionStates,
  });
  const completionProgress = deriveCompletionProgress(state, {
    pageStates,
    criterionStates,
    fieldStates,
    sectionStates,
    workflowEscalations,
  });
  const overallCompletion = deriveOverallCompletion(state, {
    completionProgress,
  });
  const validationSummary = deriveValidationSummary({
    fieldStates,
    criterionStates,
    sectionStates,
  });

  return {
    workflowMode: pageStates.workflowMode,
    pageStates,
    criterionStates,
    principleJudgments,
    evidenceCompleteness,
    completionChecklist,
    recommendationConstraints,
    workflowEscalations,
    derivedFieldValues,
    fieldStates,
    crossFieldValidations: fieldStates.crossFieldValidations,
    sectionStates,
    completionProgress,
    overallCompletion,
    validationSummary,
    requiredFieldIds: deriveRequiredFieldIds(state, { fieldStates }),
    missingRequiredFieldIds: deriveMissingRequiredFieldIds(state, { fieldStates }),
    invalidFieldIds: validationSummary.fields.invalidIds,
    attentionFieldIds: validationSummary.fields.attentionIds,
    blockedFieldIds: validationSummary.fields.blockedIds,
  };
};
