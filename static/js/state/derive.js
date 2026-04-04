import {
  CANONICAL_PAGE_SEQUENCE,
  COMPLETION_GROUPS,
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
  CROSS_FIELD_VALIDATION_RULES,
  EVIDENCE_COMPLETENESS_RULES,
  FIELD_REQUIREMENT_RULES_BY_TARGET,
  FIELD_TEXT_VALIDATION_RULES_BY_TARGET,
  FIELD_VISIBILITY_RULES_BY_TARGET,
  POSITIVE_RECOMMENDATION_VALUES,
  PRINCIPLE_JUDGMENT_RULES,
  RECOMMENDATION_CONSTRAINT_RULES,
  RECOMMENDATION_VALUE_ORDER,
  SECTION_STATUS,
  SKIP_POLICY,
  SKIP_STATES,
  VALIDATION_STATES,
  WORKFLOW_ESCALATION_RULES,
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

export const PROGRESS_STATES = Object.freeze({
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete',
  INVALID_ATTENTION: 'invalid_attention',
  SKIPPED: 'skipped',
  BLOCKED_ESCALATED: 'blocked_escalated',
});

const RESOLVED_PROGRESS_STATES = new Set([
  PROGRESS_STATES.COMPLETE,
  PROGRESS_STATES.SKIPPED,
]);

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

const countSubstantiveCharacters = (value) =>
  (typeof value === 'string' ? value.replace(/\s+/g, '') : '').length;

const normalizeUrlCandidate = (value) =>
  typeof value === 'string' ? value.trim() : '';

const isValidAbsoluteUrl = (value) => {
  const candidate = normalizeUrlCandidate(value);

  if (!candidate) {
    return false;
  }

  try {
    const parsed = new URL(candidate);
    return typeof parsed.protocol === 'string' && parsed.protocol.length > 0;
  } catch {
    return false;
  }
};

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseIsoDate = (value) => {
  const candidate = typeof value === 'string' ? value.trim() : '';

  if (!DATE_INPUT_PATTERN.test(candidate)) {
    return null;
  }

  const parsed = new Date(`${candidate}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().startsWith(candidate) ? parsed : null;
};

const createValidationIssue = ({
  ruleId,
  severity = VALIDATION_STATES.INVALID,
  kind = 'invalid',
  message,
  fieldId = null,
  sectionId = null,
  criterionCode = null,
  relatedFieldIds = EMPTY_ARRAY,
}) => ({
  ruleId,
  severity,
  kind,
  message,
  fieldId,
  sectionId,
  criterionCode,
  relatedFieldIds,
});

const dedupeValidationIssues = (issues = EMPTY_ARRAY) => {
  const seen = new Set();

  return issues.filter((issue) => {
    const key = [
      issue.ruleId,
      issue.fieldId,
      issue.sectionId,
      issue.criterionCode,
      issue.message,
    ].join('::');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const getValidationStateFromIssues = (issues = EMPTY_ARRAY) => {
  if (issues.some((issue) => issue.severity === VALIDATION_STATES.BLOCKED)) {
    return VALIDATION_STATES.BLOCKED;
  }

  if (issues.some((issue) => issue.severity === VALIDATION_STATES.INVALID)) {
    return VALIDATION_STATES.INVALID;
  }

  if (issues.some((issue) => issue.severity === VALIDATION_STATES.ATTENTION)) {
    return VALIDATION_STATES.ATTENTION;
  }

  return VALIDATION_STATES.CLEAR;
};

const mapBlockedReasonsToIssues = (reasons = EMPTY_ARRAY, fieldId) => {
  const normalizedReasons = Array.isArray(reasons) ? reasons : EMPTY_ARRAY;

  return normalizedReasons.map((reason) =>
    createValidationIssue({
      ruleId: reason.ruleId,
      severity: VALIDATION_STATES.BLOCKED,
      kind: 'blocked_value',
      message: reason.description,
      fieldId,
      relatedFieldIds: fieldId ? [fieldId] : EMPTY_ARRAY,
    }));
};

const getRecordValue = (record, keys = EMPTY_ARRAY) => {
  if (!isPlainObject(record)) {
    return null;
  }

  for (const key of keys) {
    if (hasMeaningfulRawValue(record[key])) {
      return record[key];
    }
  }

  return null;
};

const resolveSkipMeta = (record, policy, { sectionId = null, criterionCode = null } = EMPTY_OBJECT) => {
  const explicitSkipState = getSkipStateFromRecord(record);
  const reasonCode = getRecordValue(record, policy.reasonCodeKeys);
  const rationale = getRecordValue(record, policy.rationaleKeys);
  const requested =
    explicitSkipState === SKIP_STATES.USER_SKIPPED
    || hasMeaningfulText(reasonCode)
    || hasMeaningfulText(rationale);

  if (!requested) {
    return {
      requested: false,
      explicitSkipState,
      reasonCode: null,
      rationale: null,
      issues: EMPTY_ARRAY,
      satisfied: false,
      validationState: VALIDATION_STATES.CLEAR,
    };
  }

  const issues = [];

  if (policy.requiresReasonCode && !hasMeaningfulText(reasonCode)) {
    issues.push(
      createValidationIssue({
        ruleId: `${policy.scope}_skip_reason_required`,
        severity: VALIDATION_STATES.ATTENTION,
        kind: 'skip_incomplete',
        message: 'A skip reason is required to keep this item skipped.',
        sectionId,
        criterionCode,
      }),
    );
  } else if (Array.isArray(policy.userReasonCodes) && !policy.userReasonCodes.includes(reasonCode)) {
    issues.push(
      createValidationIssue({
        ruleId: `${policy.scope}_skip_reason_invalid`,
        severity: VALIDATION_STATES.INVALID,
        kind: 'skip_invalid',
        message: 'The skip reason must be one of the supported user-selectable skip reasons.',
        sectionId,
        criterionCode,
      }),
    );
  }

  if (policy.requiresRationale && !hasMeaningfulText(rationale)) {
    issues.push(
      createValidationIssue({
        ruleId: `${policy.scope}_skip_rationale_required`,
        severity: VALIDATION_STATES.ATTENTION,
        kind: 'skip_incomplete',
        message: 'A skip rationale is required to justify the skip.',
        sectionId,
        criterionCode,
      }),
    );
  } else if (
    policy.rationaleMinLength > 0
    && countSubstantiveCharacters(rationale) < policy.rationaleMinLength
  ) {
    issues.push(
      createValidationIssue({
        ruleId: `${policy.scope}_skip_rationale_min_length`,
        severity: VALIDATION_STATES.INVALID,
        kind: 'insufficient_detail',
        message: `The skip rationale must contain at least ${policy.rationaleMinLength} non-space characters.`,
        sectionId,
        criterionCode,
      }),
    );
  }

  const normalizedIssues = dedupeValidationIssues(issues);

  return {
    requested: true,
    explicitSkipState,
    reasonCode,
    rationale,
    issues: normalizedIssues,
    satisfied: normalizedIssues.length === 0,
    validationState: getValidationStateFromIssues(normalizedIssues),
  };
};

const buildSectionSkipMeta = (state) =>
  Object.fromEntries(
    QUESTIONNAIRE_SECTIONS.map((section) => [
      section.id,
      resolveSkipMeta(getSectionRecord(state, section.id), SKIP_POLICY.section, {
        sectionId: section.id,
      }),
    ]),
  );

const buildCriterionSkipMeta = (state) =>
  Object.fromEntries(
    CRITERIA.map((criterion) => [
      criterion.code,
      resolveSkipMeta(getCriterionRecord(state, criterion.code), SKIP_POLICY.criterion, {
        sectionId: criterion.sectionId,
        criterionCode: criterion.code,
      }),
    ]),
  );

const getDuplicateEntries = (values) => {
  const seen = new Set();
  const duplicates = new Set();

  values.forEach((value) => {
    const candidate = typeof value === 'string' ? value.toLowerCase() : value;

    if (seen.has(candidate)) {
      duplicates.add(value);
      return;
    }

    seen.add(candidate);
  });

  return Array.from(duplicates);
};

const getFieldTextValidationIssues = (field, value) => {
  if (!hasMeaningfulText(value)) {
    return EMPTY_ARRAY;
  }

  return getRulesForField(field.id, FIELD_TEXT_VALIDATION_RULES_BY_TARGET).flatMap((rule) => {
    if (countSubstantiveCharacters(value) >= rule.minSubstantiveLength) {
      return EMPTY_ARRAY;
    }

    return [
      createValidationIssue({
        ruleId: rule.id,
        severity: VALIDATION_STATES.INVALID,
        kind: 'insufficient_detail',
        message: `${rule.description} Minimum detail: ${rule.minSubstantiveLength} non-space characters.`,
        fieldId: field.id,
        sectionId: field.sectionId,
        criterionCode: field.criterionCode,
        relatedFieldIds: [field.id],
      }),
    ];
  });
};

const getTypedFieldValidationIssues = (field, value) => {
  switch (field.type) {
    case FIELD_TYPES.URL:
      if (!hasMeaningfulText(value) || isValidAbsoluteUrl(value)) {
        return EMPTY_ARRAY;
      }

      return [
        createValidationIssue({
          ruleId: `${field.id}_absolute_url_required`,
          severity: VALIDATION_STATES.INVALID,
          kind: 'invalid_format',
          message: 'Enter a valid absolute URL.',
          fieldId: field.id,
          sectionId: field.sectionId,
          criterionCode: field.criterionCode,
          relatedFieldIds: [field.id],
        }),
      ];
    case FIELD_TYPES.URL_LIST: {
      const values = normalizeUrlList(value);

      if (values.length === 0) {
        return EMPTY_ARRAY;
      }

      const issues = [];
      const invalidValues = values.filter((entry) => !isValidAbsoluteUrl(entry));

      if (invalidValues.length > 0) {
        issues.push(
          createValidationIssue({
            ruleId: `${field.id}_all_urls_must_be_absolute`,
            severity: VALIDATION_STATES.INVALID,
            kind: 'invalid_format',
            message: 'Every evidence link must be a valid absolute URL.',
            fieldId: field.id,
            sectionId: field.sectionId,
            criterionCode: field.criterionCode,
            relatedFieldIds: [field.id],
          }),
        );
      }

      const duplicates = getDuplicateEntries(values);

      if (duplicates.length > 0) {
        issues.push(
          createValidationIssue({
            ruleId: `${field.id}_duplicate_urls`,
            severity: VALIDATION_STATES.INVALID,
            kind: 'duplicate_values',
            message: 'Duplicate URLs are not allowed in the same list.',
            fieldId: field.id,
            sectionId: field.sectionId,
            criterionCode: field.criterionCode,
            relatedFieldIds: [field.id],
          }),
        );
      }

      return issues;
    }
    case FIELD_TYPES.DATE:
      if (!hasMeaningfulText(value) || parseIsoDate(value)) {
        return EMPTY_ARRAY;
      }

      return [
        createValidationIssue({
          ruleId: `${field.id}_valid_date_required`,
          severity: VALIDATION_STATES.INVALID,
          kind: 'invalid_format',
          message: 'Enter a valid calendar date in YYYY-MM-DD format.',
          fieldId: field.id,
          sectionId: field.sectionId,
          criterionCode: field.criterionCode,
          relatedFieldIds: [field.id],
        }),
      ];
    case FIELD_TYPES.DATE_RANGE: {
      if (!isPlainObject(value)) {
        return EMPTY_ARRAY;
      }

      const startRaw = value.start ?? null;
      const endRaw = value.end ?? null;
      const startPresent = hasMeaningfulRawValue(startRaw);
      const endPresent = hasMeaningfulRawValue(endRaw);

      if (!startPresent && !endPresent) {
        return EMPTY_ARRAY;
      }

      const issues = [];

      if (startPresent !== endPresent) {
        issues.push(
          createValidationIssue({
            ruleId: `${field.id}_complete_date_range`,
            severity: VALIDATION_STATES.INVALID,
            kind: 'partial_typed_value',
            message: 'Provide both a start date and an end date.',
            fieldId: field.id,
            sectionId: field.sectionId,
            criterionCode: field.criterionCode,
            relatedFieldIds: [field.id],
          }),
        );
        return issues;
      }

      const startDate = parseIsoDate(startRaw);
      const endDate = parseIsoDate(endRaw);

      if (!startDate || !endDate) {
        issues.push(
          createValidationIssue({
            ruleId: `${field.id}_valid_date_range`,
            severity: VALIDATION_STATES.INVALID,
            kind: 'invalid_format',
            message: 'Both testing dates must be valid calendar dates in YYYY-MM-DD format.',
            fieldId: field.id,
            sectionId: field.sectionId,
            criterionCode: field.criterionCode,
            relatedFieldIds: [field.id],
          }),
        );
        return issues;
      }

      if (startDate.getTime() > endDate.getTime()) {
        issues.push(
          createValidationIssue({
            ruleId: `${field.id}_date_range_order`,
            severity: VALIDATION_STATES.INVALID,
            kind: 'chronology',
            message: 'The testing start date must be on or before the testing end date.',
            fieldId: field.id,
            sectionId: field.sectionId,
            criterionCode: field.criterionCode,
            relatedFieldIds: [field.id],
          }),
        );
      }

      return issues;
    }
    case FIELD_TYPES.NUMBER:
      if (value === null || value === undefined || value === '') {
        return EMPTY_ARRAY;
      }

      if (Number.isInteger(value) && value >= 0) {
        return EMPTY_ARRAY;
      }

      return [
        createValidationIssue({
          ruleId: `${field.id}_non_negative_integer`,
          severity: VALIDATION_STATES.INVALID,
          kind: 'invalid_range',
          message: 'Enter a non-negative whole number.',
          fieldId: field.id,
          sectionId: field.sectionId,
          criterionCode: field.criterionCode,
          relatedFieldIds: [field.id],
        }),
      ];
    case FIELD_TYPES.PERCENT:
      if (value === null || value === undefined || value === '') {
        return EMPTY_ARRAY;
      }

      if (Number.isInteger(value) && value >= 0 && value <= 100) {
        return EMPTY_ARRAY;
      }

      return [
        createValidationIssue({
          ruleId: `${field.id}_percentage_bounds`,
          severity: VALIDATION_STATES.INVALID,
          kind: 'invalid_range',
          message: 'Enter a whole-number percentage between 0 and 100.',
          fieldId: field.id,
          sectionId: field.sectionId,
          criterionCode: field.criterionCode,
          relatedFieldIds: [field.id],
        }),
      ];
    default:
      return EMPTY_ARRAY;
  }
};

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
  getFieldValue(state, FIELD_IDS.S0.SUBMISSION_TYPE) ?? state.workflow.mode ?? WORKFLOW_MODES.NOMINATION;

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
  const sectionSkipMeta =
    context.sectionSkipMeta?.[criterion.sectionId]
    ?? resolveSkipMeta(sectionRecord, SKIP_POLICY.section, {
      sectionId: criterion.sectionId,
    });
  const criterionSkipMeta =
    context.criterionSkipMeta?.[criterionCode]
    ?? resolveSkipMeta(criterionRecord, SKIP_POLICY.criterion, {
      sectionId: criterion.sectionId,
      criterionCode,
    });
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
  } else if (sectionSkipMeta.requested) {
    skipState = SKIP_STATES.INHERITED_SECTION_SKIP;
  } else if (criterionSkipMeta.requested) {
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
    skipState === SKIP_STATES.USER_SKIPPED
    || skipState === SKIP_STATES.INHERITED_SECTION_SKIP
    || skipState === SKIP_STATES.SYSTEM_SKIPPED
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
    skipState !== SKIP_STATES.USER_SKIPPED
    && skipState !== SKIP_STATES.INHERITED_SECTION_SKIP
    && skipState !== SKIP_STATES.SYSTEM_SKIPPED
  ) {
    addFieldIssues(
      fieldIds.evidenceLinks,
      getTypedFieldValidationIssues(fieldDefinitions.evidenceLinks, values.evidenceLinks),
    );

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
      issues.map((issue) => ({ ...issue, fieldId }))),
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
  } else if (!scorePresent && !summaryPresent && !linksPresent && !blockersPresent && fieldValidationIssues.length === 0) {
    status = SECTION_STATUS.NOT_STARTED;
  } else if (fieldValidationIssues.length > 0) {
    validationState = VALIDATION_STATES.INVALID;
    status = SECTION_STATUS.ATTENTION_REQUIRED;
  } else if (logicalMissingFieldIds.length === 0) {
    status = SECTION_STATUS.COMPLETE;
    validationState = VALIDATION_STATES.CLEAR;
  } else if (scorePresent || summaryPresent || linksPresent || blockersPresent) {
    validationState = VALIDATION_STATES.ATTENTION;
    status = SECTION_STATUS.ATTENTION_REQUIRED;
  } else {
    status = SECTION_STATUS.IN_PROGRESS;
  }

  const evidenceComplete =
    summaryPresent
    && linksPresent
    && !invalidFieldIds.includes(fieldIds.evidenceLinks);

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
  const evaluationFolderLinkValue = getFieldValue(state, FIELD_IDS.S2.EVIDENCE_FOLDER_LINK);
  const hasEvaluationFolderLink = isFieldValuePresent(
    evaluationFolderLinkField,
    evaluationFolderLinkValue,
  );
  const evaluationFolderLinkValid =
    getTypedFieldValidationIssues(evaluationFolderLinkField, evaluationFolderLinkValue).length === 0;
  const criteria = {};

  for (const criterion of CRITERIA) {
    const evidenceItems = extractEvidenceItems(state.evidence.criteria?.[criterion.code]);
    const criterionState = criterionStatesBundle.byCode[criterion.code];
    const evidenceLinksFieldId = CRITERION_FIELD_IDS[criterion.code].evidenceLinks;

    criteria[criterion.code] = {
      criterionCode: criterion.code,
      complete:
        criterionState.skipState === SKIP_STATES.USER_SKIPPED
          ? criterionState.skipSatisfied
          : criterionState.skipState === SKIP_STATES.INHERITED_SECTION_SKIP ||
            criterionState.skipState === SKIP_STATES.SYSTEM_SKIPPED
            ? true
            : criterionState.evidenceComplete,
      summaryPresent: criterionState.evidenceComplete || hasMeaningfulText(criterionState.values.evidenceSummary),
      linksPresent:
        normalizeUrlList(criterionState.values.evidenceLinks).length > 0
        && !criterionState.invalidFieldIds.includes(evidenceLinksFieldId),
      itemCount: evidenceItems.length,
      noteHookComplete: evidenceItems.length === 0 || evidenceItems.every(hasEvidenceNote),
    };
  }

  return {
    rules: EVIDENCE_COMPLETENESS_RULES,
    evaluation: {
      required: pageStates.bySectionId[SECTION_IDS.S2].isAccessible,
      hasFolderLink: hasEvaluationFolderLink,
      folderLinkValid: evaluationFolderLinkValid,
      itemCount: evaluationEvidenceItems.length,
      noteHookComplete:
        evaluationEvidenceItems.length === 0 || evaluationEvidenceItems.every(hasEvidenceNote),
      complete: hasEvaluationFolderLink && evaluationFolderLinkValid,
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
      evidenceCompleteness.evaluation.complete || evidenceCompleteness.evaluation.itemCount > 0,
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
      ) === false
        && criterionState.invalidFieldIds.includes(
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

const mergeFieldStateValidationIssues = (fieldState, extraIssues = EMPTY_ARRAY) => {
  const issues = dedupeValidationIssues([...(fieldState.issues ?? EMPTY_ARRAY), ...extraIssues]);
  const validationState = getValidationStateFromIssues(issues);

  return {
    ...fieldState,
    issues,
    validationState,
    attention: validationState === VALIDATION_STATES.ATTENTION,
    invalid: validationState === VALIDATION_STATES.INVALID,
    blocked: validationState === VALIDATION_STATES.BLOCKED,
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

export const deriveCrossFieldValidations = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const fieldStates = context.fieldStates ?? deriveFieldStates(state, {
    ...context,
    pageStates,
    includeCrossFieldValidations: false,
  });
  const byFieldId = {};
  const issues = [];

  const addIssue = (fieldId, issue) => {
    if (!fieldId || !issue) {
      return;
    }

    const nextIssues = byFieldId[fieldId] ?? [];
    nextIssues.push(issue);
    byFieldId[fieldId] = nextIssues;
    issues.push(issue);
  };

  for (const rule of CROSS_FIELD_VALIDATION_RULES) {
    const targetFieldStates = rule.targetFieldIds
      .map((fieldId) => fieldStates.byId[fieldId])
      .filter(Boolean)
      .filter((fieldState) => fieldState.suppressedBySkip !== true);

    if (
      targetFieldStates.length === 0
      || !targetFieldStates.some((fieldState) =>
        fieldState.visible || fieldState.answered || fieldState.logicallyRequired)
    ) {
      continue;
    }

    switch (rule.type) {
      case 'date_order': {
        const earlierState = fieldStates.byId[rule.earlierFieldId];
        const laterState = fieldStates.byId[rule.laterFieldId];

        if (
          !earlierState
          || !laterState
          || earlierState.suppressedBySkip
          || laterState.suppressedBySkip
        ) {
          break;
        }

        const earlierDate = parseIsoDate(earlierState.value);
        const laterDate = parseIsoDate(laterState.value);

        if (!earlierDate || !laterDate || laterDate.getTime() >= earlierDate.getTime()) {
          break;
        }

        rule.targetFieldIds.forEach((fieldId) => {
          addIssue(
            fieldId,
            createValidationIssue({
              ruleId: rule.id,
              severity: VALIDATION_STATES.INVALID,
              kind: 'chronology',
              message: rule.description,
              fieldId,
              relatedFieldIds: rule.targetFieldIds,
            }),
          );
        });
        break;
      }
      case 'date_after_latest_of': {
        const subjectState = fieldStates.byId[rule.subjectFieldId];

        if (!subjectState || subjectState.suppressedBySkip) {
          break;
        }

        const subjectDate = parseIsoDate(subjectState.value);

        if (!subjectDate) {
          break;
        }

        const referenceDates = rule.referenceFieldIds
          .map((fieldId) => fieldStates.byId[fieldId])
          .filter(Boolean)
          .filter((fieldState) => fieldState.suppressedBySkip !== true)
          .map((fieldState) => parseIsoDate(fieldState.value))
          .filter(Boolean);

        if (
          referenceDates.length === 0
          || subjectDate.getTime() > Math.max(...referenceDates.map((date) => date.getTime()))
        ) {
          break;
        }

        addIssue(
          rule.subjectFieldId,
          createValidationIssue({
            ruleId: rule.id,
            severity: VALIDATION_STATES.INVALID,
            kind: 'chronology',
            message: rule.description,
            fieldId: rule.subjectFieldId,
            relatedFieldIds: rule.targetFieldIds,
          }),
        );
        break;
      }
      case 'field_value_alignment': {
        const sourceState = fieldStates.byId[rule.sourceFieldId];
        const relatedState = fieldStates.byId[rule.relatedFieldId];

        if (
          !sourceState
          || !relatedState
          || sourceState.suppressedBySkip
          || relatedState.suppressedBySkip
          || sourceState.value !== rule.sourceValue
          || relatedState.value === rule.expectedValue
        ) {
          break;
        }

        rule.targetFieldIds.forEach((fieldId) => {
          addIssue(
            fieldId,
            createValidationIssue({
              ruleId: rule.id,
              severity: VALIDATION_STATES.INVALID,
              kind: 'field_alignment',
              message: rule.description,
              fieldId,
              relatedFieldIds: rule.targetFieldIds,
            }),
          );
        });
        break;
      }
      default:
        break;
    }
  }

  return {
    byFieldId: Object.fromEntries(
      Object.entries(byFieldId).map(([fieldId, fieldIssues]) => [
        fieldId,
        dedupeValidationIssues(fieldIssues),
      ]),
    ),
    issues: dedupeValidationIssues(issues),
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

export const deriveWorkflowEscalations = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const activeRules = [];
  const unresolvedReasons = [];

  for (const rule of WORKFLOW_ESCALATION_RULES) {
    if (!matchesCondition(rule.when, state, context)) {
      continue;
    }

    activeRules.push(rule);

    const resolved = rule.releaseCondition
      ? matchesCondition(rule.releaseCondition, state, context)
      : false;

    if (!resolved) {
      unresolvedReasons.push({
        ruleId: rule.id,
        requiresSectionId: rule.requiresSectionId,
        description: rule.description,
      });
    }
  }

  return {
    activeRuleIds: activeRules.map((rule) => rule.id),
    unresolvedRuleIds: unresolvedReasons.map((reason) => reason.ruleId),
    unresolvedReasons,
    requiresFinalTeamDecision: activeRules.some(
      (rule) => rule.requiresSectionId === SECTION_IDS.S10C,
    ),
    unresolvedFinalTeamDecision: unresolvedReasons.some(
      (reason) => reason.requiresSectionId === SECTION_IDS.S10C,
    ),
    resolved: unresolvedReasons.length === 0,
  };
};

export const deriveSectionStates = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const fieldStatesBundle = context.fieldStates ?? deriveFieldStates(state, context);
  const sectionSkipMetaLookup =
    context.sectionSkipMeta
    ?? context.criterionStates?.sectionSkipMeta
    ?? buildSectionSkipMeta(state);
  const bySectionId = {};

  for (const section of QUESTIONNAIRE_SECTIONS) {
    const pageState = pageStates.bySectionId[section.id];
    const sectionSkipMeta =
      sectionSkipMetaLookup[section.id]
      ?? resolveSkipMeta(getSectionRecord(state, section.id), SKIP_POLICY.section, {
        sectionId: section.id,
      });
    const fieldStates = fieldStatesBundle.bySectionId[section.id] ?? EMPTY_ARRAY;
    const logicallyRequiredFieldStates = fieldStates.filter((fieldState) => fieldState.logicallyRequired);
    const logicalMissingFieldStates = logicallyRequiredFieldStates.filter((fieldState) => fieldState.answered === false);
    const answeredFieldCount = fieldStates.filter(
      (fieldState) => fieldState.visible && fieldState.answered,
    ).length;
    const hasConditionalMissing = logicalMissingFieldStates.some(
      (fieldState) => fieldState.baseRequiredPolicy === 'conditional',
    );
    const invalidFieldStates = fieldStates.filter((fieldState) => fieldState.invalid);
    const blockedReasons = dedupeValidationIssues(
      fieldStates
        .filter((fieldState) => fieldState.blocked)
        .flatMap((fieldState) => fieldState.issues)
        .filter((issue) => issue.severity === VALIDATION_STATES.BLOCKED)
        .map((issue) => ({
          ruleId: issue.ruleId,
          description: issue.message,
          fieldId: issue.fieldId,
        })),
    );

    let validationState = VALIDATION_STATES.CLEAR;

    let status = SECTION_STATUS.NOT_STARTED;

    if (pageState.workflowState === SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED) {
      status = SECTION_STATUS.SYSTEM_SKIPPED;
      validationState = VALIDATION_STATES.CLEAR;
    } else if (sectionSkipMeta.requested) {
      validationState = sectionSkipMeta.validationState;
      status = sectionSkipMeta.satisfied
        ? SECTION_STATUS.SKIPPED
        : SECTION_STATUS.ATTENTION_REQUIRED;
    } else if (blockedReasons.length > 0) {
      status = SECTION_STATUS.BLOCKED;
      validationState = VALIDATION_STATES.BLOCKED;
    } else if (invalidFieldStates.length > 0) {
      status = SECTION_STATUS.ATTENTION_REQUIRED;
      validationState = VALIDATION_STATES.INVALID;
    } else if (logicalMissingFieldStates.length === 0) {
      status = answeredFieldCount > 0 || logicallyRequiredFieldStates.length > 0
        ? SECTION_STATUS.COMPLETE
        : SECTION_STATUS.NOT_STARTED;
      validationState = VALIDATION_STATES.CLEAR;
    } else if (answeredFieldCount === 0) {
      status = SECTION_STATUS.NOT_STARTED;
      validationState = VALIDATION_STATES.CLEAR;
    } else if (hasConditionalMissing) {
      status = SECTION_STATUS.ATTENTION_REQUIRED;
      validationState = VALIDATION_STATES.ATTENTION;
    } else {
      status = SECTION_STATUS.IN_PROGRESS;
      validationState = VALIDATION_STATES.CLEAR;
    }

    bySectionId[section.id] = {
      sectionId: section.id,
      status,
      validationState,
      attention: validationState === VALIDATION_STATES.ATTENTION,
      invalid: validationState === VALIDATION_STATES.INVALID,
      blocked: validationState === VALIDATION_STATES.BLOCKED,
      skipRequested: sectionSkipMeta.requested,
      skipSatisfied: sectionSkipMeta.satisfied,
      skipMeta: sectionSkipMeta,
      logicallyRequiredFieldCount: logicallyRequiredFieldStates.length,
      logicalMissingFieldIds: logicalMissingFieldStates.map((fieldState) => fieldState.fieldId),
      answeredFieldCount,
      blockedReasons,
      invalidFieldIds: invalidFieldStates.map((fieldState) => fieldState.fieldId),
      attentionFieldIds: fieldStates
        .filter((fieldState) => fieldState.attention)
        .map((fieldState) => fieldState.fieldId),
    };
  }

  return { bySectionId };
};

const hasCriterionActivity = (criterionState = EMPTY_OBJECT) => {
  if (!isPlainObject(criterionState)) {
    return false;
  }

  if (
    criterionState.skipState
    && criterionState.skipState !== SKIP_STATES.NOT_STARTED
  ) {
    return true;
  }

  if (
    criterionState.status
    && criterionState.status !== SECTION_STATUS.NOT_STARTED
  ) {
    return true;
  }

  return Object.values(criterionState.values ?? EMPTY_OBJECT).some(hasMeaningfulRawValue);
};

const isResolvedProgressState = (progressState) =>
  RESOLVED_PROGRESS_STATES.has(progressState);

const getCanonicalProgressState = ({
  pageState,
  sectionState,
  applicableRequiredFieldCount,
  satisfiedRequiredFieldCount,
  hasAnyActivity,
  hasInvalidOrAttention,
  hasBlockedOrEscalated,
}) => {
  if (pageState?.workflowState === SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED) {
    return PROGRESS_STATES.SKIPPED;
  }

  if (sectionState?.skipRequested && sectionState?.skipSatisfied) {
    return PROGRESS_STATES.SKIPPED;
  }

  if (hasBlockedOrEscalated) {
    return PROGRESS_STATES.BLOCKED_ESCALATED;
  }

  if (hasInvalidOrAttention) {
    return PROGRESS_STATES.INVALID_ATTENTION;
  }

  const requirementsSatisfied = applicableRequiredFieldCount === 0
    ? hasAnyActivity
    : satisfiedRequiredFieldCount === applicableRequiredFieldCount;

  if (requirementsSatisfied) {
    return PROGRESS_STATES.COMPLETE;
  }

  if (hasAnyActivity || satisfiedRequiredFieldCount > 0) {
    return PROGRESS_STATES.IN_PROGRESS;
  }

  return PROGRESS_STATES.NOT_STARTED;
};

const summarizeProgressEntries = (entries = EMPTY_ARRAY, options = EMPTY_OBJECT) => {
  const allEntries = Array.isArray(entries) ? entries : EMPTY_ARRAY;
  const activeEntries = allEntries.filter((entry) => entry.isAccessible);
  const resolvedActiveEntries = activeEntries.filter((entry) => entry.resolved);
  const completedActiveEntries = activeEntries.filter(
    (entry) => entry.canonicalState === PROGRESS_STATES.COMPLETE,
  );
  const skippedEntries = allEntries.filter(
    (entry) => entry.canonicalState === PROGRESS_STATES.SKIPPED,
  );
  const workflowSkippedEntries = allEntries.filter((entry) => entry.skippedByWorkflow);
  const userSkippedEntries = allEntries.filter((entry) => entry.userSkipped);
  const notStartedEntries = activeEntries.filter(
    (entry) => entry.canonicalState === PROGRESS_STATES.NOT_STARTED,
  );
  const inProgressEntries = activeEntries.filter(
    (entry) => entry.canonicalState === PROGRESS_STATES.IN_PROGRESS,
  );
  const invalidAttentionEntries = activeEntries.filter(
    (entry) => entry.canonicalState === PROGRESS_STATES.INVALID_ATTENTION,
  );
  const blockedEscalatedEntries = activeEntries.filter(
    (entry) => entry.canonicalState === PROGRESS_STATES.BLOCKED_ESCALATED,
  );
  const applicableRequiredFieldCount = activeEntries.reduce(
    (count, entry) => count + entry.applicableRequiredFieldCount,
    0,
  );
  const satisfiedRequiredFieldCount = activeEntries.reduce(
    (count, entry) => count + entry.satisfiedRequiredFieldCount,
    0,
  );
  const missingRequiredFieldCount = activeEntries.reduce(
    (count, entry) => count + entry.missingRequiredFieldCount,
    0,
  );
  const completionPercent = applicableRequiredFieldCount > 0
    ? Math.round((satisfiedRequiredFieldCount / applicableRequiredFieldCount) * 100)
    : activeEntries.length === 0
      ? 100
      : resolvedActiveEntries.length === activeEntries.length
        ? 100
        : 0;
  const unresolvedEscalationCount = Number(options.unresolvedEscalationCount) || 0;

  return {
    totalSectionCount: allEntries.length,
    activeSectionCount: activeEntries.length,
    resolvedActiveSectionCount: resolvedActiveEntries.length,
    completedActiveSectionCount: completedActiveEntries.length,
    skippedSectionCount: skippedEntries.length,
    workflowSkippedSectionCount: workflowSkippedEntries.length,
    userSkippedSectionCount: userSkippedEntries.length,
    notStartedSectionCount: notStartedEntries.length,
    inProgressSectionCount: inProgressEntries.length,
    invalidAttentionSectionCount: invalidAttentionEntries.length,
    blockedEscalatedSectionCount: blockedEscalatedEntries.length,
    unresolvedEscalationCount,
    applicableRequiredFieldCount,
    satisfiedRequiredFieldCount,
    missingRequiredFieldCount,
    completionPercent,
    resolvedActiveSectionIds: resolvedActiveEntries.map((entry) => entry.sectionId),
    completedActiveSectionIds: completedActiveEntries.map((entry) => entry.sectionId),
    skippedSectionIds: skippedEntries.map((entry) => entry.sectionId),
    workflowSkippedSectionIds: workflowSkippedEntries.map((entry) => entry.sectionId),
    userSkippedSectionIds: userSkippedEntries.map((entry) => entry.sectionId),
    notStartedSectionIds: notStartedEntries.map((entry) => entry.sectionId),
    inProgressSectionIds: inProgressEntries.map((entry) => entry.sectionId),
    invalidAttentionSectionIds: invalidAttentionEntries.map((entry) => entry.sectionId),
    blockedEscalatedSectionIds: blockedEscalatedEntries.map((entry) => entry.sectionId),
  };
};

const deriveAggregateProgressState = (entries = EMPTY_ARRAY, options = EMPTY_OBJECT) => {
  const activeEntries = (Array.isArray(entries) ? entries : EMPTY_ARRAY).filter(
    (entry) => entry.isAccessible,
  );
  const unresolvedEscalationCount = Number(options.unresolvedEscalationCount) || 0;

  if (activeEntries.length === 0) {
    return PROGRESS_STATES.SKIPPED;
  }

  if (unresolvedEscalationCount > 0) {
    return PROGRESS_STATES.BLOCKED_ESCALATED;
  }

  if (
    activeEntries.some(
      (entry) => entry.canonicalState === PROGRESS_STATES.BLOCKED_ESCALATED,
    )
  ) {
    return PROGRESS_STATES.BLOCKED_ESCALATED;
  }

  if (
    activeEntries.some(
      (entry) => entry.canonicalState === PROGRESS_STATES.INVALID_ATTENTION,
    )
  ) {
    return PROGRESS_STATES.INVALID_ATTENTION;
  }

  if (
    activeEntries.every(
      (entry) => entry.canonicalState === PROGRESS_STATES.SKIPPED,
    )
  ) {
    return PROGRESS_STATES.SKIPPED;
  }

  if (activeEntries.every((entry) => entry.resolved)) {
    return PROGRESS_STATES.COMPLETE;
  }

  if (
    activeEntries.some(
      (entry) => entry.canonicalState !== PROGRESS_STATES.NOT_STARTED,
    )
  ) {
    return PROGRESS_STATES.IN_PROGRESS;
  }

  return PROGRESS_STATES.NOT_STARTED;
};

export const deriveCompletionProgress = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const criterionStatesBundle = context.criterionStates ?? deriveCriterionStates(state, pageStates);
  const derivedFieldValues = context.derivedFieldValues ?? buildDerivedFieldValues(state, {
    ...context,
    pageStates,
    criterionStates: criterionStatesBundle,
  });
  const recommendationConstraints = context.recommendationConstraints ?? deriveRecommendationConstraints(state, {
    ...context,
    pageStates,
    derivedFieldValues,
  });
  const fieldStatesBundle = context.fieldStates ?? deriveFieldStates(state, {
    ...context,
    pageStates,
    criterionStates: criterionStatesBundle,
    derivedFieldValues,
    recommendationConstraints,
  });
  const sectionStates = context.sectionStates ?? deriveSectionStates(state, {
    ...context,
    pageStates,
    fieldStates: fieldStatesBundle,
    criterionStates: criterionStatesBundle,
    recommendationConstraints,
  });
  const workflowEscalations = context.workflowEscalations ?? deriveWorkflowEscalations(state, {
    ...context,
    pageStates,
    derivedFieldValues,
  });
  const escalationReasonsBySectionId = workflowEscalations.unresolvedReasons.reduce((lookup, reason) => {
    const sectionReasons = lookup[reason.requiresSectionId] ?? [];
    sectionReasons.push(reason);
    lookup[reason.requiresSectionId] = sectionReasons;
    return lookup;
  }, {});
  const bySectionId = {};

  for (const sectionId of CANONICAL_PAGE_SEQUENCE) {
    const pageState = pageStates.bySectionId[sectionId] ?? EMPTY_OBJECT;
    const sectionState = sectionStates.bySectionId[sectionId] ?? EMPTY_OBJECT;
    const sectionDefinition = SECTION_REGISTRY_BY_ID[sectionId] ?? EMPTY_OBJECT;
    const fieldStates = fieldStatesBundle.bySectionId[sectionId] ?? EMPTY_ARRAY;
    const criterionStates = criterionStatesBundle.bySectionId[sectionId] ?? EMPTY_ARRAY;
    const applicableRequiredFieldStates = fieldStates.filter((fieldState) => fieldState.logicallyRequired);
    const satisfiedRequiredFieldStates = applicableRequiredFieldStates.filter(
      (fieldState) => fieldState.answered && !fieldState.invalid && !fieldState.blocked,
    );
    const missingRequiredFieldStates = applicableRequiredFieldStates.filter(
      (fieldState) => !fieldState.answered || fieldState.invalid || fieldState.blocked,
    );
    const attentionFieldStates = fieldStates.filter((fieldState) => fieldState.attention);
    const invalidFieldStates = fieldStates.filter((fieldState) => fieldState.invalid);
    const blockedFieldStates = fieldStates.filter((fieldState) => fieldState.blocked);
    const answeredVisibleFieldStates = fieldStates.filter(
      (fieldState) => fieldState.visible && fieldState.answered,
    );
    const criterionActivityCount = criterionStates.filter(hasCriterionActivity).length;
    const resolvedCriterionCount = criterionStates.filter((criterionState) =>
      criterionState.status === SECTION_STATUS.COMPLETE
      || criterionState.status === SECTION_STATUS.SKIPPED).length;
    const escalationReasons = escalationReasonsBySectionId[sectionId] ?? EMPTY_ARRAY;
    const skippedByWorkflow = pageState.workflowState === SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED;
    const userSkipped = Boolean(sectionState.skipRequested && sectionState.skipSatisfied);
    const hasInvalidOrAttention = Boolean(
      sectionState.attention
      || sectionState.invalid
      || attentionFieldStates.length > 0
      || invalidFieldStates.length > 0
      || criterionStates.some((criterionState) => criterionState.attention || criterionState.invalid),
    );
    const hasBlockedOrEscalated = Boolean(
      sectionState.blocked
      || blockedFieldStates.length > 0
      || criterionStates.some((criterionState) => criterionState.blocked)
      || escalationReasons.length > 0,
    );
    const hasAnyActivity = Boolean(
      sectionState.skipRequested
      || answeredVisibleFieldStates.length > 0
      || criterionActivityCount > 0,
    );
    const canonicalState = getCanonicalProgressState({
      pageState,
      sectionState,
      applicableRequiredFieldCount: applicableRequiredFieldStates.length,
      satisfiedRequiredFieldCount: satisfiedRequiredFieldStates.length,
      hasAnyActivity,
      hasInvalidOrAttention,
      hasBlockedOrEscalated,
    });
    const completionPercent = canonicalState === PROGRESS_STATES.SKIPPED
      ? 100
      : applicableRequiredFieldStates.length > 0
        ? Math.round(
            (satisfiedRequiredFieldStates.length / applicableRequiredFieldStates.length) * 100,
          )
        : canonicalState === PROGRESS_STATES.COMPLETE
          ? 100
          : 0;

    bySectionId[sectionId] = {
      sectionId,
      pageCode: sectionDefinition.pageCode ?? sectionId,
      completionGroupId: sectionDefinition.completionGroupId ?? null,
      workflowState: pageState.workflowState ?? null,
      isAccessible: pageState.isAccessible !== false,
      isEditable: pageState.isEditable === true,
      canonicalState,
      resolved: isResolvedProgressState(canonicalState),
      sectionStatus: sectionState.status ?? SECTION_STATUS.NOT_STARTED,
      validationState: sectionState.validationState ?? VALIDATION_STATES.CLEAR,
      applicableRequiredFieldCount: applicableRequiredFieldStates.length,
      satisfiedRequiredFieldCount: satisfiedRequiredFieldStates.length,
      missingRequiredFieldCount: missingRequiredFieldStates.length,
      answeredVisibleFieldCount: answeredVisibleFieldStates.length,
      visibleFieldCount: fieldStates.filter((fieldState) => fieldState.visible).length,
      criterionCount: criterionStates.length,
      criterionActivityCount,
      resolvedCriterionCount,
      attentionFieldCount: attentionFieldStates.length,
      invalidFieldCount: invalidFieldStates.length,
      blockedFieldCount: blockedFieldStates.length,
      completionPercent,
      skippedByWorkflow,
      userSkipped,
      skipSatisfied: sectionState.skipSatisfied === true,
      hasAnyActivity,
      escalationReasons,
      attentionFieldIds: attentionFieldStates.map((fieldState) => fieldState.fieldId),
      invalidFieldIds: invalidFieldStates.map((fieldState) => fieldState.fieldId),
      blockedFieldIds: blockedFieldStates.map((fieldState) => fieldState.fieldId),
    };
  }

  const byCompletionGroupId = Object.fromEntries(
    COMPLETION_GROUPS.map((group) => {
      const entries = group.sectionIds.map((sectionId) => bySectionId[sectionId]).filter(Boolean);
      const unresolvedEscalationReasons = workflowEscalations.unresolvedReasons.filter((reason) =>
        group.sectionIds.includes(reason.requiresSectionId));
      const counts = summarizeProgressEntries(entries, {
        unresolvedEscalationCount: unresolvedEscalationReasons.length,
      });

      return [
        group.id,
        {
          groupId: group.id,
          label: group.label,
          sectionIds: group.sectionIds,
          canonicalState: deriveAggregateProgressState(entries, {
            unresolvedEscalationCount: unresolvedEscalationReasons.length,
          }),
          unresolvedEscalationCount: unresolvedEscalationReasons.length,
          unresolvedEscalationReasons,
          ...counts,
        },
      ];
    }),
  );

  const overallEscalationCount = workflowEscalations.unresolvedReasons.length;
  const overallEntries = CANONICAL_PAGE_SEQUENCE.map((sectionId) => bySectionId[sectionId]);
  const overallCounts = summarizeProgressEntries(overallEntries, {
    unresolvedEscalationCount: overallEscalationCount,
  });
  const overallCanonicalState = deriveAggregateProgressState(
    overallEntries,
    {
      unresolvedEscalationCount: overallEscalationCount,
    },
  );

  return {
    bySectionId,
    byCompletionGroupId,
    overall: {
      canonicalState: overallCanonicalState,
      orderedSectionIds: CANONICAL_PAGE_SEQUENCE,
      unresolvedEscalationCount: overallEscalationCount,
      unresolvedEscalationReasons: workflowEscalations.unresolvedReasons,
      ...overallCounts,
    },
  };
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
  const completionProgress = context.completionProgress ?? deriveCompletionProgress(evaluation, context);
  const overall = completionProgress.overall;

  return {
    status: overall.canonicalState,
    completedSectionCount: overall.resolvedActiveSectionCount,
    totalSectionCount: overall.activeSectionCount,
    completedSectionIds: overall.resolvedActiveSectionIds,
    blockedSectionIds: overall.blockedEscalatedSectionIds,
    applicableRequiredFieldCount: overall.applicableRequiredFieldCount,
    satisfiedRequiredFieldCount: overall.satisfiedRequiredFieldCount,
    missingRequiredFieldCount: overall.missingRequiredFieldCount,
    completionPercent: overall.completionPercent,
  };
};

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
