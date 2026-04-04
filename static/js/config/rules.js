import { SECTION_IDS, SECTION_WORKFLOW_STATES, WORKFLOW_MODES } from './sections.js';
import { OPTION_SET_IDS, OPTION_SETS } from './option-sets.js';
import { CRITERIA, CRITERION_FIELD_IDS, FIELD_IDS } from './questionnaire-schema.js';

import { freezeArray } from '../utils/shared.js';

const indexRulesByTarget = (rules) =>
  Object.freeze(
    rules.reduce((lookup, rule) => {
      const targetRules = lookup[rule.targetFieldId] ?? [];
      targetRules.push(rule);
      lookup[rule.targetFieldId] = targetRules;
      return lookup;
    }, {}),
  );

const createRule = ({ id, targetFieldId, when, description }) =>
  Object.freeze({ id, targetFieldId, when, description });

const createTextValidationRule = ({ id, targetFieldId, minSubstantiveLength, description }) =>
  Object.freeze({
    id,
    targetFieldId,
    minSubstantiveLength,
    description,
  });

const createCrossFieldValidationRule = ({ id, type, targetFieldIds, description, ...config }) =>
  Object.freeze({
    id,
    type,
    targetFieldIds: freezeArray(targetFieldIds),
    description,
    ...config,
  });

const createWorkflowEscalationRule = ({
  id,
  requiresSectionId,
  when,
  releaseCondition = null,
  description,
}) =>
  Object.freeze({
    id,
    requiresSectionId,
    when,
    releaseCondition,
    description,
  });

const equals = (fieldId, value) => Object.freeze({ fieldId, operator: 'equals', value });
const inValues = (fieldId, values) =>
  Object.freeze({ fieldId, operator: 'in', value: freezeArray(values) });
const hasAny = (fieldId) => Object.freeze({ fieldId, operator: 'has_any' });

export const SKIP_STATES = Object.freeze({
  NOT_STARTED: 'not_started',
  ANSWERED: 'answered',
  USER_SKIPPED: 'user_skipped',
  SYSTEM_SKIPPED: 'system_skipped',
  INHERITED_SECTION_SKIP: 'inherited_section_skip',
});

export const VALIDATION_STATES = Object.freeze({
  CLEAR: 'clear',
  ATTENTION: 'attention',
  INVALID: 'invalid',
  BLOCKED: 'blocked',
});

export const SECTION_STATUS = Object.freeze({
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete',
  ATTENTION_REQUIRED: 'attention_required',
  SKIPPED: 'skipped',
  SYSTEM_SKIPPED: 'system_skipped',
  BLOCKED: 'blocked',
});

const PRIMARY_EVALUATION_PAGE_IDS = freezeArray([
  SECTION_IDS.S0,
  SECTION_IDS.S1,
  SECTION_IDS.S2,
  SECTION_IDS.TR,
  SECTION_IDS.RE,
  SECTION_IDS.UC,
  SECTION_IDS.SE,
  SECTION_IDS.TC,
  SECTION_IDS.S8,
  SECTION_IDS.S9,
  SECTION_IDS.S10A,
]);

const REVIEW_REFERENCE_PAGE_IDS = freezeArray([
  SECTION_IDS.S0,
  SECTION_IDS.S1,
  SECTION_IDS.S2,
  SECTION_IDS.TR,
  SECTION_IDS.RE,
  SECTION_IDS.UC,
  SECTION_IDS.SE,
  SECTION_IDS.TC,
  SECTION_IDS.S8,
  SECTION_IDS.S9,
  SECTION_IDS.S10A,
]);

const FINAL_DECISION_REFERENCE_PAGE_IDS = freezeArray([
  ...REVIEW_REFERENCE_PAGE_IDS,
  SECTION_IDS.S10B,
]);

export const WORKFLOW_PAGE_RULES = Object.freeze({
  [WORKFLOW_MODES.NOMINATION]: Object.freeze({
    editableSectionIds: freezeArray([SECTION_IDS.S0, SECTION_IDS.S1]),
    readOnlySectionIds: freezeArray([]),
    systemSkippedSectionIds: freezeArray([
      SECTION_IDS.S2,
      SECTION_IDS.TR,
      SECTION_IDS.RE,
      SECTION_IDS.UC,
      SECTION_IDS.SE,
      SECTION_IDS.TC,
      SECTION_IDS.S8,
      SECTION_IDS.S9,
      SECTION_IDS.S10A,
      SECTION_IDS.S10B,
      SECTION_IDS.S10C,
    ]),
    primaryPagerSectionIds: freezeArray([SECTION_IDS.S0, SECTION_IDS.S1]),
  }),
  [WORKFLOW_MODES.PRIMARY_EVALUATION]: Object.freeze({
    editableSectionIds: PRIMARY_EVALUATION_PAGE_IDS,
    readOnlySectionIds: freezeArray([]),
    systemSkippedSectionIds: freezeArray([SECTION_IDS.S10B, SECTION_IDS.S10C]),
    primaryPagerSectionIds: PRIMARY_EVALUATION_PAGE_IDS,
  }),
  [WORKFLOW_MODES.SECOND_REVIEW]: Object.freeze({
    editableSectionIds: freezeArray([SECTION_IDS.S10B]),
    readOnlySectionIds: REVIEW_REFERENCE_PAGE_IDS,
    systemSkippedSectionIds: freezeArray([SECTION_IDS.S10C]),
    primaryPagerSectionIds: freezeArray([SECTION_IDS.S10B]),
  }),
  [WORKFLOW_MODES.FINAL_TEAM_DECISION]: Object.freeze({
    editableSectionIds: freezeArray([SECTION_IDS.S10C]),
    readOnlySectionIds: FINAL_DECISION_REFERENCE_PAGE_IDS,
    systemSkippedSectionIds: freezeArray([]),
    primaryPagerSectionIds: freezeArray([SECTION_IDS.S10C]),
  }),
  [WORKFLOW_MODES.RE_EVALUATION]: Object.freeze({
    editableSectionIds: PRIMARY_EVALUATION_PAGE_IDS,
    readOnlySectionIds: freezeArray([]),
    systemSkippedSectionIds: freezeArray([SECTION_IDS.S10B, SECTION_IDS.S10C]),
    primaryPagerSectionIds: PRIMARY_EVALUATION_PAGE_IDS,
  }),
});

export const FIELD_VISIBILITY_RULES = freezeArray([
  createRule({
    id: 'show_prior_evaluation_id',
    targetFieldId: FIELD_IDS.S0.EXISTING_EVALUATION_ID,
    when: inValues(FIELD_IDS.S0.SUBMISSION_TYPE, [
      WORKFLOW_MODES.SECOND_REVIEW,
      WORKFLOW_MODES.FINAL_TEAM_DECISION,
      WORKFLOW_MODES.RE_EVALUATION,
    ]),
    description: 'Existing evaluation ID is shown for review and re-evaluation workflows.',
  }),
  createRule({
    id: 'show_nomination_reason',
    targetFieldId: FIELD_IDS.S0.NOMINATION_REASON,
    when: equals(FIELD_IDS.S0.SUBMISSION_TYPE, WORKFLOW_MODES.NOMINATION),
    description: 'Nomination reason is shown only for nomination submissions.',
  }),
  createRule({
    id: 'show_scope_rationale',
    targetFieldId: FIELD_IDS.S1.SCOPE_RATIONALE,
    when: inValues(FIELD_IDS.S1.IN_SCOPE_CHECK, ['out_of_scope', 'partially_in_scope']),
    description: 'Scope rationale is shown when the tool is out of scope or partially in scope.',
  }),
  createRule({
    id: 'show_sign_in_method',
    targetFieldId: FIELD_IDS.S1.SIGN_IN_METHOD,
    when: equals(FIELD_IDS.S1.ACCOUNT_REQUIRED, 'yes'),
    description: 'Sign-in method is shown when an account is required.',
  }),
  createRule({
    id: 'show_repeated_query_text',
    targetFieldId: FIELD_IDS.S2.REPEATED_QUERY_TEXT,
    when: equals(FIELD_IDS.S2.REPEATED_QUERY_TEST_PERFORMED, 'yes'),
    description: 'Repeated query text is shown when the repeated query test was performed.',
  }),
  createRule({
    id: 'show_benchmark_sources',
    targetFieldId: FIELD_IDS.S2.BENCHMARK_SOURCES,
    when: equals(FIELD_IDS.S2.BENCHMARK_COMPARISON_PERFORMED, 'yes'),
    description: 'Benchmark sources are shown when a benchmark comparison was performed.',
  }),
  ...CRITERIA.map((criterion) =>
    createRule({
      id: `show_${criterion.code.toLowerCase()}_uncertainty`,
      targetFieldId: CRITERION_FIELD_IDS[criterion.code].uncertaintyOrBlockers,
      when: inValues(CRITERION_FIELD_IDS[criterion.code].score, [0, 1]),
      description: `${criterion.code} uncertainty/blocker follow-up is shown for low or unclear scores.`,
    }),
  ),
  createRule({
    id: 'show_critical_fail_notes',
    targetFieldId: FIELD_IDS.S8.CRITICAL_FAIL_NOTES,
    when: hasAny(FIELD_IDS.S8.CRITICAL_FAIL_FLAGS),
    description: 'Critical fail notes are shown when any critical fail flag is selected.',
  }),
  createRule({
    id: 'show_conditions_or_caveats',
    targetFieldId: FIELD_IDS.S9.CONDITIONS_OR_CAVEATS,
    when: inValues(FIELD_IDS.S9.RECOMMENDATION_STATUS, [
      'recommended_with_caveats',
      'needs_review_provisional',
      'pilot_only',
    ]),
    description:
      'Conditions/caveats are shown for conditional or restricted recommendation outcomes.',
  }),
  createRule({
    id: 'show_criteria_to_revisit',
    targetFieldId: FIELD_IDS.S10B.CRITERIA_TO_REVISIT,
    when: inValues(FIELD_IDS.S10B.AGREEMENT_WITH_PRIMARY_EVALUATION, [
      'partial_agreement',
      'disagreement',
    ]),
    description: 'Criteria-to-revisit is shown for partial agreement and disagreement paths.',
  }),
  createRule({
    id: 'show_conflict_summary',
    targetFieldId: FIELD_IDS.S10B.CONFLICT_SUMMARY,
    when: equals(FIELD_IDS.S10B.AGREEMENT_WITH_PRIMARY_EVALUATION, 'disagreement'),
    description: 'Conflict summary is shown for disagreements.',
  }),
]);

export const FIELD_REQUIREMENT_RULES = freezeArray([
  createRule({
    id: 'require_prior_evaluation_id',
    targetFieldId: FIELD_IDS.S0.EXISTING_EVALUATION_ID,
    when: inValues(FIELD_IDS.S0.SUBMISSION_TYPE, [
      WORKFLOW_MODES.SECOND_REVIEW,
      WORKFLOW_MODES.FINAL_TEAM_DECISION,
      WORKFLOW_MODES.RE_EVALUATION,
    ]),
    description: 'Existing evaluation ID is required for review and re-evaluation workflows.',
  }),
  createRule({
    id: 'require_nomination_reason',
    targetFieldId: FIELD_IDS.S0.NOMINATION_REASON,
    when: equals(FIELD_IDS.S0.SUBMISSION_TYPE, WORKFLOW_MODES.NOMINATION),
    description: 'Nomination reason is required for nomination submissions.',
  }),
  createRule({
    id: 'require_scope_rationale',
    targetFieldId: FIELD_IDS.S1.SCOPE_RATIONALE,
    when: inValues(FIELD_IDS.S1.IN_SCOPE_CHECK, ['out_of_scope', 'partially_in_scope']),
    description: 'Scope rationale is required when the scope check is not fully in scope.',
  }),
  createRule({
    id: 'require_sign_in_method',
    targetFieldId: FIELD_IDS.S1.SIGN_IN_METHOD,
    when: equals(FIELD_IDS.S1.ACCOUNT_REQUIRED, 'yes'),
    description: 'Sign-in method is required when an account is required.',
  }),
  createRule({
    id: 'require_repeated_query_text',
    targetFieldId: FIELD_IDS.S2.REPEATED_QUERY_TEXT,
    when: equals(FIELD_IDS.S2.REPEATED_QUERY_TEST_PERFORMED, 'yes'),
    description: 'Repeated query text is required when the repeated query test was performed.',
  }),
  createRule({
    id: 'require_benchmark_sources',
    targetFieldId: FIELD_IDS.S2.BENCHMARK_SOURCES,
    when: equals(FIELD_IDS.S2.BENCHMARK_COMPARISON_PERFORMED, 'yes'),
    description: 'Benchmark sources are required when a benchmark comparison was performed.',
  }),
  ...CRITERIA.map((criterion) =>
    createRule({
      id: `require_${criterion.code.toLowerCase()}_uncertainty`,
      targetFieldId: CRITERION_FIELD_IDS[criterion.code].uncertaintyOrBlockers,
      when: inValues(CRITERION_FIELD_IDS[criterion.code].score, [0, 1]),
      description: `${criterion.code} uncertainty/blocker follow-up is required for low or unclear scores.`,
    }),
  ),
  createRule({
    id: 'require_critical_fail_notes',
    targetFieldId: FIELD_IDS.S8.CRITICAL_FAIL_NOTES,
    when: hasAny(FIELD_IDS.S8.CRITICAL_FAIL_FLAGS),
    description: 'Critical fail notes are required when any critical fail flag is selected.',
  }),
  createRule({
    id: 'require_conditions_or_caveats',
    targetFieldId: FIELD_IDS.S9.CONDITIONS_OR_CAVEATS,
    when: inValues(FIELD_IDS.S9.RECOMMENDATION_STATUS, [
      'recommended_with_caveats',
      'needs_review_provisional',
      'pilot_only',
    ]),
    description:
      'Conditions/caveats are required for conditional or restricted recommendation outcomes.',
  }),
  createRule({
    id: 'require_criteria_to_revisit',
    targetFieldId: FIELD_IDS.S10B.CRITERIA_TO_REVISIT,
    when: inValues(FIELD_IDS.S10B.AGREEMENT_WITH_PRIMARY_EVALUATION, [
      'partial_agreement',
      'disagreement',
    ]),
    description: 'Criteria to revisit are required for partial agreement and disagreement paths.',
  }),
  createRule({
    id: 'require_conflict_summary',
    targetFieldId: FIELD_IDS.S10B.CONFLICT_SUMMARY,
    when: equals(FIELD_IDS.S10B.AGREEMENT_WITH_PRIMARY_EVALUATION, 'disagreement'),
    description:
      'Conflict summary is required when the second reviewer disagrees with the primary evaluation.',
  }),
]);

export const FIELD_VISIBILITY_RULES_BY_TARGET = indexRulesByTarget(FIELD_VISIBILITY_RULES);
export const FIELD_REQUIREMENT_RULES_BY_TARGET = indexRulesByTarget(FIELD_REQUIREMENT_RULES);

export const FIELD_TEXT_VALIDATION_RULES = freezeArray([
  createTextValidationRule({
    id: 'validate_nomination_reason_detail',
    targetFieldId: FIELD_IDS.S0.NOMINATION_REASON,
    minSubstantiveLength: 20,
    description: 'Nomination reason must contain enough detail to justify the nomination.',
  }),
  createTextValidationRule({
    id: 'validate_scope_rationale_detail',
    targetFieldId: FIELD_IDS.S1.SCOPE_RATIONALE,
    minSubstantiveLength: 20,
    description: 'Scope rationale must contain enough detail to justify the scope decision.',
  }),
  ...CRITERIA.map((criterion) =>
    createTextValidationRule({
      id: `validate_${criterion.code.toLowerCase()}_uncertainty_detail`,
      targetFieldId: CRITERION_FIELD_IDS[criterion.code].uncertaintyOrBlockers,
      minSubstantiveLength: 20,
      description: `${criterion.code} uncertainty/blocker follow-up must explain the low or unclear score in enough detail.`,
    }),
  ),
  createTextValidationRule({
    id: 'validate_critical_fail_notes_detail',
    targetFieldId: FIELD_IDS.S8.CRITICAL_FAIL_NOTES,
    minSubstantiveLength: 20,
    description: 'Critical fail notes must explain the flagged concern in enough detail.',
  }),
  createTextValidationRule({
    id: 'validate_conditions_or_caveats_detail',
    targetFieldId: FIELD_IDS.S9.CONDITIONS_OR_CAVEATS,
    minSubstantiveLength: 20,
    description: 'Conditions/caveats must explain the recommendation constraint in enough detail.',
  }),
  createTextValidationRule({
    id: 'validate_conflict_summary_detail',
    targetFieldId: FIELD_IDS.S10B.CONFLICT_SUMMARY,
    minSubstantiveLength: 20,
    description: 'Conflict summary must explain the disagreement in enough detail.',
  }),
  createTextValidationRule({
    id: 'validate_final_status_rationale_detail',
    targetFieldId: FIELD_IDS.S10C.FINAL_STATUS_RATIONALE,
    minSubstantiveLength: 20,
    description: 'Final status rationale must explain the team decision in enough detail.',
  }),
]);

export const FIELD_TEXT_VALIDATION_RULES_BY_TARGET = indexRulesByTarget(
  FIELD_TEXT_VALIDATION_RULES,
);

export const CROSS_FIELD_VALIDATION_RULES = freezeArray([
  createCrossFieldValidationRule({
    id: 'validate_second_review_after_submission',
    type: 'date_order',
    earlierFieldId: FIELD_IDS.S10A.DATE_SUBMITTED_FOR_REVIEW,
    laterFieldId: FIELD_IDS.S10B.DATE_OF_SECOND_REVIEW,
    targetFieldIds: [
      FIELD_IDS.S10A.DATE_SUBMITTED_FOR_REVIEW,
      FIELD_IDS.S10B.DATE_OF_SECOND_REVIEW,
    ],
    description: 'The second-review date must be on or after the handoff submission date.',
  }),
  createCrossFieldValidationRule({
    id: 'validate_decision_meeting_after_second_review',
    type: 'date_order',
    earlierFieldId: FIELD_IDS.S10B.DATE_OF_SECOND_REVIEW,
    laterFieldId: FIELD_IDS.S10C.DECISION_MEETING_DATE,
    targetFieldIds: [FIELD_IDS.S10B.DATE_OF_SECOND_REVIEW, FIELD_IDS.S10C.DECISION_MEETING_DATE],
    description: 'The final decision meeting date must be on or after the second-review date.',
  }),
  createCrossFieldValidationRule({
    id: 'validate_next_review_due_after_latest_milestone',
    type: 'date_after_latest_of',
    subjectFieldId: FIELD_IDS.S9.NEXT_REVIEW_DUE,
    referenceFieldIds: freezeArray([
      FIELD_IDS.S10C.DECISION_MEETING_DATE,
      FIELD_IDS.S10B.DATE_OF_SECOND_REVIEW,
      FIELD_IDS.S10A.DATE_SUBMITTED_FOR_REVIEW,
    ]),
    targetFieldIds: [
      FIELD_IDS.S9.NEXT_REVIEW_DUE,
      FIELD_IDS.S10A.DATE_SUBMITTED_FOR_REVIEW,
      FIELD_IDS.S10B.DATE_OF_SECOND_REVIEW,
      FIELD_IDS.S10C.DECISION_MEETING_DATE,
    ],
    description:
      'The next review due date must fall after the latest completed governance milestone.',
  }),
  createCrossFieldValidationRule({
    id: 'validate_out_of_scope_recommendation_alignment',
    type: 'field_value_alignment',
    sourceFieldId: FIELD_IDS.S9.RECOMMENDATION_STATUS,
    sourceValue: 'out_of_scope',
    relatedFieldId: FIELD_IDS.S1.IN_SCOPE_CHECK,
    expectedValue: 'out_of_scope',
    targetFieldIds: [FIELD_IDS.S9.RECOMMENDATION_STATUS, FIELD_IDS.S1.IN_SCOPE_CHECK],
    description: 'Selecting “Out of scope” requires the scope check to also be “Out of scope”.',
  }),
]);

const USER_SKIP_REASON_CODES = freezeArray(
  (OPTION_SETS[OPTION_SET_IDS.SKIP_REASON_CODES]?.options ?? [])
    .filter((option) => option.availability !== 'system')
    .map((option) => option.value),
);

const SYSTEM_SKIP_REASON_CODES = freezeArray(
  (OPTION_SETS[OPTION_SET_IDS.SKIP_REASON_CODES]?.options ?? [])
    .filter((option) => option.availability === 'system')
    .map((option) => option.value),
);

export const SKIP_POLICY = Object.freeze({
  section: Object.freeze({
    scope: 'section',
    allowUserSkip: true,
    requiresReasonCode: true,
    requiresRationale: true,
    rationaleMinLength: 20,
    reasonCodeKeys: freezeArray(['sectionSkipReasonCode', 'section_skip_reason_code']),
    rationaleKeys: freezeArray(['sectionSkipRationale', 'section_skip_rationale']),
    userReasonCodes: USER_SKIP_REASON_CODES,
    systemReasonCodes: SYSTEM_SKIP_REASON_CODES,
    inheritedCriterionSkipState: SKIP_STATES.INHERITED_SECTION_SKIP,
  }),
  criterion: Object.freeze({
    scope: 'criterion',
    allowUserSkip: true,
    requiresReasonCode: true,
    requiresRationale: true,
    rationaleMinLength: 20,
    reasonCodeKeys: freezeArray([
      'skipReasonCode',
      'skip_reason_code',
      'criterionSkipReasonCode',
      'criterion_skip_reason_code',
    ]),
    rationaleKeys: freezeArray([
      'skipRationale',
      'skip_rationale',
      'criterionSkipRationale',
      'criterion_skip_rationale',
    ]),
    userReasonCodes: USER_SKIP_REASON_CODES,
    systemReasonCodes: SYSTEM_SKIP_REASON_CODES,
    inheritedFieldSkipState: SKIP_STATES.INHERITED_SECTION_SKIP,
  }),
});

export const PRINCIPLE_JUDGMENT_RULES = Object.freeze({
  severityOrder: freezeArray(['pass', 'conditional_pass', 'fail']),
  defaultRules: freezeArray([
    Object.freeze({
      id: 'principle_fail_on_zero',
      result: 'fail',
      description: 'Any criterion score of 0 yields a Fail judgment.',
    }),
    Object.freeze({
      id: 'principle_conditional_on_one',
      result: 'conditional_pass',
      description:
        'One or more criterion scores of 1, with no 0 scores, yields a Conditional pass judgment.',
    }),
    Object.freeze({
      id: 'principle_pass_on_all_two_or_above',
      result: 'pass',
      description: 'All criterion scores of 2 or above yield a Pass judgment.',
    }),
  ]),
  overridePolicy: Object.freeze({
    allowDownwardOverride: true,
    allowUpwardOverride: false,
    rationaleRequired: true,
  }),
});

export const RECOMMENDATION_VALUE_ORDER = freezeArray([
  'recommended',
  'recommended_with_caveats',
  'needs_review_provisional',
  'pilot_only',
  'not_recommended',
  'out_of_scope',
]);

export const POSITIVE_RECOMMENDATION_VALUES = freezeArray([
  'recommended',
  'recommended_with_caveats',
]);

export const CONDITIONAL_RECOMMENDATION_VALUES = freezeArray([
  'recommended_with_caveats',
  'needs_review_provisional',
  'pilot_only',
]);

export const RECOMMENDATION_CONSTRAINT_RULES = freezeArray([
  Object.freeze({
    id: 'recommendation_out_of_scope_lock',
    when: equals(FIELD_IDS.S1.IN_SCOPE_CHECK, 'out_of_scope'),
    allowedValues: freezeArray(['out_of_scope']),
    blockedValues: freezeArray([
      'recommended',
      'recommended_with_caveats',
      'needs_review_provisional',
      'pilot_only',
      'not_recommended',
    ]),
    description: 'Out-of-scope tools can only resolve to the Out of scope recommendation.',
  }),
  Object.freeze({
    id: 'recommendation_positive_lock_on_critical_fail',
    when: hasAny(FIELD_IDS.S8.CRITICAL_FAIL_FLAGS),
    blockedValues: POSITIVE_RECOMMENDATION_VALUES,
    releaseCondition: { fieldId: FIELD_IDS.S10C.FINAL_STATUS, operator: 'not_empty' },
    description:
      'Positive recommendations stay locked until final team decision records a reviewed outcome when critical fail flags are present.',
  }),
  Object.freeze({
    id: 'recommendation_positive_lock_on_disagreement',
    when: equals(FIELD_IDS.S10B.AGREEMENT_WITH_PRIMARY_EVALUATION, 'disagreement'),
    blockedValues: POSITIVE_RECOMMENDATION_VALUES,
    releaseCondition: { fieldId: FIELD_IDS.S10C.FINAL_STATUS, operator: 'not_empty' },
    description:
      'Positive recommendations stay locked until final team decision resolves reviewer disagreement.',
  }),
]);

export const WORKFLOW_ESCALATION_RULES = freezeArray([
  createWorkflowEscalationRule({
    id: 'escalate_critical_fail_to_final_decision',
    requiresSectionId: SECTION_IDS.S10C,
    when: hasAny(FIELD_IDS.S8.CRITICAL_FAIL_FLAGS),
    releaseCondition: { fieldId: FIELD_IDS.S10C.FINAL_STATUS, operator: 'not_empty' },
    description: 'Critical fail flags require a recorded final team decision before closure.',
  }),
  createWorkflowEscalationRule({
    id: 'escalate_disagreement_to_final_decision',
    requiresSectionId: SECTION_IDS.S10C,
    when: equals(FIELD_IDS.S10B.AGREEMENT_WITH_PRIMARY_EVALUATION, 'disagreement'),
    releaseCondition: { fieldId: FIELD_IDS.S10C.FINAL_STATUS, operator: 'not_empty' },
    description: 'Reviewer disagreement requires a recorded final team decision before closure.',
  }),
]);

export const COMPLETION_CHECK_RULES = freezeArray([
  Object.freeze({
    id: 'completion_all_criteria_scored_with_evidence',
    value: 'all_criteria_scored_with_evidence',
    label: 'All TRUST criteria scored with evidence',
    description: 'Every active criterion has a score, evidence summary, and evidence links.',
  }),
  Object.freeze({
    id: 'completion_evidence_bundle_populated',
    value: 'evidence_bundle_populated',
    label: 'Evidence folder populated with screenshots and exports',
    description: 'Evaluation-level evidence storage is linked or evidence items are present.',
  }),
  Object.freeze({
    id: 'completion_repeated_query_complete_or_documented',
    value: 'repeated_query_test_complete_or_omission_documented',
    label: 'Repeated query test completed (or documented reason for omission)',
    description:
      'Repeated-query execution is complete or the omission is explicitly recorded by the controlling field.',
  }),
  Object.freeze({
    id: 'completion_benchmark_complete_or_documented',
    value: 'benchmark_complete_or_omission_documented',
    label: 'Benchmark comparison completed (or documented reason for omission)',
    description:
      'Benchmark comparison is complete or the omission is explicitly recorded by the controlling field.',
  }),
  Object.freeze({
    id: 'completion_privacy_terms_reviewed',
    value: 'privacy_terms_reviewed',
    label: 'Privacy terms reviewed',
    description: 'The Secure privacy-related criteria have been completed with evidence.',
  }),
  Object.freeze({
    id: 'completion_sample_queries_documented',
    value: 'sample_queries_documented',
    label: 'Sample queries documented',
    description: 'Sample queries or scenarios are present in the evaluation setup.',
  }),
  Object.freeze({
    id: 'completion_all_low_score_blockers_completed',
    value: 'all_low_score_blockers_completed',
    label: 'All uncertainty/blocker fields completed for scores of 0 or 1',
    description:
      'Every low or unclear criterion score has the required uncertainty/blocker follow-up text.',
  }),
]);

export const EVIDENCE_COMPLETENESS_RULES = freezeArray([
  Object.freeze({
    id: 'evidence_evaluation_folder_required',
    scope: 'evaluation',
    fieldId: FIELD_IDS.S2.EVIDENCE_FOLDER_LINK,
    description:
      'Primary evaluation and re-evaluation paths require an evaluation-level evidence folder reference.',
  }),
  Object.freeze({
    id: 'evidence_criterion_payload_required',
    scope: 'criterion',
    fieldKeys: freezeArray(['evidenceSummary', 'evidenceLinks']),
    description:
      'Every answered criterion must carry both an evidence summary and at least one evidence link.',
  }),
  Object.freeze({
    id: 'evidence_criterion_association_note_hook',
    scope: 'future_attachment',
    statePath: 'evidence.criteria[*].note',
    description: 'Future criterion-level evidence associations must include note metadata.',
  }),
  Object.freeze({
    id: 'evidence_evaluation_item_note_hook',
    scope: 'future_attachment',
    statePath: 'evidence.evaluation[*].note',
    description: 'Future evaluation-level evidence items must include note metadata.',
  }),
]);

export const GOVERNANCE_RULES = Object.freeze({
  secondReviewEditableSectionId: SECTION_IDS.S10B,
  finalTeamDecisionEditableSectionId: SECTION_IDS.S10C,
  secondReviewReferenceSectionIds: REVIEW_REFERENCE_PAGE_IDS,
  finalDecisionReferenceSectionIds: FINAL_DECISION_REFERENCE_PAGE_IDS,
});
