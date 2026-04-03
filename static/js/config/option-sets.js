const freezeArray = (items) => Object.freeze([...items]);

const createOption = (value, label, extra = {}) => Object.freeze({ value, label, ...extra });

const createOptionSet = ({ id, label, selection, options, notes = null }) =>
  Object.freeze({
    id,
    label,
    selection,
    options: freezeArray(options),
    notes,
  });

const indexBy = (items, key = 'id') =>
  Object.freeze(Object.fromEntries(items.map((item) => [item[key], item])));

const CRITERION_CODE_OPTIONS = freezeArray([
  createOption('TR1', 'TR1'),
  createOption('TR2', 'TR2'),
  createOption('TR3', 'TR3'),
  createOption('RE1', 'RE1'),
  createOption('RE2', 'RE2'),
  createOption('RE3', 'RE3'),
  createOption('UC1', 'UC1'),
  createOption('UC2', 'UC2'),
  createOption('UC3', 'UC3'),
  createOption('UC4', 'UC4'),
  createOption('SE1', 'SE1'),
  createOption('SE2', 'SE2'),
  createOption('SE3', 'SE3'),
  createOption('SE4', 'SE4'),
  createOption('TC1', 'TC1'),
  createOption('TC2', 'TC2'),
]);

export const OPTION_SET_IDS = Object.freeze({
  SUBMISSION_TYPE: 'submission_type',
  RESPONDER_ROLE: 'responder_role',
  TOOL_CATEGORY: 'tool_category',
  DEPLOYMENT_TYPE: 'deployment_type',
  SCOPE_STATUS: 'scope_status',
  PRIMARY_USE_CASES: 'primary_use_cases',
  TARGET_USER_GROUPS: 'target_user_groups',
  ACCESS_MODEL: 'access_model',
  ACCOUNT_REQUIRED: 'account_required',
  BINARY_YES_NO: 'binary_yes_no',
  TRI_STATE_YES_NO_UNCLEAR: 'tri_state_yes_no_unclear',
  CRITERION_SCORE: 'criterion_score',
  PRINCIPLE_JUDGMENT: 'principle_judgment',
  CRITICAL_FAIL_FLAGS: 'critical_fail_flags',
  COMPLETION_CHECKLIST: 'completion_checklist',
  CONFIDENCE_LEVEL: 'confidence_level',
  RECOMMENDATION_STATUS: 'recommendation_status',
  AGREEMENT_STATUS: 'agreement_status',
  FINAL_STATUS: 'final_status',
  PUBLICATION_STATUS: 'publication_status',
  REVIEW_CYCLE_FREQUENCY: 'review_cycle_frequency',
  COMPLIANCE_CONFIDENCE: 'compliance_confidence',
  CRITERION_CODES: 'criterion_codes',
  SKIP_REASON_CODES: 'skip_reason_codes',
});

export const OPTION_SET_LIST = freezeArray([
  createOptionSet({
    id: OPTION_SET_IDS.SUBMISSION_TYPE,
    label: 'Submission type',
    selection: 'single',
    options: [
      createOption('nomination', 'Nomination'),
      createOption('primary_evaluation', 'Primary evaluation'),
      createOption('second_review', 'Second review'),
      createOption('final_team_decision', 'Final team decision'),
      createOption('re_evaluation', 'Re-evaluation'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.RESPONDER_ROLE,
    label: 'Responder role',
    selection: 'single',
    options: [
      createOption('information_specialist', 'Information specialist'),
      createOption('researcher', 'Researcher'),
      createOption('teacher', 'Teacher'),
      createOption('phd_candidate', 'PhD candidate'),
      createOption('student', 'Student'),
      createOption('it_admin', 'IT admin'),
      createOption('other', 'Other'),
    ],
    notes: 'The questionnaire specification uses academic responder roles; workflow path is modeled separately by submission type.',
  }),
  createOptionSet({
    id: OPTION_SET_IDS.TOOL_CATEGORY,
    label: 'Tool category',
    selection: 'multiple',
    options: [
      createOption('ai_search_engine', 'AI search engine'),
      createOption('ai_layer_on_existing_database', 'AI layer on existing database'),
      createOption('summarisation_assistant', 'Summarisation assistant'),
      createOption('citation_discovery', 'Citation discovery'),
      createOption('query_development', 'Query development'),
      createOption('other', 'Other'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.DEPLOYMENT_TYPE,
    label: 'Deployment type',
    selection: 'single',
    options: [
      createOption('cloud_saas', 'Cloud SaaS'),
      createOption('on_premises', 'On-premises'),
      createOption('hybrid', 'Hybrid'),
      createOption('browser_extension', 'Browser extension'),
      createOption('api_only', 'API-only'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.SCOPE_STATUS,
    label: 'In-scope check',
    selection: 'single',
    options: [
      createOption('in_scope', 'In scope'),
      createOption('out_of_scope', 'Out of scope'),
      createOption('partially_in_scope', 'Partially in scope'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.PRIMARY_USE_CASES,
    label: 'Primary use cases',
    selection: 'multiple',
    options: [
      createOption('literature_search', 'Literature search'),
      createOption('paper_discovery', 'Paper discovery'),
      createOption('citation_tracing', 'Citation tracing'),
      createOption('abstract_summarisation', 'Abstract summarisation'),
      createOption('teaching_demo', 'Teaching/demo'),
      createOption('query_development', 'Query development'),
      createOption('other', 'Other'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.TARGET_USER_GROUPS,
    label: 'Target user groups',
    selection: 'multiple',
    options: [
      createOption('students', 'Students'),
      createOption('researchers', 'Researchers'),
      createOption('phd_candidates', 'PhD candidates'),
      createOption('teachers', 'Teachers'),
      createOption('information_specialists', 'Information specialists'),
      createOption('all_ut_users', 'All UT users'),
      createOption('other', 'Other'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.ACCESS_MODEL,
    label: 'Access model',
    selection: 'single',
    options: [
      createOption('free', 'Free'),
      createOption('freemium', 'Freemium'),
      createOption('subscription', 'Subscription'),
      createOption('institutional_licence', 'Institutional licence'),
      createOption('api_key_required', 'API key required'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.ACCOUNT_REQUIRED,
    label: 'Account required',
    selection: 'single',
    options: [
      createOption('yes', 'Yes'),
      createOption('no', 'No'),
      createOption('optional', 'Optional'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.BINARY_YES_NO,
    label: 'Yes / No',
    selection: 'single',
    options: [
      createOption('yes', 'Yes'),
      createOption('no', 'No'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.TRI_STATE_YES_NO_UNCLEAR,
    label: 'Yes / No / Unclear',
    selection: 'single',
    options: [
      createOption('yes', 'Yes'),
      createOption('no', 'No'),
      createOption('unclear', 'Unclear'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.CRITERION_SCORE,
    label: 'Criterion score',
    selection: 'single',
    options: [
      createOption(0, '0 — Fails', { shortLabel: 'Fails' }),
      createOption(1, '1 — Partial / unclear', { shortLabel: 'Partial / unclear' }),
      createOption(2, '2 — Meets baseline', { shortLabel: 'Meets baseline' }),
      createOption(3, '3 — Strong', { shortLabel: 'Strong' }),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.PRINCIPLE_JUDGMENT,
    label: 'Principle judgment',
    selection: 'single',
    options: [
      createOption('pass', 'Pass'),
      createOption('conditional_pass', 'Conditional pass'),
      createOption('fail', 'Fail'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.CRITICAL_FAIL_FLAGS,
    label: 'Critical fail flags',
    selection: 'multiple',
    options: [
      createOption('fabricated_or_unverifiable_citation', 'Fabricated or unverifiable citation found'),
      createOption('materially_unfaithful_synthesis', 'Materially unfaithful synthesis found'),
      createOption('major_claim_not_traceable', 'Major claim not traceable to a primary source'),
      createOption('provenance_not_inspectable', 'Provenance path not inspectable enough for academic use'),
      createOption('privacy_terms_unclear_or_unacceptable', 'Privacy/data-use terms unclear or unacceptable'),
      createOption('serious_security_or_compliance_concern', 'Serious security/compliance concern'),
      createOption('serious_bias_without_mitigation', 'Serious bias/fairness concern without credible mitigation'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.COMPLETION_CHECKLIST,
    label: 'Completion checklist',
    selection: 'multiple',
    options: [
      createOption('all_criteria_scored_with_evidence', 'All TRUST criteria scored with evidence'),
      createOption('evidence_bundle_populated', 'Evidence folder populated with screenshots and exports'),
      createOption('repeated_query_test_complete_or_omission_documented', 'Repeated query test completed (or documented reason for omission)'),
      createOption('benchmark_complete_or_omission_documented', 'Benchmark comparison completed (or documented reason for omission)'),
      createOption('privacy_terms_reviewed', 'Privacy terms reviewed'),
      createOption('sample_queries_documented', 'Sample queries documented'),
      createOption('all_low_score_blockers_completed', 'All uncertainty/blocker fields completed for scores of 0 or 1'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.CONFIDENCE_LEVEL,
    label: 'Confidence level',
    selection: 'single',
    options: [
      createOption('high', 'High'),
      createOption('medium', 'Medium'),
      createOption('low', 'Low'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.RECOMMENDATION_STATUS,
    label: 'Recommendation status',
    selection: 'single',
    options: [
      createOption('recommended', 'Recommended'),
      createOption('recommended_with_caveats', 'Recommended with caveats'),
      createOption('needs_review_provisional', 'Needs review/provisional'),
      createOption('pilot_only', 'Pilot only'),
      createOption('not_recommended', 'Not recommended'),
      createOption('out_of_scope', 'Out of scope'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.AGREEMENT_STATUS,
    label: 'Agreement with primary evaluation',
    selection: 'single',
    options: [
      createOption('full_agreement', 'Full agreement'),
      createOption('partial_agreement', 'Partial agreement'),
      createOption('disagreement', 'Disagreement'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.FINAL_STATUS,
    label: 'Final status',
    selection: 'single',
    options: [
      createOption('approved', 'Approved'),
      createOption('approved_with_conditions', 'Approved with conditions'),
      createOption('deferred', 'Deferred'),
      createOption('rejected', 'Rejected'),
      createOption('escalated', 'Escalated'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.PUBLICATION_STATUS,
    label: 'Publication status',
    selection: 'single',
    options: [
      createOption('published_internally', 'Published internally'),
      createOption('published_externally', 'Published externally'),
      createOption('restricted', 'Restricted'),
      createOption('draft', 'Draft'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.REVIEW_CYCLE_FREQUENCY,
    label: 'Review cycle frequency',
    selection: 'single',
    options: [
      createOption('3_months', '3 months'),
      createOption('6_months', '6 months'),
      createOption('12_months', '12 months'),
      createOption('24_months', '24 months'),
      createOption('ad_hoc', 'Ad hoc (trigger-based)'),
    ],
  }),
  createOptionSet({
    id: OPTION_SET_IDS.COMPLIANCE_CONFIDENCE,
    label: 'SE compliance confidence',
    selection: 'single',
    options: [
      createOption('verified', 'Verified'),
      createOption('likely', 'Likely'),
      createOption('unclear', 'Unclear'),
      createOption('escalated', 'Escalated'),
    ],
    notes: 'This follows the canonical questionnaire wording; the HTML prototype used a different display label.',
  }),
  createOptionSet({
    id: OPTION_SET_IDS.CRITERION_CODES,
    label: 'Criterion codes',
    selection: 'multiple',
    options: CRITERION_CODE_OPTIONS,
  }),
  createOptionSet({
    id: OPTION_SET_IDS.SKIP_REASON_CODES,
    label: 'Skip reason codes',
    selection: 'single',
    options: [
      createOption('not_applicable_to_tool', 'Not applicable to tool', { availability: 'user' }),
      createOption('not_available_in_tested_tier', 'Not available in tested tier', { availability: 'user' }),
      createOption('access_blocked', 'Access blocked', { availability: 'user' }),
      createOption('insufficient_documentation', 'Insufficient documentation', { availability: 'user' }),
      createOption('test_not_performed', 'Test not performed', { availability: 'user' }),
      createOption('covered_elsewhere', 'Covered elsewhere', { availability: 'user' }),
      createOption('other', 'Other', { availability: 'user' }),
      createOption('workflow_hidden', 'Workflow hidden', { availability: 'system' }),
      createOption('out_of_scope_closeout', 'Out-of-scope closeout', { availability: 'system' }),
      createOption('inherited_from_section_skip', 'Inherited from section skip', { availability: 'system' }),
    ],
  }),
]);

export const OPTION_SETS = indexBy(OPTION_SET_LIST);

export const getOptionSet = (optionSetId) => OPTION_SETS[optionSetId] ?? null;

export const getOption = (optionSetId, optionValue) =>
  getOptionSet(optionSetId)?.options.find((option) => option.value === optionValue) ?? null;

export const getOptionLabel = (optionSetId, optionValue) =>
  getOption(optionSetId, optionValue)?.label ?? null;
