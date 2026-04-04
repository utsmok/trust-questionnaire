import {
  CRITERIA,
  CRITERION_FIELD_IDS,
  FIELD_IDS,
  FIELD_TYPES,
  QUESTIONNAIRE_FIELDS_BY_ID,
  QUESTIONNAIRE_SECTIONS,
} from '../../config/questionnaire-schema.js';
import {
  COMPLETION_CHECK_RULES,
  FIELD_TEXT_VALIDATION_RULES_BY_TARGET,
  PRINCIPLE_JUDGMENT_RULES,
  SKIP_POLICY,
  SKIP_STATES,
  VALIDATION_STATES,
  WORKFLOW_PAGE_RULES,
} from '../../config/rules.js';
import {
  SECTION_IDS,
  WORKFLOW_MODES,
} from '../../config/sections.js';
import { EMPTY_ARRAY, isPlainObject, normalizeDelimitedList } from '../../utils/shared.js';

export const EMPTY_OBJECT = Object.freeze({});

export const PRINCIPLE_JUDGMENT_FIELD_IDS = Object.freeze({
  [SECTION_IDS.TR]: FIELD_IDS.TR.PRINCIPLE_JUDGMENT,
  [SECTION_IDS.RE]: FIELD_IDS.RE.PRINCIPLE_JUDGMENT,
  [SECTION_IDS.UC]: FIELD_IDS.UC.PRINCIPLE_JUDGMENT,
  [SECTION_IDS.SE]: FIELD_IDS.SE.PRINCIPLE_JUDGMENT,
  [SECTION_IDS.TC]: FIELD_IDS.TC.PRINCIPLE_JUDGMENT,
});

export const normalizeState = (evaluation = EMPTY_OBJECT) => ({
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

export const getFieldValue = (state, fieldId) => state.fields[fieldId];

export const getSectionRecord = (state, sectionId) => state.sections[sectionId] ?? EMPTY_OBJECT;

export const getCriterionRecord = (state, criterionCode) => state.criteria[criterionCode] ?? EMPTY_OBJECT;

export const normalizeUrlList = (value) => normalizeDelimitedList(value, /\n+/);

export const countSubstantiveCharacters = (value) =>
  (typeof value === 'string' ? value.replace(/\s+/g, '') : '').length;

export const normalizeUrlCandidate = (value) =>
  typeof value === 'string' ? value.trim() : '';

export const isValidAbsoluteUrl = (value) => {
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

export const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const parseIsoDate = (value) => {
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

export const createValidationIssue = ({
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

export const dedupeValidationIssues = (issues = EMPTY_ARRAY) => {
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

export const getValidationStateFromIssues = (issues = EMPTY_ARRAY) => {
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

export const mapBlockedReasonsToIssues = (reasons = EMPTY_ARRAY, fieldId) => {
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

export const getRecordValue = (record, keys = EMPTY_ARRAY) => {
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

export const hasMeaningfulText = (value) => typeof value === 'string' && value.trim().length > 0;

export const hasMeaningfulRawValue = (value) => {
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

export const isPersonValuePresent = (value) => {
  if (hasMeaningfulText(value)) {
    return true;
  }

  if (!isPlainObject(value)) {
    return false;
  }

  return Boolean(value.id || value.email || value.name || value.displayName);
};

export const hasEvidenceNote = (item) =>
  isPlainObject(item) && (hasMeaningfulText(item.note) || hasMeaningfulText(item.notes));

export const getSkipStateFromRecord = (record) => {
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

export const isUserSkippedRecord = (record) => getSkipStateFromRecord(record) === SKIP_STATES.USER_SKIPPED;

export const resolveSkipMeta = (record, policy, { sectionId = null, criterionCode = null } = EMPTY_OBJECT) => {
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

export const buildSectionSkipMeta = (state) =>
  Object.fromEntries(
    QUESTIONNAIRE_SECTIONS.map((section) => [
      section.id,
      resolveSkipMeta(getSectionRecord(state, section.id), SKIP_POLICY.section, {
        sectionId: section.id,
      }),
    ]),
  );

export const buildCriterionSkipMeta = (state) =>
  Object.fromEntries(
    CRITERIA.map((criterion) => [
      criterion.code,
      resolveSkipMeta(getCriterionRecord(state, criterion.code), SKIP_POLICY.criterion, {
        sectionId: criterion.sectionId,
        criterionCode: criterion.code,
      }),
    ]),
  );

export const getDuplicateEntries = (values) => {
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

export const getRulesForField = (fieldId, ruleLookup) => ruleLookup[fieldId] ?? EMPTY_ARRAY;

export const getFieldTextValidationIssues = (field, value) => {
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

export const getTypedFieldValidationIssues = (field, value) => {
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

export const toNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const getSeverityRank = (judgment) => PRINCIPLE_JUDGMENT_RULES.severityOrder.indexOf(judgment);

export const isDownwardOverride = (computedValue, overrideValue) => {
  const computedRank = getSeverityRank(computedValue);
  const overrideRank = getSeverityRank(overrideValue);

  return computedRank !== -1 && overrideRank !== -1 && overrideRank >= computedRank;
};

export const resolveDerivedFieldValue = (fieldId, derivedFieldValues) => derivedFieldValues[fieldId];

export const isFieldValuePresent = (field, value) => {
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
      return hasMeaningfulText(value);
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

export const getWorkflowMode = (state) =>
  getFieldValue(state, FIELD_IDS.S0.SUBMISSION_TYPE) ?? state.workflow.mode ?? WORKFLOW_MODES.NOMINATION;

export const getWorkflowPageRule = (workflowMode) =>
  WORKFLOW_PAGE_RULES[workflowMode] ?? WORKFLOW_PAGE_RULES[WORKFLOW_MODES.NOMINATION];

export const mergeFieldStateValidationIssues = (fieldState, extraIssues = EMPTY_ARRAY) => {
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
