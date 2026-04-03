import {
  CANONICAL_PAGE_SEQUENCE,
  SECTION_IDS,
  SECTION_REGISTRY_BY_ID,
  SECTION_WORKFLOW_STATES,
  WORKFLOW_MODES,
} from '../config/sections.js';
import {
  CRITERIA,
  CRITERIA_BY_CODE,
  CRITERION_FIELD_IDS,
  FIELD_IDS,
  FIELD_TYPES,
  QUESTIONNAIRE_FIELDS,
  QUESTIONNAIRE_FIELDS_BY_ID,
  QUESTIONNAIRE_SECTIONS,
} from '../config/questionnaire-schema.js';
import {
  COMPLETION_CHECK_RULES,
  CONDITIONAL_RECOMMENDATION_VALUES,
  EVIDENCE_COMPLETENESS_RULES,
  FIELD_REQUIREMENT_RULES_BY_TARGET,
  FIELD_VISIBILITY_RULES_BY_TARGET,
  POSITIVE_RECOMMENDATION_VALUES,
  PRINCIPLE_JUDGMENT_RULES,
  RECOMMENDATION_CONSTRAINT_RULES,
  RECOMMENDATION_VALUE_ORDER,
  SECTION_STATUS,
  SKIP_STATES,
  WORKFLOW_PAGE_RULES,
} from '../config/rules.js';

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

const PRINCIPLE_SECTION_IDS = Object.freeze([
  SECTION_IDS.TR,
  SECTION_IDS.RE,
  SECTION_IDS.UC,
  SECTION_IDS.SE,
  SECTION_IDS.TC,
]);

const PRINCIPLE_JUDGMENT_FIELD_IDS = Object.freeze({
  [SECTION_IDS.TR]: FIELD_IDS.TR.PRINCIPLE_JUDGMENT,
  [SECTION_IDS.RE]: FIELD_IDS.RE.PRINCIPLE_JUDGMENT,
  [SECTION_IDS.UC]: FIELD_IDS.UC.PRINCIPLE_JUDGMENT,
  [SECTION_IDS.SE]: FIELD_IDS.SE.PRINCIPLE_JUDGMENT,
  [SECTION_IDS.TC]: FIELD_IDS.TC.PRINCIPLE_JUDGMENT,
});

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeState = (evaluation = EMPTY_OBJECT) => ({
  workflow: isPlainObject(evaluation.workflow) ? evaluation.workflow : EMPTY_OBJECT,
  fields:
    isPlainObject(evaluation.fields)
      ? evaluation.fields
      : isPlainObject(evaluation.values)
        ? evaluation.values
        : EMPTY_OBJECT,
  sections: isPlainObject(evaluation.sections) ? evaluation.sections : EMPTY_OBJECT,
  criteria: isPlainObject(evaluation.criteria) ? evaluation.criteria : EMPTY_OBJECT,
  evidence: isPlainObject(evaluation.evidence) ? evaluation.evidence : EMPTY_OBJECT,
  overrides: isPlainObject(evaluation.overrides) ? evaluation.overrides : EMPTY_OBJECT,
});

const getFieldValue = (state, fieldId) => state.fields[fieldId];

const getSectionRecord = (state, sectionId) => state.sections[sectionId] ?? EMPTY_OBJECT;

const getCriterionRecord = (state, criterionCode) => state.criteria[criterionCode] ?? EMPTY_OBJECT;

const normalizeDelimitedList = (value, splitter = /[\n,]+/) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : item))
      .filter((item) => item !== '' && item !== null && item !== undefined);
  }

  if (value instanceof Set) {
    return normalizeDelimitedList(Array.from(value), splitter);
  }

  if (typeof value === 'string') {
    return value
      .split(splitter)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return EMPTY_ARRAY;
};

const normalizeUrlList = (value) => normalizeDelimitedList(value, /\n+/);

const toNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const hasMeaningfulText = (value) => typeof value === 'string' && value.trim().length > 0;

const hasMeaningfulRawValue = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value instanceof Set || value instanceof Map) {
    return value.size > 0;
  }

  if (isPlainObject(value)) {
    return Object.keys(value).length > 0;
  }

  return true;
};

const isPersonValuePresent = (value) => {
  if (hasMeaningfulText(value)) {
    return true;
  }

  if (!isPlainObject(value)) {
    return false;
  }

  return Boolean(value.id || value.email || value.name || value.displayName);
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

const hasEvidenceNote = (item) =>
  isPlainObject(item) && (hasMeaningfulText(item.note) || hasMeaningfulText(item.notes));

const getSkipStateFromRecord = (record) => {
  if (!isPlainObject(record)) {
    return null;
  }

  if (typeof record.skipState === 'string') {
    return record.skipState;
  }

  if (record.userSkipped === true || record.skipped === true) {
    return SKIP_STATES.USER_SKIPPED;
  }

  if (record.systemSkipped === true) {
    return SKIP_STATES.SYSTEM_SKIPPED;
  }

  return null;
};

const isUserSkippedRecord = (record) => getSkipStateFromRecord(record) === SKIP_STATES.USER_SKIPPED;

const getWorkflowMode = (state) =>
  state.workflow.mode ?? getFieldValue(state, FIELD_IDS.S0.SUBMISSION_TYPE) ?? WORKFLOW_MODES.NOMINATION;

const getWorkflowPageRule = (workflowMode) =>
  WORKFLOW_PAGE_RULES[workflowMode] ?? WORKFLOW_PAGE_RULES[WORKFLOW_MODES.NOMINATION];

const getConditionValue = (condition, state, context) => {
  if (condition.fieldId) {
    return context.derivedFieldValues?.[condition.fieldId] ?? getFieldValue(state, condition.fieldId);
  }

  if (condition.sectionId) {
    return context.pageStates?.bySectionId?.[condition.sectionId]?.workflowState ?? null;
  }

  return null;
};

const matchLeafCondition = (condition, state, context) => {
  const subjectValue = getConditionValue(condition, state, context);

  switch (condition.operator) {
    case 'equals':
      return subjectValue === condition.value;
    case 'not_equals':
      return subjectValue !== condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(subjectValue);
    case 'not_in':
      return Array.isArray(condition.value) && !condition.value.includes(subjectValue);
    case 'has_any':
      return normalizeDelimitedList(subjectValue).length > 0;
    case 'not_empty':
      return hasMeaningfulRawValue(subjectValue);
    case 'empty':
      return !hasMeaningfulRawValue(subjectValue);
    default:
      return false;
  }
};

const matchesCondition = (condition, state, context) => {
  if (!condition) {
    return true;
  }

  if (Array.isArray(condition.all)) {
    return condition.all.every((part) => matchesCondition(part, state, context));
  }

  if (Array.isArray(condition.any)) {
    return condition.any.some((part) => matchesCondition(part, state, context));
  }

  if (condition.not) {
    return !matchesCondition(condition.not, state, context);
  }

  return matchLeafCondition(condition, state, context);
};

const getRulesForField = (fieldId, ruleLookup) => ruleLookup[fieldId] ?? EMPTY_ARRAY;

const getSeverityRank = (judgment) => PRINCIPLE_JUDGMENT_RULES.severityOrder.indexOf(judgment);

const isDownwardOverride = (computedValue, overrideValue) => {
  const computedRank = getSeverityRank(computedValue);
  const overrideRank = getSeverityRank(overrideValue);

  return computedRank !== -1 && overrideRank !== -1 && overrideRank >= computedRank;
};

const resolveDerivedFieldValue = (fieldId, derivedFieldValues) => derivedFieldValues[fieldId];

const isFieldValuePresent = (field, value) => {
  if (field.derived && value === undefined) {
    return false;
  }

  switch (field.type) {
    case FIELD_TYPES.SINGLE_SELECT:
      return value !== null && value !== undefined && (typeof value !== 'string' || value.trim() !== '');
    case FIELD_TYPES.MULTI_SELECT: {
      const selections = normalizeDelimitedList(value);
      return field.explicitNoneAllowed ? Array.isArray(value) || value instanceof Set : selections.length > 0;
    }
    case FIELD_TYPES.SHORT_TEXT:
    case FIELD_TYPES.LONG_TEXT:
    case FIELD_TYPES.URL:
    case FIELD_TYPES.DATE:
      return hasMeaningfulText(value) || (value instanceof Date && !Number.isNaN(value.getTime()));
    case FIELD_TYPES.URL_LIST:
      return normalizeUrlList(value).length > 0;
    case FIELD_TYPES.DATE_RANGE:
      if (Array.isArray(value)) {
        return value.length >= 2 && value.every((part) => hasMeaningfulRawValue(part));
      }

      if (isPlainObject(value)) {
        return hasMeaningfulRawValue(value.start) && hasMeaningfulRawValue(value.end);
      }

      return false;
    case FIELD_TYPES.NUMBER:
    case FIELD_TYPES.PERCENT:
      return toNumber(value) !== null;
    case FIELD_TYPES.PERSON:
      return isPersonValuePresent(value);
    case FIELD_TYPES.PEOPLE_LIST:
      return normalizeDelimitedList(value).length > 0 || (Array.isArray(value) && value.some(isPersonValuePresent));
    case FIELD_TYPES.CHECKLIST:
      if (Array.isArray(value)) {
        return value.length === COMPLETION_CHECK_RULES.length;
      }

      if (isPlainObject(value)) {
        return COMPLETION_CHECK_RULES.every((rule) => value[rule.value] === true);
      }

      return false;
    default:
      return hasMeaningfulRawValue(value);
  }
};

const buildDerivedFieldValues = (state, context = EMPTY_OBJECT) => {
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

export const createEmptyEvaluationState = () => ({
  workflow: { mode: WORKFLOW_MODES.NOMINATION },
  fields: {},
  sections: {},
  criteria: {},
  evidence: { evaluation: [], criteria: {} },
  overrides: { principleJudgments: {} },
});

export const derivePageStates = (evaluation) => {
  const state = normalizeState(evaluation);
  const workflowMode = getWorkflowMode(state);
  const workflowRule = getWorkflowPageRule(workflowMode);
  const editableSet = new Set(workflowRule.editableSectionIds);
  const readOnlySet = new Set(workflowRule.readOnlySectionIds);
  const primaryPagerSet = new Set(workflowRule.primaryPagerSectionIds);
  const bySectionId = {};

  for (const sectionId of CANONICAL_PAGE_SEQUENCE) {
    const workflowState = editableSet.has(sectionId)
      ? SECTION_WORKFLOW_STATES.EDITABLE
      : readOnlySet.has(sectionId)
        ? SECTION_WORKFLOW_STATES.READ_ONLY
        : SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED;

    bySectionId[sectionId] = {
      sectionId,
      workflowState,
      isAccessible: workflowState !== SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED,
      isEditable: workflowState === SECTION_WORKFLOW_STATES.EDITABLE,
      isReadOnly: workflowState === SECTION_WORKFLOW_STATES.READ_ONLY,
      isPrimaryPagerSection: primaryPagerSet.has(sectionId),
      pagerOrder: SECTION_REGISTRY_BY_ID[sectionId].pagerOrder,
    };
  }

  const accessibleSectionIds = CANONICAL_PAGE_SEQUENCE.filter((sectionId) => bySectionId[sectionId].isAccessible);

  return {
    workflowMode,
    bySectionId,
    editableSectionIds: CANONICAL_PAGE_SEQUENCE.filter((sectionId) => bySectionId[sectionId].isEditable),
    readOnlySectionIds: CANONICAL_PAGE_SEQUENCE.filter((sectionId) => bySectionId[sectionId].isReadOnly),
    systemSkippedSectionIds: CANONICAL_PAGE_SEQUENCE.filter((sectionId) => bySectionId[sectionId].workflowState === SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED),
    primaryPagerSectionIds: workflowRule.primaryPagerSectionIds,
    accessibleSectionIds,
  };
};

export const deriveNavigationState = derivePageStates;

export const deriveCriterionState = (criterionCode, evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const criterion = CRITERIA_BY_CODE[criterionCode];
  const sectionPageState = pageStates.bySectionId[criterion.sectionId];
  const sectionRecord = getSectionRecord(state, criterion.sectionId);
  const criterionRecord = getCriterionRecord(state, criterionCode);
  const fieldIds = CRITERION_FIELD_IDS[criterionCode];
  const fieldDefinitions = {
    score: QUESTIONNAIRE_FIELDS_BY_ID[fieldIds.score],
    evidenceSummary: QUESTIONNAIRE_FIELDS_BY_ID[fieldIds.evidenceSummary],
    evidenceLinks: QUESTIONNAIRE_FIELDS_BY_ID[fieldIds.evidenceLinks],
    uncertaintyOrBlockers: QUESTIONNAIRE_FIELDS_BY_ID[fieldIds.uncertaintyOrBlockers],
  };
  const values = {
    score: getFieldValue(state, fieldIds.score),
    evidenceSummary: getFieldValue(state, fieldIds.evidenceSummary),
    evidenceLinks: getFieldValue(state, fieldIds.evidenceLinks),
    uncertaintyOrBlockers: getFieldValue(state, fieldIds.uncertaintyOrBlockers),
  };

  let skipState = SKIP_STATES.NOT_STARTED;

  if (sectionPageState.workflowState === SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED) {
    skipState = SKIP_STATES.SYSTEM_SKIPPED;
  } else if (isUserSkippedRecord(sectionRecord)) {
    skipState = SKIP_STATES.INHERITED_SECTION_SKIP;
  } else if (isUserSkippedRecord(criterionRecord)) {
    skipState = SKIP_STATES.USER_SKIPPED;
  } else if (Object.values(values).some((value, index) => {
    const fieldKey = Object.keys(values)[index];
    return isFieldValuePresent(fieldDefinitions[fieldKey], value);
  })) {
    skipState = SKIP_STATES.ANSWERED;
  }

  const score = toNumber(values.score);
  const scorePresent = isFieldValuePresent(fieldDefinitions.score, values.score);
  const summaryPresent = isFieldValuePresent(fieldDefinitions.evidenceSummary, values.evidenceSummary);
  const linksPresent = isFieldValuePresent(fieldDefinitions.evidenceLinks, values.evidenceLinks);
  const blockersPresent = isFieldValuePresent(fieldDefinitions.uncertaintyOrBlockers, values.uncertaintyOrBlockers);
  const lowScoreFollowUpRequired = score === 0 || score === 1;

  const logicallyRequiredFieldIds =
    skipState === SKIP_STATES.USER_SKIPPED ||
    skipState === SKIP_STATES.INHERITED_SECTION_SKIP ||
    skipState === SKIP_STATES.SYSTEM_SKIPPED
      ? EMPTY_ARRAY
      : [
          fieldIds.score,
          fieldIds.evidenceSummary,
          fieldIds.evidenceLinks,
          ...(lowScoreFollowUpRequired ? [fieldIds.uncertaintyOrBlockers] : []),
        ];

  const logicalMissingFieldIds = logicallyRequiredFieldIds.filter((fieldId) => {
    const fieldDefinition = QUESTIONNAIRE_FIELDS_BY_ID[fieldId];
    const fieldValue = getFieldValue(state, fieldId);
    return !isFieldValuePresent(fieldDefinition, fieldValue);
  });

  const workflowMissingFieldIds = sectionPageState.isEditable ? logicalMissingFieldIds : EMPTY_ARRAY;

  let status = SECTION_STATUS.NOT_STARTED;

  if (skipState === SKIP_STATES.SYSTEM_SKIPPED) {
    status = SECTION_STATUS.SYSTEM_SKIPPED;
  } else if (skipState === SKIP_STATES.USER_SKIPPED || skipState === SKIP_STATES.INHERITED_SECTION_SKIP) {
    status = SECTION_STATUS.SKIPPED;
  } else if (!scorePresent && !summaryPresent && !linksPresent && !blockersPresent) {
    status = SECTION_STATUS.NOT_STARTED;
  } else if (logicalMissingFieldIds.length === 0) {
    status = SECTION_STATUS.COMPLETE;
  } else if (scorePresent || summaryPresent || linksPresent) {
    status = SECTION_STATUS.ATTENTION_REQUIRED;
  } else {
    status = SECTION_STATUS.IN_PROGRESS;
  }

  return {
    criterionCode,
    sectionId: criterion.sectionId,
    skipState,
    status,
    score,
    scorePresent,
    evidenceComplete: summaryPresent && linksPresent,
    lowScoreFollowUpRequired,
    logicallyRequiredFieldIds,
    logicalMissingFieldIds,
    workflowMissingFieldIds,
    values,
  };
};

export const deriveCriterionStates = (evaluation, pageStates = derivePageStates(evaluation)) => {
  const byCode = {};
  const bySectionId = {};

  for (const criterion of CRITERIA) {
    const criterionState = deriveCriterionState(criterion.code, evaluation, { pageStates });
    byCode[criterion.code] = criterionState;
    const sectionCriterionStates = bySectionId[criterion.sectionId] ?? [];
    sectionCriterionStates.push(criterionState);
    bySectionId[criterion.sectionId] = sectionCriterionStates;
  }

  return { byCode, bySectionId };
};

export const derivePrincipleJudgment = (sectionId, evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const criterionStates = context.criterionStates ?? deriveCriterionStates(state, context.pageStates).byCode;
  const criterionCodes = CRITERIA.filter((criterion) => criterion.sectionId === sectionId).map((criterion) => criterion.code);
  const criterionResults = criterionCodes.map((criterionCode) => criterionStates[criterionCode]);
  const allScored = criterionResults.every((criterionState) => criterionState?.scorePresent === true);
  const anySkipped = criterionResults.some((criterionState) => criterionState?.skipState === SKIP_STATES.USER_SKIPPED || criterionState?.skipState === SKIP_STATES.INHERITED_SECTION_SKIP);

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
    state.overrides.principleJudgments?.[sectionId] ??
    getFieldValue(state, fieldId) ??
    null;

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
    overrideIgnoredReason = 'Judgment override was provided before all criterion scores were available.';
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

export const deriveEvidenceCompleteness = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const criterionStatesBundle = context.criterionStates ?? deriveCriterionStates(state, pageStates);
  const evaluationEvidenceItems = extractEvidenceItems(state.evidence.evaluation);
  const evaluationFolderLinkField = QUESTIONNAIRE_FIELDS_BY_ID[FIELD_IDS.S2.EVIDENCE_FOLDER_LINK];
  const hasEvaluationFolderLink = isFieldValuePresent(
    evaluationFolderLinkField,
    getFieldValue(state, FIELD_IDS.S2.EVIDENCE_FOLDER_LINK),
  );
  const criteria = {};

  for (const criterion of CRITERIA) {
    const evidenceItems = extractEvidenceItems(state.evidence.criteria?.[criterion.code]);
    const criterionState = criterionStatesBundle.byCode[criterion.code];

    criteria[criterion.code] = {
      criterionCode: criterion.code,
      complete:
        criterionState.skipState === SKIP_STATES.USER_SKIPPED ||
        criterionState.skipState === SKIP_STATES.INHERITED_SECTION_SKIP ||
        criterionState.skipState === SKIP_STATES.SYSTEM_SKIPPED
          ? true
          : criterionState.evidenceComplete,
      summaryPresent: criterionState.evidenceComplete || hasMeaningfulText(criterionState.values.evidenceSummary),
      linksPresent: normalizeUrlList(criterionState.values.evidenceLinks).length > 0,
      itemCount: evidenceItems.length,
      noteHookComplete: evidenceItems.length === 0 || evidenceItems.every(hasEvidenceNote),
    };
  }

  return {
    rules: EVIDENCE_COMPLETENESS_RULES,
    evaluation: {
      required: pageStates.bySectionId[SECTION_IDS.S2].isAccessible,
      hasFolderLink: hasEvaluationFolderLink,
      itemCount: evaluationEvidenceItems.length,
      noteHookComplete:
        evaluationEvidenceItems.length === 0 || evaluationEvidenceItems.every(hasEvidenceNote),
      complete: hasEvaluationFolderLink,
    },
    criteria,
    hooks: {
      evaluationEvidenceNotesReady:
        evaluationEvidenceItems.length === 0 || evaluationEvidenceItems.every(hasEvidenceNote),
      criterionAssociationNotesReady: Object.values(criteria).every((criterion) => criterion.noteHookComplete),
    },
  };
};

export const deriveCompletionChecklist = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const criterionStatesBundle = context.criterionStates ?? deriveCriterionStates(state, pageStates);
  const evidenceCompleteness = context.evidenceCompleteness ?? deriveEvidenceCompleteness(state, {
    pageStates,
    criterionStates: criterionStatesBundle,
  });

  const activeCriterionCodes = CRITERIA.filter(
    (criterion) => pageStates.bySectionId[criterion.sectionId].isAccessible,
  ).map((criterion) => criterion.code);

  const repeatedQueryPerformed = getFieldValue(state, FIELD_IDS.S2.REPEATED_QUERY_TEST_PERFORMED);
  const benchmarkPerformed = getFieldValue(state, FIELD_IDS.S2.BENCHMARK_COMPARISON_PERFORMED);

  const items = {
    all_criteria_scored_with_evidence:
      activeCriterionCodes.length > 0 &&
      activeCriterionCodes.every((criterionCode) => criterionStatesBundle.byCode[criterionCode].status === SECTION_STATUS.COMPLETE),
    evidence_bundle_populated:
      evidenceCompleteness.evaluation.hasFolderLink || evidenceCompleteness.evaluation.itemCount > 0,
    repeated_query_test_complete_or_omission_documented:
      repeatedQueryPerformed === 'yes'
        ? isFieldValuePresent(
            QUESTIONNAIRE_FIELDS_BY_ID[FIELD_IDS.S2.REPEATED_QUERY_TEXT],
            getFieldValue(state, FIELD_IDS.S2.REPEATED_QUERY_TEXT),
          )
        : repeatedQueryPerformed === 'no',
    benchmark_complete_or_omission_documented:
      benchmarkPerformed === 'yes'
        ? isFieldValuePresent(
            QUESTIONNAIRE_FIELDS_BY_ID[FIELD_IDS.S2.BENCHMARK_SOURCES],
            getFieldValue(state, FIELD_IDS.S2.BENCHMARK_SOURCES),
          )
        : benchmarkPerformed === 'no',
    privacy_terms_reviewed: ['SE1', 'SE2'].every(
      (criterionCode) => criterionStatesBundle.byCode[criterionCode]?.status === SECTION_STATUS.COMPLETE,
    ),
    sample_queries_documented: isFieldValuePresent(
      QUESTIONNAIRE_FIELDS_BY_ID[FIELD_IDS.S2.SAMPLE_QUERIES_OR_SCENARIOS],
      getFieldValue(state, FIELD_IDS.S2.SAMPLE_QUERIES_OR_SCENARIOS),
    ),
    all_low_score_blockers_completed: activeCriterionCodes.every((criterionCode) => {
      const criterionState = criterionStatesBundle.byCode[criterionCode];

      if (!criterionState.lowScoreFollowUpRequired) {
        return true;
      }

      return criterionState.logicalMissingFieldIds.includes(
        CRITERION_FIELD_IDS[criterionCode].uncertaintyOrBlockers,
      ) === false;
    }),
  };

  const selectedValues = COMPLETION_CHECK_RULES.filter((rule) => items[rule.value]).map((rule) => rule.value);

  return {
    items,
    selectedValues,
    completeCount: selectedValues.length,
    totalCount: COMPLETION_CHECK_RULES.length,
  };
};

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

export const deriveFieldState = (fieldId, evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const criterionStatesBundle = context.criterionStates ?? deriveCriterionStates(state, pageStates);
  const derivedFieldValues = buildDerivedFieldValues(state, {
    ...context,
    pageStates,
    criterionStates: criterionStatesBundle,
  });
  const field = QUESTIONNAIRE_FIELDS_BY_ID[fieldId];
  const pageState = pageStates.bySectionId[field.sectionId];
  const sectionRecord = getSectionRecord(state, field.sectionId);
  const criterionState = field.criterionCode ? criterionStatesBundle.byCode[field.criterionCode] : null;
  const sectionUserSkipped = isUserSkippedRecord(sectionRecord);
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

  return {
    fieldId,
    sectionId: field.sectionId,
    criterionCode: field.criterionCode,
    visible,
    logicallyRequired,
    required: workflowRequired,
    answered,
    missing: workflowRequired && !answered,
    logicalMissing: logicallyRequired && !answered,
    readOnly: !pageState.isEditable || (field.derived && field.overridePolicy === 'none'),
    baseRequiredPolicy: field.requiredPolicy,
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
  const byId = {};
  const bySectionId = {};

  for (const field of QUESTIONNAIRE_FIELDS) {
    const fieldState = deriveFieldState(field.id, state, {
      ...context,
      pageStates,
      criterionStates: criterionStatesBundle,
      derivedFieldValues,
    });

    byId[field.id] = fieldState;
    const sectionFieldStates = bySectionId[field.sectionId] ?? [];
    sectionFieldStates.push(fieldState);
    bySectionId[field.sectionId] = sectionFieldStates;
  }

  return { byId, bySectionId };
};

export const deriveRecommendationConstraints = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const allowedValues = new Set(RECOMMENDATION_VALUE_ORDER);
  const blockedReasons = {};
  const activeRuleIds = [];

  for (const rule of RECOMMENDATION_CONSTRAINT_RULES) {
    if (!matchesCondition(rule.when, state, context)) {
      continue;
    }

    activeRuleIds.push(rule.id);

    if (Array.isArray(rule.allowedValues)) {
      for (const value of Array.from(allowedValues)) {
        if (!rule.allowedValues.includes(value)) {
          allowedValues.delete(value);
        }
      }
    }

    const released = rule.releaseCondition ? matchesCondition(rule.releaseCondition, state, context) : false;

    if (!released && Array.isArray(rule.blockedValues)) {
      for (const value of rule.blockedValues) {
        allowedValues.delete(value);
        const reasons = blockedReasons[value] ?? [];
        reasons.push({ ruleId: rule.id, description: rule.description });
        blockedReasons[value] = reasons;
      }
    }
  }

  const selectedValue = getFieldValue(state, FIELD_IDS.S9.RECOMMENDATION_STATUS) ?? null;

  return {
    allowedValues: Array.from(allowedValues),
    blockedValues: Object.keys(blockedReasons),
    blockedReasons,
    activeRuleIds,
    selectedValue,
    selectedValueBlocked: selectedValue ? blockedReasons[selectedValue] ?? null : null,
    positiveRecommendationLocked: POSITIVE_RECOMMENDATION_VALUES.some(
      (value) => Array.isArray(blockedReasons[value]),
    ),
    requiresConditionsOrCaveats: CONDITIONAL_RECOMMENDATION_VALUES.includes(selectedValue),
  };
};

export const deriveSectionStates = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const fieldStatesBundle = context.fieldStates ?? deriveFieldStates(state, context);
  const bySectionId = {};

  for (const section of QUESTIONNAIRE_SECTIONS) {
    const pageState = pageStates.bySectionId[section.id];
    const sectionRecord = getSectionRecord(state, section.id);
    const fieldStates = fieldStatesBundle.bySectionId[section.id] ?? EMPTY_ARRAY;
    const logicallyRequiredFieldStates = fieldStates.filter((fieldState) => fieldState.logicallyRequired);
    const logicalMissingFieldStates = logicallyRequiredFieldStates.filter((fieldState) => fieldState.answered === false);
    const answeredFieldCount = fieldStates.filter((fieldState) => fieldState.answered).length;
    const hasConditionalMissing = logicalMissingFieldStates.some(
      (fieldState) => fieldState.baseRequiredPolicy === 'conditional',
    );
    const blockedReasons =
      section.id === SECTION_IDS.S9 && context.recommendationConstraints?.selectedValueBlocked
        ? context.recommendationConstraints.selectedValueBlocked
        : EMPTY_ARRAY;

    let status = SECTION_STATUS.NOT_STARTED;

    if (pageState.workflowState === SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED) {
      status = SECTION_STATUS.SYSTEM_SKIPPED;
    } else if (isUserSkippedRecord(sectionRecord)) {
      status = SECTION_STATUS.SKIPPED;
    } else if (blockedReasons.length > 0) {
      status = SECTION_STATUS.BLOCKED;
    } else if (logicalMissingFieldStates.length === 0) {
      status = answeredFieldCount > 0 || logicallyRequiredFieldStates.length > 0
        ? SECTION_STATUS.COMPLETE
        : SECTION_STATUS.NOT_STARTED;
    } else if (answeredFieldCount === 0) {
      status = SECTION_STATUS.NOT_STARTED;
    } else if (hasConditionalMissing) {
      status = SECTION_STATUS.ATTENTION_REQUIRED;
    } else {
      status = SECTION_STATUS.IN_PROGRESS;
    }

    bySectionId[section.id] = {
      sectionId: section.id,
      status,
      logicallyRequiredFieldCount: logicallyRequiredFieldStates.length,
      logicalMissingFieldIds: logicalMissingFieldStates.map((fieldState) => fieldState.fieldId),
      answeredFieldCount,
      blockedReasons,
    };
  }

  return { bySectionId };
};

export const deriveRequiredFieldIds = (evaluation, context = EMPTY_OBJECT) => {
  const fieldStates = context.fieldStates ?? deriveFieldStates(evaluation, context);
  return QUESTIONNAIRE_FIELDS.filter((field) => fieldStates.byId[field.id]?.required).map((field) => field.id);
};

export const deriveMissingRequiredFieldIds = (evaluation, context = EMPTY_OBJECT) => {
  const fieldStates = context.fieldStates ?? deriveFieldStates(evaluation, context);
  return QUESTIONNAIRE_FIELDS.filter((field) => fieldStates.byId[field.id]?.missing).map((field) => field.id);
};

export const deriveOverallCompletion = (evaluation, context = EMPTY_OBJECT) => {
  const pageStates = context.pageStates ?? derivePageStates(evaluation);
  const sectionStates = context.sectionStates ?? deriveSectionStates(evaluation, context);
  const relevantSectionIds = pageStates.accessibleSectionIds;
  const completedSectionIds = relevantSectionIds.filter((sectionId) => {
    const status = sectionStates.bySectionId[sectionId]?.status;
    return status === SECTION_STATUS.COMPLETE || status === SECTION_STATUS.SKIPPED;
  });
  const blockedSectionIds = relevantSectionIds.filter(
    (sectionId) => sectionStates.bySectionId[sectionId]?.status === SECTION_STATUS.BLOCKED,
  );

  let status = SECTION_STATUS.NOT_STARTED;

  if (relevantSectionIds.length > 0 && completedSectionIds.length === relevantSectionIds.length) {
    status = SECTION_STATUS.COMPLETE;
  } else if (blockedSectionIds.length > 0) {
    status = SECTION_STATUS.BLOCKED;
  } else if (completedSectionIds.length > 0) {
    status = SECTION_STATUS.IN_PROGRESS;
  }

  return {
    status,
    completedSectionCount: completedSectionIds.length,
    totalSectionCount: relevantSectionIds.length,
    completedSectionIds,
    blockedSectionIds,
  };
};

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
  });
  const overallCompletion = deriveOverallCompletion(state, {
    pageStates,
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
    derivedFieldValues,
    fieldStates,
    sectionStates,
    overallCompletion,
    requiredFieldIds: deriveRequiredFieldIds(state, { fieldStates }),
    missingRequiredFieldIds: deriveMissingRequiredFieldIds(state, { fieldStates }),
  };
};
