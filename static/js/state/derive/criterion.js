import {
  CRITERIA,
  CRITERIA_BY_CODE,
  CRITERION_FIELD_IDS,
  QUESTIONNAIRE_FIELDS_BY_ID,
} from '../../config/questionnaire-schema.js';
import { SECTION_STATUS, SKIP_POLICY, SKIP_STATES, VALIDATION_STATES } from '../../config/rules.js';
import { SECTION_WORKFLOW_STATES } from '../../config/sections.js';
import { EMPTY_ARRAY } from '../../utils/shared.js';
import {
  EMPTY_OBJECT,
  buildCriterionSkipMeta,
  buildSectionSkipMeta,
  createValidationIssue,
  dedupeValidationIssues,
  getCriterionRecord,
  getFieldTextValidationIssues,
  getFieldValue,
  getSectionRecord,
  getTypedFieldValidationIssues,
  isFieldValuePresent,
  normalizeState,
  resolveSkipMeta,
  toNumber,
} from './helpers.js';
import { derivePageStates } from './workflow.js';

export const deriveCriterionState = (criterionCode, evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const criterion = CRITERIA_BY_CODE[criterionCode];
  const sectionPageState = pageStates.bySectionId[criterion.sectionId];
  const sectionRecord = getSectionRecord(state, criterion.sectionId);
  const criterionRecord = getCriterionRecord(state, criterionCode);
  const sectionSkipMeta =
    context.sectionSkipMeta?.[criterion.sectionId] ??
    resolveSkipMeta(sectionRecord, SKIP_POLICY.section, {
      sectionId: criterion.sectionId,
    });
  const criterionSkipMeta =
    context.criterionSkipMeta?.[criterionCode] ??
    resolveSkipMeta(criterionRecord, SKIP_POLICY.criterion, {
      sectionId: criterion.sectionId,
      criterionCode,
    });
  const fieldIds = CRITERION_FIELD_IDS[criterionCode];
  const fieldDefinitions = {
    score: QUESTIONNAIRE_FIELDS_BY_ID[fieldIds.score],
    evidence: QUESTIONNAIRE_FIELDS_BY_ID[fieldIds.evidence],
    uncertaintyOrBlockers: QUESTIONNAIRE_FIELDS_BY_ID[fieldIds.uncertaintyOrBlockers],
  };
  const values = {
    score: getFieldValue(state, fieldIds.score),
    evidence: getFieldValue(state, fieldIds.evidence),
    uncertaintyOrBlockers: getFieldValue(state, fieldIds.uncertaintyOrBlockers),
  };

  let skipState = SKIP_STATES.NOT_STARTED;

  if (sectionPageState.workflowState === SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED) {
    skipState = SKIP_STATES.SYSTEM_SKIPPED;
  } else if (sectionSkipMeta.requested) {
    skipState = SKIP_STATES.INHERITED_SECTION_SKIP;
  } else if (criterionSkipMeta.requested) {
    skipState = SKIP_STATES.USER_SKIPPED;
  } else if (
    Object.values(values).some((value, index) => {
      const fieldKey = Object.keys(values)[index];
      return isFieldValuePresent(fieldDefinitions[fieldKey], value);
    })
  ) {
    skipState = SKIP_STATES.ANSWERED;
  }

  const score = toNumber(values.score);
  const scorePresent = isFieldValuePresent(fieldDefinitions.score, values.score);
  const evidencePresent = isFieldValuePresent(fieldDefinitions.evidence, values.evidence);
  const blockersPresent = isFieldValuePresent(
    fieldDefinitions.uncertaintyOrBlockers,
    values.uncertaintyOrBlockers,
  );
  const lowScoreFollowUpRequired = score === 0 || score === 1;

  const logicallyRequiredFieldIds =
    skipState === SKIP_STATES.USER_SKIPPED ||
    skipState === SKIP_STATES.INHERITED_SECTION_SKIP ||
    skipState === SKIP_STATES.SYSTEM_SKIPPED
      ? EMPTY_ARRAY
      : [
          fieldIds.score,
          fieldIds.evidence,
          ...(lowScoreFollowUpRequired ? [fieldIds.uncertaintyOrBlockers] : []),
        ];

  const logicalMissingFieldIds = logicallyRequiredFieldIds.filter((fieldId) => {
    const fieldDefinition = QUESTIONNAIRE_FIELDS_BY_ID[fieldId];
    const fieldValue = getFieldValue(state, fieldId);
    return !isFieldValuePresent(fieldDefinition, fieldValue);
  });

  const workflowMissingFieldIds = sectionPageState.isEditable
    ? logicalMissingFieldIds
    : EMPTY_ARRAY;
  const validationIssuesByFieldId = {};
  const addFieldIssues = (fieldId, issues = EMPTY_ARRAY) => {
    if (!fieldId || !Array.isArray(issues) || issues.length === 0) {
      return;
    }

    const nextIssues = validationIssuesByFieldId[fieldId] ?? [];
    nextIssues.push(...issues);
    validationIssuesByFieldId[fieldId] = nextIssues;
  };

  if (
    skipState !== SKIP_STATES.USER_SKIPPED &&
    skipState !== SKIP_STATES.INHERITED_SECTION_SKIP &&
    skipState !== SKIP_STATES.SYSTEM_SKIPPED
  ) {
    if (lowScoreFollowUpRequired) {
      addFieldIssues(
        fieldIds.uncertaintyOrBlockers,
        getFieldTextValidationIssues(
          fieldDefinitions.uncertaintyOrBlockers,
          values.uncertaintyOrBlockers,
        ),
      );
    }
  }

  const fieldValidationIssues = dedupeValidationIssues(
    Object.entries(validationIssuesByFieldId).flatMap(([fieldId, issues]) =>
      issues.map((issue) => ({ ...issue, fieldId })),
    ),
  );
  const invalidFieldIds = Object.keys(validationIssuesByFieldId);

  let validationIssues = fieldValidationIssues;
  let validationState = VALIDATION_STATES.CLEAR;
  let skipSatisfied = false;

  let status = SECTION_STATUS.NOT_STARTED;

  if (skipState === SKIP_STATES.SYSTEM_SKIPPED) {
    status = SECTION_STATUS.SYSTEM_SKIPPED;
  } else if (skipState === SKIP_STATES.INHERITED_SECTION_SKIP) {
    status = SECTION_STATUS.SKIPPED;
  } else if (skipState === SKIP_STATES.USER_SKIPPED) {
    validationIssues = criterionSkipMeta.issues;
    validationState = criterionSkipMeta.validationState;
    skipSatisfied = criterionSkipMeta.satisfied;
    status = criterionSkipMeta.satisfied
      ? SECTION_STATUS.SKIPPED
      : SECTION_STATUS.ATTENTION_REQUIRED;
  } else if (
    !scorePresent &&
    !evidencePresent &&
    !blockersPresent &&
    fieldValidationIssues.length === 0
  ) {
    status = SECTION_STATUS.NOT_STARTED;
  } else if (fieldValidationIssues.length > 0) {
    validationState = VALIDATION_STATES.INVALID;
    status = SECTION_STATUS.ATTENTION_REQUIRED;
  } else if (logicalMissingFieldIds.length === 0) {
    status = SECTION_STATUS.COMPLETE;
    validationState = VALIDATION_STATES.CLEAR;
  } else if (scorePresent || evidencePresent || blockersPresent) {
    validationState = VALIDATION_STATES.ATTENTION;
    status = SECTION_STATUS.ATTENTION_REQUIRED;
  } else {
    status = SECTION_STATUS.IN_PROGRESS;
  }

  const evidenceComplete = evidencePresent;

  return {
    criterionCode,
    sectionId: criterion.sectionId,
    skipState,
    skipMeta: criterionSkipMeta,
    skipSatisfied,
    status,
    validationState,
    issues: validationIssues,
    invalid: validationState === VALIDATION_STATES.INVALID,
    attention: validationState === VALIDATION_STATES.ATTENTION,
    blocked: false,
    score,
    scorePresent,
    evidenceComplete,
    lowScoreFollowUpRequired,
    logicallyRequiredFieldIds,
    logicalMissingFieldIds,
    workflowMissingFieldIds,
    invalidFieldIds,
    values,
  };
};

export const deriveCriterionStates = (evaluation, pageStates = derivePageStates(evaluation)) => {
  const state = normalizeState(evaluation);
  const sectionSkipMeta = buildSectionSkipMeta(state);
  const criterionSkipMeta = buildCriterionSkipMeta(state);
  const byCode = {};
  const bySectionId = {};

  for (const criterion of CRITERIA) {
    const criterionState = deriveCriterionState(criterion.code, state, {
      pageStates,
      sectionSkipMeta,
      criterionSkipMeta,
    });
    byCode[criterion.code] = criterionState;
    const sectionCriterionStates = bySectionId[criterion.sectionId] ?? [];
    sectionCriterionStates.push(criterionState);
    bySectionId[criterion.sectionId] = sectionCriterionStates;
  }

  return { byCode, bySectionId, sectionSkipMeta, criterionSkipMeta };
};
