import {
  FIELD_IDS,
  QUESTIONNAIRE_FIELDS,
  QUESTIONNAIRE_FIELDS_BY_ID,
} from '../../config/questionnaire-schema.js';
import {
  FIELD_REQUIREMENT_RULES_BY_TARGET,
  FIELD_VISIBILITY_RULES_BY_TARGET,
  SKIP_POLICY,
  SKIP_STATES,
  VALIDATION_STATES,
} from '../../config/rules.js';
import { EMPTY_ARRAY } from '../../utils/shared.js';
import {
  EMPTY_OBJECT,
  buildCriterionSkipMeta,
  buildSectionSkipMeta,
  createValidationIssue,
  dedupeValidationIssues,
  getFieldTextValidationIssues,
  getFieldValue,
  getRulesForField,
  getSectionRecord,
  getTypedFieldValidationIssues,
  getValidationStateFromIssues,
  hasMeaningfulRawValue,
  isFieldValuePresent,
  mapBlockedReasonsToIssues,
  mergeFieldStateValidationIssues,
  normalizeState,
  resolveDerivedFieldValue,
  resolveSkipMeta,
} from './helpers.js';
import { matchesCondition } from './rules-eval.js';
import { derivePageStates } from './workflow.js';
import { deriveCriterionStates } from './criterion.js';
import { derivePrincipleJudgments } from './judgments.js';
import { deriveCrossFieldValidations } from './validation.js';
import { deriveCompletionChecklist } from './progress.js';

const getLogicalVisibility = (field, state, context, currentValue) => {
  const pageState = context.pageStates.bySectionId[field.sectionId];

  if (!pageState.isAccessible) {
    return false;
  }

  const visibilityRules = getRulesForField(field.id, FIELD_VISIBILITY_RULES_BY_TARGET);

  if (visibilityRules.length === 0) {
    return true;
  }

  return visibilityRules.some((rule) => matchesCondition(rule.when, state, context)) || isFieldValuePresent(field, currentValue);
};

const getLogicalRequiredness = (field, state, context) => {
  if (field.requiredPolicy === 'always') {
    return true;
  }

  if (field.requiredPolicy === 'conditional') {
    const requirementRules = getRulesForField(field.id, FIELD_REQUIREMENT_RULES_BY_TARGET);
    return requirementRules.some((rule) => matchesCondition(rule.when, state, context));
  }

  return false;
};

export const buildDerivedFieldValues = (state, context = EMPTY_OBJECT) => {
  if (context.derivedFieldValues) {
    return context.derivedFieldValues;
  }

  const pageStates = context.pageStates ?? derivePageStates(state);
  const criterionStates = context.criterionStates ?? deriveCriterionStates(state, pageStates);
  const principleJudgments = context.principleJudgments ?? derivePrincipleJudgments(state, {
    pageStates,
    criterionStates,
  });
  const completionChecklist = context.completionChecklist ?? deriveCompletionChecklist(state, {
    pageStates,
    criterionStates,
  });

  return {
    ...principleJudgments.byFieldId,
    [FIELD_IDS.S8.COMPLETION_CHECKLIST]: completionChecklist.selectedValues,
  };
};

export const deriveFieldState = (fieldId, evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const criterionStatesBundle = context.criterionStates ?? deriveCriterionStates(state, pageStates);
  const sectionSkipMetaLookup =
    context.sectionSkipMeta
    ?? criterionStatesBundle.sectionSkipMeta
    ?? buildSectionSkipMeta(state);
  const criterionSkipMetaLookup =
    context.criterionSkipMeta
    ?? criterionStatesBundle.criterionSkipMeta
    ?? buildCriterionSkipMeta(state);
  const derivedFieldValues = buildDerivedFieldValues(state, {
    ...context,
    pageStates,
    criterionStates: criterionStatesBundle,
  });
  const field = QUESTIONNAIRE_FIELDS_BY_ID[fieldId];
  const pageState = pageStates.bySectionId[field.sectionId];
  const sectionSkipMeta =
    sectionSkipMetaLookup[field.sectionId]
    ?? resolveSkipMeta(getSectionRecord(state, field.sectionId), SKIP_POLICY.section, {
      sectionId: field.sectionId,
    });
  const criterionState = field.criterionCode ? criterionStatesBundle.byCode[field.criterionCode] : null;
  const sectionUserSkipped = sectionSkipMeta.requested;
  const criterionSkipped = criterionState
    ? criterionState.skipState === SKIP_STATES.USER_SKIPPED ||
      criterionState.skipState === SKIP_STATES.INHERITED_SECTION_SKIP ||
      criterionState.skipState === SKIP_STATES.SYSTEM_SKIPPED
    : false;
  const derivedValue = resolveDerivedFieldValue(fieldId, derivedFieldValues);
  const value = field.derived ? derivedValue : getFieldValue(state, fieldId);
  const visible =
    !sectionUserSkipped &&
    !criterionSkipped &&
    getLogicalVisibility(field, state, { ...context, pageStates, criterionStates: criterionStatesBundle }, value);
  const logicallyRequired =
    visible &&
    !sectionUserSkipped &&
    !criterionSkipped &&
    getLogicalRequiredness(field, state, { ...context, pageStates, criterionStates: criterionStatesBundle });
  const workflowRequired = logicallyRequired && pageState.isEditable;
  const answered = isFieldValuePresent(field, value);
  const missing = workflowRequired && !answered;
  const logicalMissing = logicallyRequired && !answered;
  const suppressedBySkip = sectionUserSkipped || criterionSkipped;
  const hiddenByCondition = !visible && !suppressedBySkip;
  const validationIssues = [];

  if (field.requiredPolicy === 'conditional' && logicalMissing) {
    validationIssues.push(
      createValidationIssue({
        ruleId: `${field.id}_conditional_required`,
        severity: VALIDATION_STATES.ATTENTION,
        kind: 'conditional_required',
        message: 'This follow-up is currently required by the active answers.',
        fieldId,
        sectionId: field.sectionId,
        criterionCode: field.criterionCode,
        relatedFieldIds: [fieldId],
      }),
    );
  }

  if (visible && hasMeaningfulRawValue(value)) {
    validationIssues.push(...getTypedFieldValidationIssues(field, value));
    validationIssues.push(...getFieldTextValidationIssues(field, value));
  }

  if (fieldId === FIELD_IDS.S9.RECOMMENDATION_STATUS) {
    validationIssues.push(
      ...mapBlockedReasonsToIssues(context.recommendationConstraints?.selectedValueBlocked, fieldId),
    );
  }

  const issues = dedupeValidationIssues(validationIssues);
  const validationState = getValidationStateFromIssues(issues);

  return {
    fieldId,
    sectionId: field.sectionId,
    criterionCode: field.criterionCode,
    visible,
    logicallyRequired,
    required: workflowRequired,
    answered,
    missing,
    logicalMissing,
    readOnly: !pageState.isEditable || (field.derived && field.overridePolicy === 'none'),
    baseRequiredPolicy: field.requiredPolicy,
    validationState,
    issues,
    attention: validationState === VALIDATION_STATES.ATTENTION,
    invalid: validationState === VALIDATION_STATES.INVALID,
    blocked: validationState === VALIDATION_STATES.BLOCKED,
    suppressedBySkip,
    hiddenByCondition,
    conditionallyRequired: field.requiredPolicy === 'conditional' && logicallyRequired,
    criterionSkipMeta: field.criterionCode ? criterionSkipMetaLookup[field.criterionCode] ?? null : null,
    value,
  };
};

export const deriveFieldStates = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const criterionStatesBundle = context.criterionStates ?? deriveCriterionStates(state, pageStates);
  const derivedFieldValues = buildDerivedFieldValues(state, {
    ...context,
    pageStates,
    criterionStates: criterionStatesBundle,
  });
  const sectionSkipMeta =
    context.sectionSkipMeta
    ?? criterionStatesBundle.sectionSkipMeta
    ?? buildSectionSkipMeta(state);
  const criterionSkipMeta =
    context.criterionSkipMeta
    ?? criterionStatesBundle.criterionSkipMeta
    ?? buildCriterionSkipMeta(state);
  const baseById = {};
  const baseBySectionId = {};

  for (const field of QUESTIONNAIRE_FIELDS) {
    const fieldState = deriveFieldState(field.id, state, {
      ...context,
      pageStates,
      criterionStates: criterionStatesBundle,
      sectionSkipMeta,
      criterionSkipMeta,
      derivedFieldValues,
    });

    baseById[field.id] = fieldState;
    const sectionFieldStates = baseBySectionId[field.sectionId] ?? [];
    sectionFieldStates.push(fieldState);
    baseBySectionId[field.sectionId] = sectionFieldStates;
  }

  const baseFieldStates = { byId: baseById, bySectionId: baseBySectionId };

  if (context.includeCrossFieldValidations === false) {
    return {
      ...baseFieldStates,
      crossFieldValidations: { byFieldId: EMPTY_OBJECT, issues: EMPTY_ARRAY },
    };
  }

  const crossFieldValidations = context.crossFieldValidations ?? deriveCrossFieldValidations(state, {
    ...context,
    pageStates,
    fieldStates: baseFieldStates,
  });
  const byId = {};
  const bySectionId = {};

  for (const field of QUESTIONNAIRE_FIELDS) {
    const mergedFieldState = mergeFieldStateValidationIssues(
      baseById[field.id],
      crossFieldValidations.byFieldId[field.id],
    );

    byId[field.id] = mergedFieldState;
    const sectionFieldStates = bySectionId[field.sectionId] ?? [];
    sectionFieldStates.push(mergedFieldState);
    bySectionId[field.sectionId] = sectionFieldStates;
  }

  return { byId, bySectionId, crossFieldValidations };
};

export const deriveRequiredFieldIds = (evaluation, context = EMPTY_OBJECT) => {
  const fieldStates = context.fieldStates ?? deriveFieldStates(evaluation, context);
  return QUESTIONNAIRE_FIELDS.filter((field) => fieldStates.byId[field.id]?.required).map((field) => field.id);
};

export const deriveMissingRequiredFieldIds = (evaluation, context = EMPTY_OBJECT) => {
  const fieldStates = context.fieldStates ?? deriveFieldStates(evaluation, context);
  return QUESTIONNAIRE_FIELDS.filter((field) => fieldStates.byId[field.id]?.missing).map((field) => field.id);
};
