import { OPTION_SET_IDS } from './option-sets.js';
import { SECTION_IDS, SECTION_REGISTRY_BY_ID } from './sections.js';

import { freezeArray } from '../utils/shared.js';

const indexBy = (items, key = 'id') =>
  Object.freeze(Object.fromEntries(items.map((item) => [item[key], item])));

const assertInvariant = (condition, message) => {
  if (!condition) {
    throw new Error(`[questionnaire-schema] ${message}`);
  }
};

export const FIELD_TYPES = Object.freeze({
  SINGLE_SELECT: 'single_select',
  MULTI_SELECT: 'multi_select',
  SHORT_TEXT: 'short_text',
  LONG_TEXT: 'long_text',
  URL: 'url',
  URL_LIST: 'url_list',
  DATE: 'date',
  DATE_RANGE: 'date_range',
  NUMBER: 'number',
  PERCENT: 'percent',
  PERSON: 'person',
  PEOPLE_LIST: 'people_list',
  CHECKLIST: 'checklist',
});

const createField = ({
  id,
  code,
  sectionId,
  label,
  type,
  control = type,
  optionSetId = null,
  requiredPolicy = 'always',
  criterionCode = null,
  derived = false,
  overridePolicy = 'none',
  explicitNoneAllowed = false,
  supportsCustomValue = false,
  notes = null,
  tooltip = null,
}) =>
  Object.freeze({
    id,
    code,
    sectionId,
    label,
    type,
    control,
    optionSetId,
    requiredPolicy,
    criterionCode,
    derived,
    overridePolicy,
    explicitNoneAllowed,
    supportsCustomValue,
    notes,
    tooltip,
  });

const createSectionSchema = ({ sectionId, fields, criterionCodes = [] }) => {
  const sectionDefinition = SECTION_REGISTRY_BY_ID[sectionId];

  return Object.freeze({
    id: sectionId,
    sectionCode: sectionDefinition.sectionCode,
    pageCode: sectionDefinition.pageCode,
    title: sectionDefinition.title,
    pagerOrder: sectionDefinition.pagerOrder,
    completionGroupId: sectionDefinition.completionGroupId,
    criterionCodes: freezeArray(criterionCodes),
    fieldIds: freezeArray(fields.map((field) => field.id)),
  });
};

const createCriterionFieldIds = (criterionCode) => {
  const prefix = criterionCode.toLowerCase();

  return Object.freeze({
    score: `${prefix}.score`,
    evidenceSummary: `${prefix}.evidenceSummary`,
    evidenceLinks: `${prefix}.evidenceLinks`,
    uncertaintyOrBlockers: `${prefix}.uncertaintyOrBlockers`,
  });
};

export const FIELD_IDS = Object.freeze({
  S0: Object.freeze({
    SUBMISSION_TYPE: 's0.submissionType',
    TOOL_NAME: 's0.toolName',
    TOOL_URL: 's0.toolUrl',
    EXISTING_EVALUATION_ID: 's0.existingEvaluationId',
    RESPONDER_ROLE: 's0.responderRole',
    NOMINATION_REASON: 's0.nominationReason',
    REVIEWER_NAME: 's0.reviewerName',
    REVIEWER_EMAIL: 's0.reviewerEmail',
    REVIEWER_AFFILIATION: 's0.reviewerAffiliation',
    REVIEW_DATE: 's0.reviewDate',
  }),
  S1: Object.freeze({
    VENDOR: 's1.vendor',
    CATEGORY: 's1.category',
    DEPLOYMENT_TYPE: 's1.deploymentType',
    IN_SCOPE_CHECK: 's1.inScopeCheck',
    SCOPE_RATIONALE: 's1.scopeRationale',
    PRIMARY_USE_CASES: 's1.primaryUseCases',
    TARGET_USER_GROUPS: 's1.targetUserGroups',
    ACCESS_MODEL: 's1.accessModel',
    ACCOUNT_REQUIRED: 's1.accountRequired',
    SIGN_IN_METHOD: 's1.signInMethod',
  }),
  S2: Object.freeze({
    TESTING_DATES: 's2.testingDates',
    PRICING_TIER_TESTED: 's2.pricingTierTested',
    HANDS_ON_ACCESS_CONFIRMED: 's2.handsOnAccessConfirmed',
    SAMPLE_QUERIES_OR_SCENARIOS: 's2.sampleQueriesOrScenarios',
    REPEATED_QUERY_TEST_PERFORMED: 's2.repeatedQueryTestPerformed',
    REPEATED_QUERY_TEXT: 's2.repeatedQueryText',
    BENCHMARK_COMPARISON_PERFORMED: 's2.benchmarkComparisonPerformed',
    BENCHMARK_SOURCES: 's2.benchmarkSources',
    SENSITIVE_DATA_ENTERED: 's2.sensitiveDataEntered',
    EVIDENCE_FOLDER_LINK: 's2.evidenceFolderLink',
  }),
  TR: Object.freeze({
    PRINCIPLE_SUMMARY: 'tr.principleSummary',
    PRINCIPLE_JUDGMENT: 'tr.principleJudgment',
  }),
  RE: Object.freeze({
    TEST_METHOD_DESCRIPTION: 're.testMethodDescription',
    CLAIMS_MANUALLY_CHECKED_COUNT: 're.claimsManuallyCheckedCount',
    PRINCIPLE_SUMMARY: 're.principleSummary',
    PRINCIPLE_JUDGMENT: 're.principleJudgment',
  }),
  UC: Object.freeze({
    TARGET_USER_PERSONAS: 'uc.targetUserPersonas',
    WORKFLOW_INTEGRATIONS_OBSERVED: 'uc.workflowIntegrationsObserved',
    PRINCIPLE_SUMMARY: 'uc.principleSummary',
    PRINCIPLE_JUDGMENT: 'uc.principleJudgment',
  }),
  SE: Object.freeze({
    DPIA_PRIVACY_ESCALATION_REQUIRED: 'se.dpiaPrivacyEscalationRequired',
    COPYRIGHT_LICENSING_CONCERN: 'se.copyrightLicensingConcern',
    COMPLIANCE_CONFIDENCE: 'se.complianceConfidence',
    PRINCIPLE_SUMMARY: 'se.principleSummary',
    PRINCIPLE_JUDGMENT: 'se.principleJudgment',
  }),
  TC: Object.freeze({
    CLAIMS_TRACEABLE_PERCENTAGE: 'tc.claimsTraceablePercentage',
    PRINCIPLE_SUMMARY: 'tc.principleSummary',
    PRINCIPLE_JUDGMENT: 'tc.principleJudgment',
  }),
  S8: Object.freeze({
    CRITICAL_FAIL_FLAGS: 's8.criticalFailFlags',
    CRITICAL_FAIL_NOTES: 's8.criticalFailNotes',
    COMPLETION_CHECKLIST: 's8.completionChecklist',
    OVERALL_REVIEW_CONFIDENCE: 's8.overallReviewConfidence',
  }),
  S9: Object.freeze({
    RECOMMENDATION_STATUS: 's9.recommendationStatus',
    CONCLUSION_SUMMARY: 's9.conclusionSummary',
    CONDITIONS_OR_CAVEATS: 's9.conditionsOrCaveats',
    SUITABLE_USE_CASES: 's9.suitableUseCases',
    UNSUITABLE_HIGH_RISK_USE_CASES: 's9.unsuitableHighRiskUseCases',
    PUBLIC_FACING_SUMMARY_DRAFT: 's9.publicFacingSummaryDraft',
    NEXT_REVIEW_DUE: 's9.nextReviewDue',
  }),
  S10A: Object.freeze({
    PRIMARY_EVALUATOR: 's10a.primaryEvaluator',
    DATE_SUBMITTED_FOR_REVIEW: 's10a.dateSubmittedForReview',
    KEY_CONCERNS_FOR_SECOND_REVIEWER: 's10a.keyConcernsForSecondReviewer',
    AREAS_OF_UNCERTAINTY: 's10a.areasOfUncertainty',
  }),
  S10B: Object.freeze({
    SECOND_REVIEWER: 's10b.secondReviewer',
    DATE_OF_SECOND_REVIEW: 's10b.dateOfSecondReview',
    AGREEMENT_WITH_PRIMARY_EVALUATION: 's10b.agreementWithPrimaryEvaluation',
    CRITERIA_TO_REVISIT: 's10b.criteriaToRevisit',
    SECOND_REVIEWER_RECOMMENDATION: 's10b.secondReviewerRecommendation',
    CONFLICT_SUMMARY: 's10b.conflictSummary',
  }),
  S10C: Object.freeze({
    DECISION_MEETING_DATE: 's10c.decisionMeetingDate',
    MEETING_PARTICIPANTS: 's10c.meetingParticipants',
    FINAL_STATUS: 's10c.finalStatus',
    FINAL_STATUS_RATIONALE: 's10c.finalStatusRationale',
    PUBLICATION_STATUS: 's10c.publicationStatus',
    REVIEW_CYCLE_FREQUENCY: 's10c.reviewCycleFrequency',
  }),
});

const CRITERION_BLUEPRINTS = freezeArray([
  Object.freeze({
    sectionId: SECTION_IDS.TR,
    code: 'TR1',
    orderWithinSection: 0,
    title: 'Source documentation',
    statement:
      'The tool provides clear documentation on its primary data sources and the scope of its indexed content.',
  }),
  Object.freeze({
    sectionId: SECTION_IDS.TR,
    code: 'TR2',
    orderWithinSection: 1,
    title: 'Methodology documentation',
    statement:
      "The tool's methodology is explicitly documented, including the model family/version used, the retrieval/generation architecture, the corpus or source base used to answer queries, how many or what type of sources inform an answer, and whether users can inspect source-selection or provenance information.",
  }),
  Object.freeze({
    sectionId: SECTION_IDS.TR,
    code: 'TR3',
    orderWithinSection: 2,
    title: 'Limitation acknowledgement',
    statement:
      'The tool openly acknowledges its known limitations, indexing gaps, and update frequency.',
  }),
  Object.freeze({
    sectionId: SECTION_IDS.RE,
    code: 'RE1',
    orderWithinSection: 0,
    title: 'Factual accuracy',
    statement:
      'The tool generates factually accurate and verifiable outputs, with robust mechanisms to minimize or eliminate hallucinated citations.',
  }),
  Object.freeze({
    sectionId: SECTION_IDS.RE,
    code: 'RE2',
    orderWithinSection: 1,
    title: 'Consistency of consensus',
    statement:
      'When identical queries are repeated, the tool shows consistency of consensus: core conclusions remain substantively aligned even if wording or source order varies.',
  }),
  Object.freeze({
    sectionId: SECTION_IDS.RE,
    code: 'RE3',
    orderWithinSection: 2,
    title: 'Faithful synthesis',
    statement:
      'When the tool synthesizes information, the synthesis remains faithful to retrieved source material and does not introduce unsupported or materially misleading claims.',
  }),
  Object.freeze({
    sectionId: SECTION_IDS.UC,
    code: 'UC1',
    orderWithinSection: 0,
    title: 'Fitness for purpose',
    statement:
      'The tool is fit for its intended purpose and aligns with the research and educational needs of the University of Twente community.',
  }),
  Object.freeze({
    sectionId: SECTION_IDS.UC,
    code: 'UC2',
    orderWithinSection: 1,
    title: 'Workflow integration',
    statement:
      'The tool integrates with standard academic workflows through useful export options, citation workflows, or reference-manager compatibility.',
  }),
  Object.freeze({
    sectionId: SECTION_IDS.UC,
    code: 'UC3',
    orderWithinSection: 2,
    title: 'Usability and accessibility',
    statement:
      'The tool is usable and accessible for its intended audience without prohibitive technical expertise.',
  }),
  Object.freeze({
    sectionId: SECTION_IDS.UC,
    code: 'UC4',
    orderWithinSection: 3,
    title: 'AI transparency to users',
    statement:
      'The interface clearly communicates that it is AI-assisted, surfaces uncertainty or limitation cues where appropriate, and actively prompts users to verify source material rather than relying on the answer alone.',
  }),
  Object.freeze({
    sectionId: SECTION_IDS.SE,
    code: 'SE1',
    orderWithinSection: 0,
    title: 'Data protection by design',
    statement:
      'The tool follows data-protection-by-design and by-default principles in a way that is acceptable under GDPR-oriented review.',
  }),
  Object.freeze({
    sectionId: SECTION_IDS.SE,
    code: 'SE2',
    orderWithinSection: 1,
    title: 'Data use transparency and user control',
    statement:
      'Users are clearly informed how their data, including prompts/queries, is used, stored, retained, and whether it may be used for model improvement or analytics; users have meaningful control where applicable.',
  }),
  Object.freeze({
    sectionId: SECTION_IDS.SE,
    code: 'SE3',
    orderWithinSection: 2,
    title: 'Security posture',
    statement:
      "The tool's security posture is transparent and does not conflict with relevant institutional, national, or sector guidance.",
  }),
  Object.freeze({
    sectionId: SECTION_IDS.SE,
    code: 'SE4',
    orderWithinSection: 3,
    title: 'Bias and fairness',
    statement:
      'The tool documents major disciplinary, geographic, language, or algorithmic bias risks and provides evidence of any mitigation measures or safeguards in place.',
  }),
  Object.freeze({
    sectionId: SECTION_IDS.TC,
    code: 'TC1',
    orderWithinSection: 0,
    title: 'Source attribution',
    statement:
      'The tool provides clear, accurate, and persistent attribution for the sources used to generate an answer; where available, it also surfaces helpful source-quality cues such as publication type, peer-review status, or retraction notices.',
  }),
  Object.freeze({
    sectionId: SECTION_IDS.TC,
    code: 'TC2',
    orderWithinSection: 1,
    title: 'Provenance inspection',
    statement:
      'The tool allows users and reviewers to inspect the provenance of an answer by showing which sources were selected and how retrieved evidence is distinguished from generated synthesis.',
  }),
]);

export const CRITERION_FIELD_IDS = Object.freeze(
  Object.fromEntries(
    CRITERION_BLUEPRINTS.map((criterion) => [
      criterion.code,
      createCriterionFieldIds(criterion.code),
    ]),
  ),
);

const createCriterionFields = (criterion) => {
  const fieldIds = CRITERION_FIELD_IDS[criterion.code];

  return [
    createField({
      id: fieldIds.score,
      code: `${criterion.code} Score`,
      sectionId: criterion.sectionId,
      criterionCode: criterion.code,
      label: `${criterion.code} Score`,
      type: FIELD_TYPES.SINGLE_SELECT,
      control: 'radio_group',
      optionSetId: OPTION_SET_IDS.CRITERION_SCORE,
      tooltip: '0 = Fails, 1 = Partial/unclear, 2 = Meets baseline, 3 = Strong',
    }),
    createField({
      id: fieldIds.evidenceSummary,
      code: `${criterion.code} Evidence summary`,
      sectionId: criterion.sectionId,
      criterionCode: criterion.code,
      label: `${criterion.code} Evidence summary`,
      type: FIELD_TYPES.LONG_TEXT,
      control: 'textarea',
    }),
    createField({
      id: fieldIds.evidenceLinks,
      code: `${criterion.code} Evidence links`,
      sectionId: criterion.sectionId,
      criterionCode: criterion.code,
      label: `${criterion.code} Evidence links`,
      type: FIELD_TYPES.URL_LIST,
      control: 'url_list',
    }),
    createField({
      id: fieldIds.uncertaintyOrBlockers,
      code: `${criterion.code} Uncertainty or blockers`,
      sectionId: criterion.sectionId,
      criterionCode: criterion.code,
      label: `${criterion.code} Uncertainty or blockers`,
      type: FIELD_TYPES.LONG_TEXT,
      control: 'textarea',
      requiredPolicy: 'conditional',
    }),
  ];
};

const S0_FIELDS = freezeArray([
  createField({
    id: FIELD_IDS.S0.SUBMISSION_TYPE,
    code: '0.1',
    sectionId: SECTION_IDS.S0,
    label: 'Submission type',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.SUBMISSION_TYPE,
  }),
  createField({
    id: FIELD_IDS.S0.TOOL_NAME,
    code: '0.2',
    sectionId: SECTION_IDS.S0,
    label: 'Tool name',
    type: FIELD_TYPES.SHORT_TEXT,
    control: 'text_input',
  }),
  createField({
    id: FIELD_IDS.S0.TOOL_URL,
    code: '0.3',
    sectionId: SECTION_IDS.S0,
    label: 'Tool URL',
    type: FIELD_TYPES.URL,
    control: 'url_input',
  }),
  createField({
    id: FIELD_IDS.S0.EXISTING_EVALUATION_ID,
    code: '0.4',
    sectionId: SECTION_IDS.S0,
    label: 'Existing evaluation ID',
    type: FIELD_TYPES.SHORT_TEXT,
    control: 'text_input',
    requiredPolicy: 'conditional',
  }),
  createField({
    id: FIELD_IDS.S0.RESPONDER_ROLE,
    code: '0.5',
    sectionId: SECTION_IDS.S0,
    label: 'Responder role',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.RESPONDER_ROLE,
  }),
  createField({
    id: FIELD_IDS.S0.NOMINATION_REASON,
    code: '0.6',
    sectionId: SECTION_IDS.S0,
    label: 'Nomination reason',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
    requiredPolicy: 'conditional',
  }),
  createField({
    id: FIELD_IDS.S0.REVIEWER_NAME,
    code: '0.7',
    sectionId: SECTION_IDS.S0,
    label: 'Reviewer name',
    type: FIELD_TYPES.SHORT_TEXT,
    control: 'text_input',
  }),
  createField({
    id: FIELD_IDS.S0.REVIEWER_EMAIL,
    code: '0.8',
    sectionId: SECTION_IDS.S0,
    label: 'Reviewer email',
    type: FIELD_TYPES.SHORT_TEXT,
    control: 'text_input',
  }),
  createField({
    id: FIELD_IDS.S0.REVIEWER_AFFILIATION,
    code: '0.9',
    sectionId: SECTION_IDS.S0,
    label: 'Reviewer affiliation',
    type: FIELD_TYPES.SHORT_TEXT,
    control: 'text_input',
    requiredPolicy: 'never',
  }),
  createField({
    id: FIELD_IDS.S0.REVIEW_DATE,
    code: '0.10',
    sectionId: SECTION_IDS.S0,
    label: 'Review date',
    type: FIELD_TYPES.DATE,
    control: 'date_input',
  }),
]);

const S1_FIELDS = freezeArray([
  createField({
    id: FIELD_IDS.S1.VENDOR,
    code: '1.1',
    sectionId: SECTION_IDS.S1,
    label: 'Vendor',
    type: FIELD_TYPES.SHORT_TEXT,
    control: 'text_input',
  }),
  createField({
    id: FIELD_IDS.S1.CATEGORY,
    code: '1.2',
    sectionId: SECTION_IDS.S1,
    label: 'Category',
    type: FIELD_TYPES.MULTI_SELECT,
    control: 'checkbox_group',
    optionSetId: OPTION_SET_IDS.TOOL_CATEGORY,
    supportsCustomValue: true,
  }),
  createField({
    id: FIELD_IDS.S1.DEPLOYMENT_TYPE,
    code: '1.3',
    sectionId: SECTION_IDS.S1,
    label: 'Deployment type',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.DEPLOYMENT_TYPE,
    tooltip:
      'How the tool is delivered: cloud SaaS, on-premises, hybrid, browser extension, or API-only.',
  }),
  createField({
    id: FIELD_IDS.S1.IN_SCOPE_CHECK,
    code: '1.4',
    sectionId: SECTION_IDS.S1,
    label: 'In-scope check',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.SCOPE_STATUS,
    tooltip:
      "Whether the tool falls within the TRUST framework's definition of an AI-based search tool for academic use.",
  }),
  createField({
    id: FIELD_IDS.S1.SCOPE_RATIONALE,
    code: '1.5',
    sectionId: SECTION_IDS.S1,
    label: 'Scope rationale',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
    requiredPolicy: 'conditional',
    tooltip: 'Explain why the tool is in scope, partially in scope, or out of scope.',
  }),
  createField({
    id: FIELD_IDS.S1.PRIMARY_USE_CASES,
    code: '1.6',
    sectionId: SECTION_IDS.S1,
    label: 'Primary use cases',
    type: FIELD_TYPES.MULTI_SELECT,
    control: 'checkbox_group',
    optionSetId: OPTION_SET_IDS.PRIMARY_USE_CASES,
    supportsCustomValue: true,
  }),
  createField({
    id: FIELD_IDS.S1.TARGET_USER_GROUPS,
    code: '1.7',
    sectionId: SECTION_IDS.S1,
    label: 'Target user groups',
    type: FIELD_TYPES.MULTI_SELECT,
    control: 'checkbox_group',
    optionSetId: OPTION_SET_IDS.TARGET_USER_GROUPS,
    supportsCustomValue: true,
  }),
  createField({
    id: FIELD_IDS.S1.ACCESS_MODEL,
    code: '1.8',
    sectionId: SECTION_IDS.S1,
    label: 'Access model',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.ACCESS_MODEL,
    tooltip:
      'How users gain access: free, freemium, paid subscription, institutional licence, or API key.',
  }),
  createField({
    id: FIELD_IDS.S1.ACCOUNT_REQUIRED,
    code: '1.9',
    sectionId: SECTION_IDS.S1,
    label: 'Account required',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.ACCOUNT_REQUIRED,
    tooltip: 'Whether a user account is mandatory, not required, or optional for basic access.',
  }),
  createField({
    id: FIELD_IDS.S1.SIGN_IN_METHOD,
    code: '1.10',
    sectionId: SECTION_IDS.S1,
    label: 'Sign-in method',
    type: FIELD_TYPES.SHORT_TEXT,
    control: 'text_input',
    requiredPolicy: 'conditional',
  }),
]);

const S2_FIELDS = freezeArray([
  createField({
    id: FIELD_IDS.S2.TESTING_DATES,
    code: '2.1',
    sectionId: SECTION_IDS.S2,
    label: 'Testing dates',
    type: FIELD_TYPES.DATE_RANGE,
    control: 'date_range',
  }),
  createField({
    id: FIELD_IDS.S2.PRICING_TIER_TESTED,
    code: '2.2',
    sectionId: SECTION_IDS.S2,
    label: 'Pricing tier tested',
    type: FIELD_TYPES.SHORT_TEXT,
    control: 'text_input',
  }),
  createField({
    id: FIELD_IDS.S2.HANDS_ON_ACCESS_CONFIRMED,
    code: '2.3',
    sectionId: SECTION_IDS.S2,
    label: 'Hands-on access confirmed',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.BINARY_YES_NO,
    tooltip: 'Confirm that you were able to test the tool hands-on, not just review documentation.',
  }),
  createField({
    id: FIELD_IDS.S2.SAMPLE_QUERIES_OR_SCENARIOS,
    code: '2.4',
    sectionId: SECTION_IDS.S2,
    label: 'Sample queries/scenarios',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
  }),
  createField({
    id: FIELD_IDS.S2.REPEATED_QUERY_TEST_PERFORMED,
    code: '2.5',
    sectionId: SECTION_IDS.S2,
    label: 'Repeated query test performed',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.BINARY_YES_NO,
    tooltip: 'Whether at least one query was run multiple times to check output consistency.',
  }),
  createField({
    id: FIELD_IDS.S2.REPEATED_QUERY_TEXT,
    code: '2.6',
    sectionId: SECTION_IDS.S2,
    label: 'Repeated query text',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
    requiredPolicy: 'conditional',
  }),
  createField({
    id: FIELD_IDS.S2.BENCHMARK_COMPARISON_PERFORMED,
    code: '2.7',
    sectionId: SECTION_IDS.S2,
    label: 'Benchmark comparison performed',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.BINARY_YES_NO,
    tooltip: 'Whether the tool was compared against a known baseline or competing tool.',
  }),
  createField({
    id: FIELD_IDS.S2.BENCHMARK_SOURCES,
    code: '2.8',
    sectionId: SECTION_IDS.S2,
    label: 'Benchmark sources',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
    requiredPolicy: 'conditional',
  }),
  createField({
    id: FIELD_IDS.S2.SENSITIVE_DATA_ENTERED,
    code: '2.9',
    sectionId: SECTION_IDS.S2,
    label: 'Sensitive data entered',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.BINARY_YES_NO,
    tooltip:
      'Whether personally identifiable, institutional, or research-sensitive data was entered during testing.',
  }),
  createField({
    id: FIELD_IDS.S2.EVIDENCE_FOLDER_LINK,
    code: '2.10',
    sectionId: SECTION_IDS.S2,
    label: 'Evidence folder link',
    type: FIELD_TYPES.URL,
    control: 'url_input',
  }),
]);

const TR_FIELDS = freezeArray([
  ...CRITERION_BLUEPRINTS.filter((criterion) => criterion.sectionId === SECTION_IDS.TR).flatMap(
    createCriterionFields,
  ),
  createField({
    id: FIELD_IDS.TR.PRINCIPLE_SUMMARY,
    code: 'TR Principle summary',
    sectionId: SECTION_IDS.TR,
    label: 'Principle summary',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
  }),
  createField({
    id: FIELD_IDS.TR.PRINCIPLE_JUDGMENT,
    code: 'TR Principle judgment',
    sectionId: SECTION_IDS.TR,
    label: 'Principle judgment',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'computed_select',
    optionSetId: OPTION_SET_IDS.PRINCIPLE_JUDGMENT,
    derived: true,
    overridePolicy: 'downward_only',
    tooltip:
      'Derived from criterion scores. Override is downward-only (Pass → Conditional → Fail).',
  }),
]);

const RE_FIELDS = freezeArray([
  ...CRITERION_BLUEPRINTS.filter((criterion) => criterion.sectionId === SECTION_IDS.RE).flatMap(
    createCriterionFields,
  ),
  createField({
    id: FIELD_IDS.RE.TEST_METHOD_DESCRIPTION,
    code: 'RE Test method description',
    sectionId: SECTION_IDS.RE,
    label: 'Test method description',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
  }),
  createField({
    id: FIELD_IDS.RE.CLAIMS_MANUALLY_CHECKED_COUNT,
    code: 'RE Claims manually checked',
    sectionId: SECTION_IDS.RE,
    label: 'Claims manually checked',
    type: FIELD_TYPES.NUMBER,
    control: 'number_input',
  }),
  createField({
    id: FIELD_IDS.RE.PRINCIPLE_SUMMARY,
    code: 'RE Principle summary',
    sectionId: SECTION_IDS.RE,
    label: 'Principle summary',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
  }),
  createField({
    id: FIELD_IDS.RE.PRINCIPLE_JUDGMENT,
    code: 'RE Principle judgment',
    sectionId: SECTION_IDS.RE,
    label: 'Principle judgment',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'computed_select',
    optionSetId: OPTION_SET_IDS.PRINCIPLE_JUDGMENT,
    derived: true,
    overridePolicy: 'downward_only',
    tooltip:
      'Derived from criterion scores. Override is downward-only (Pass → Conditional → Fail).',
  }),
]);

const UC_FIELDS = freezeArray([
  ...CRITERION_BLUEPRINTS.filter((criterion) => criterion.sectionId === SECTION_IDS.UC).flatMap(
    createCriterionFields,
  ),
  createField({
    id: FIELD_IDS.UC.TARGET_USER_PERSONAS,
    code: 'UC Target user personas',
    sectionId: SECTION_IDS.UC,
    label: 'Target user personas',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
  }),
  createField({
    id: FIELD_IDS.UC.WORKFLOW_INTEGRATIONS_OBSERVED,
    code: 'UC Workflow integrations observed',
    sectionId: SECTION_IDS.UC,
    label: 'Workflow integrations observed',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
  }),
  createField({
    id: FIELD_IDS.UC.PRINCIPLE_SUMMARY,
    code: 'UC Principle summary',
    sectionId: SECTION_IDS.UC,
    label: 'Principle summary',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
  }),
  createField({
    id: FIELD_IDS.UC.PRINCIPLE_JUDGMENT,
    code: 'UC Principle judgment',
    sectionId: SECTION_IDS.UC,
    label: 'Principle judgment',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'computed_select',
    optionSetId: OPTION_SET_IDS.PRINCIPLE_JUDGMENT,
    derived: true,
    overridePolicy: 'downward_only',
    tooltip:
      'Derived from criterion scores. Override is downward-only (Pass → Conditional → Fail).',
  }),
]);

const SE_FIELDS = freezeArray([
  ...CRITERION_BLUEPRINTS.filter((criterion) => criterion.sectionId === SECTION_IDS.SE).flatMap(
    createCriterionFields,
  ),
  createField({
    id: FIELD_IDS.SE.DPIA_PRIVACY_ESCALATION_REQUIRED,
    code: 'SE DPIA/privacy escalation required',
    sectionId: SECTION_IDS.SE,
    label: 'DPIA/privacy escalation required',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.TRI_STATE_YES_NO_UNCLEAR,
  }),
  createField({
    id: FIELD_IDS.SE.COPYRIGHT_LICENSING_CONCERN,
    code: 'SE Copyright/licensing concern',
    sectionId: SECTION_IDS.SE,
    label: 'Copyright/licensing concern',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.TRI_STATE_YES_NO_UNCLEAR,
  }),
  createField({
    id: FIELD_IDS.SE.COMPLIANCE_CONFIDENCE,
    code: 'SE Compliance confidence',
    sectionId: SECTION_IDS.SE,
    label: 'Compliance confidence',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.COMPLIANCE_CONFIDENCE,
  }),
  createField({
    id: FIELD_IDS.SE.PRINCIPLE_SUMMARY,
    code: 'SE Principle summary',
    sectionId: SECTION_IDS.SE,
    label: 'Principle summary',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
  }),
  createField({
    id: FIELD_IDS.SE.PRINCIPLE_JUDGMENT,
    code: 'SE Principle judgment',
    sectionId: SECTION_IDS.SE,
    label: 'Principle judgment',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'computed_select',
    optionSetId: OPTION_SET_IDS.PRINCIPLE_JUDGMENT,
    derived: true,
    overridePolicy: 'downward_only',
    tooltip:
      'Derived from criterion scores. Override is downward-only (Pass → Conditional → Fail).',
  }),
]);

const TC_FIELDS = freezeArray([
  ...CRITERION_BLUEPRINTS.filter((criterion) => criterion.sectionId === SECTION_IDS.TC).flatMap(
    createCriterionFields,
  ),
  createField({
    id: FIELD_IDS.TC.CLAIMS_TRACEABLE_PERCENTAGE,
    code: 'TC Claims traceable percentage',
    sectionId: SECTION_IDS.TC,
    label: 'Claims traceable percentage',
    type: FIELD_TYPES.PERCENT,
    control: 'percent_input',
  }),
  createField({
    id: FIELD_IDS.TC.PRINCIPLE_SUMMARY,
    code: 'TC Principle summary',
    sectionId: SECTION_IDS.TC,
    label: 'Principle summary',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
  }),
  createField({
    id: FIELD_IDS.TC.PRINCIPLE_JUDGMENT,
    code: 'TC Principle judgment',
    sectionId: SECTION_IDS.TC,
    label: 'Principle judgment',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'computed_select',
    optionSetId: OPTION_SET_IDS.PRINCIPLE_JUDGMENT,
    derived: true,
    overridePolicy: 'downward_only',
    tooltip:
      'Derived from criterion scores. Override is downward-only (Pass → Conditional → Fail).',
  }),
]);

const S8_FIELDS = freezeArray([
  createField({
    id: FIELD_IDS.S8.CRITICAL_FAIL_FLAGS,
    code: '8.1',
    sectionId: SECTION_IDS.S8,
    label: 'Critical fail flags',
    type: FIELD_TYPES.MULTI_SELECT,
    control: 'checkbox_group',
    optionSetId: OPTION_SET_IDS.CRITICAL_FAIL_FLAGS,
    explicitNoneAllowed: true,
    notes: 'An explicit empty selection is allowed and means “none”.',
  }),
  createField({
    id: FIELD_IDS.S8.CRITICAL_FAIL_NOTES,
    code: '8.2',
    sectionId: SECTION_IDS.S8,
    label: 'Critical fail notes',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
    requiredPolicy: 'conditional',
  }),
  createField({
    id: FIELD_IDS.S8.COMPLETION_CHECKLIST,
    code: '8.3',
    sectionId: SECTION_IDS.S8,
    label: 'Completion checklist',
    type: FIELD_TYPES.CHECKLIST,
    control: 'derived_checklist',
    optionSetId: OPTION_SET_IDS.COMPLETION_CHECKLIST,
    derived: true,
    tooltip:
      'Automatically tracked checklist items. Complete the relevant sections to satisfy each item.',
  }),
  createField({
    id: FIELD_IDS.S8.OVERALL_REVIEW_CONFIDENCE,
    code: '8.4',
    sectionId: SECTION_IDS.S8,
    label: 'Overall review confidence',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.CONFIDENCE_LEVEL,
    tooltip: 'How well-supported the evaluation is by evidence — not how good the tool is.',
  }),
]);

const S9_FIELDS = freezeArray([
  createField({
    id: FIELD_IDS.S9.RECOMMENDATION_STATUS,
    code: '9.1',
    sectionId: SECTION_IDS.S9,
    label: 'Recommendation status',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.RECOMMENDATION_STATUS,
  }),
  createField({
    id: FIELD_IDS.S9.CONCLUSION_SUMMARY,
    code: '9.2',
    sectionId: SECTION_IDS.S9,
    label: 'Conclusion summary',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
  }),
  createField({
    id: FIELD_IDS.S9.CONDITIONS_OR_CAVEATS,
    code: '9.3',
    sectionId: SECTION_IDS.S9,
    label: 'Conditions/caveats',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
    requiredPolicy: 'conditional',
  }),
  createField({
    id: FIELD_IDS.S9.SUITABLE_USE_CASES,
    code: '9.4',
    sectionId: SECTION_IDS.S9,
    label: 'Suitable use cases',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
  }),
  createField({
    id: FIELD_IDS.S9.UNSUITABLE_HIGH_RISK_USE_CASES,
    code: '9.5',
    sectionId: SECTION_IDS.S9,
    label: 'Unsuitable/high-risk use cases',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
  }),
  createField({
    id: FIELD_IDS.S9.PUBLIC_FACING_SUMMARY_DRAFT,
    code: '9.6',
    sectionId: SECTION_IDS.S9,
    label: 'Public-facing summary draft',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
    tooltip:
      'Draft text summarizing the evaluation outcome for a public or institutional audience.',
  }),
  createField({
    id: FIELD_IDS.S9.NEXT_REVIEW_DUE,
    code: '9.7',
    sectionId: SECTION_IDS.S9,
    label: 'Next review due',
    type: FIELD_TYPES.DATE,
    control: 'date_input',
  }),
]);

const S10A_FIELDS = freezeArray([
  createField({
    id: FIELD_IDS.S10A.PRIMARY_EVALUATOR,
    code: '10A.1',
    sectionId: SECTION_IDS.S10A,
    label: 'Primary evaluator name',
    type: FIELD_TYPES.PERSON,
    control: 'person_input',
  }),
  createField({
    id: FIELD_IDS.S10A.DATE_SUBMITTED_FOR_REVIEW,
    code: '10A.2',
    sectionId: SECTION_IDS.S10A,
    label: 'Date submitted for review',
    type: FIELD_TYPES.DATE,
    control: 'date_input',
  }),
  createField({
    id: FIELD_IDS.S10A.KEY_CONCERNS_FOR_SECOND_REVIEWER,
    code: '10A.3',
    sectionId: SECTION_IDS.S10A,
    label: 'Key concerns for second reviewer',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
  }),
  createField({
    id: FIELD_IDS.S10A.AREAS_OF_UNCERTAINTY,
    code: '10A.4',
    sectionId: SECTION_IDS.S10A,
    label: 'Areas of uncertainty',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
  }),
]);

const S10B_FIELDS = freezeArray([
  createField({
    id: FIELD_IDS.S10B.SECOND_REVIEWER,
    code: '10B.1',
    sectionId: SECTION_IDS.S10B,
    label: 'Second reviewer name',
    type: FIELD_TYPES.PERSON,
    control: 'person_input',
  }),
  createField({
    id: FIELD_IDS.S10B.DATE_OF_SECOND_REVIEW,
    code: '10B.2',
    sectionId: SECTION_IDS.S10B,
    label: 'Date of second review',
    type: FIELD_TYPES.DATE,
    control: 'date_input',
  }),
  createField({
    id: FIELD_IDS.S10B.AGREEMENT_WITH_PRIMARY_EVALUATION,
    code: '10B.3',
    sectionId: SECTION_IDS.S10B,
    label: 'Agreement with primary evaluation',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.AGREEMENT_STATUS,
    tooltip:
      'Whether the second reviewer agrees, partially agrees, or disagrees with the primary evaluation.',
  }),
  createField({
    id: FIELD_IDS.S10B.CRITERIA_TO_REVISIT,
    code: '10B.4',
    sectionId: SECTION_IDS.S10B,
    label: 'Criteria to revisit',
    type: FIELD_TYPES.MULTI_SELECT,
    control: 'checkbox_group',
    optionSetId: OPTION_SET_IDS.CRITERION_CODES,
    requiredPolicy: 'conditional',
    tooltip: 'Criterion codes that the second reviewer believes need re-examination.',
  }),
  createField({
    id: FIELD_IDS.S10B.SECOND_REVIEWER_RECOMMENDATION,
    code: '10B.5',
    sectionId: SECTION_IDS.S10B,
    label: 'Second reviewer recommendation',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.RECOMMENDATION_STATUS,
  }),
  createField({
    id: FIELD_IDS.S10B.CONFLICT_SUMMARY,
    code: '10B.6',
    sectionId: SECTION_IDS.S10B,
    label: 'Conflict summary',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
    requiredPolicy: 'conditional',
  }),
]);

const S10C_FIELDS = freezeArray([
  createField({
    id: FIELD_IDS.S10C.DECISION_MEETING_DATE,
    code: '10C.1',
    sectionId: SECTION_IDS.S10C,
    label: 'Decision meeting date',
    type: FIELD_TYPES.DATE,
    control: 'date_input',
  }),
  createField({
    id: FIELD_IDS.S10C.MEETING_PARTICIPANTS,
    code: '10C.2',
    sectionId: SECTION_IDS.S10C,
    label: 'Meeting participants',
    type: FIELD_TYPES.PEOPLE_LIST,
    control: 'people_list_input',
  }),
  createField({
    id: FIELD_IDS.S10C.FINAL_STATUS,
    code: '10C.3',
    sectionId: SECTION_IDS.S10C,
    label: 'Final status',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.FINAL_STATUS,
  }),
  createField({
    id: FIELD_IDS.S10C.FINAL_STATUS_RATIONALE,
    code: '10C.4',
    sectionId: SECTION_IDS.S10C,
    label: 'Final status rationale',
    type: FIELD_TYPES.LONG_TEXT,
    control: 'textarea',
    tooltip:
      'Explain the conditions, deferrals, escalations, or rejection reasons behind the final status.',
  }),
  createField({
    id: FIELD_IDS.S10C.PUBLICATION_STATUS,
    code: '10C.5',
    sectionId: SECTION_IDS.S10C,
    label: 'Publication status',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.PUBLICATION_STATUS,
  }),
  createField({
    id: FIELD_IDS.S10C.REVIEW_CYCLE_FREQUENCY,
    code: '10C.6',
    sectionId: SECTION_IDS.S10C,
    label: 'Review cycle frequency',
    type: FIELD_TYPES.SINGLE_SELECT,
    control: 'dropdown',
    optionSetId: OPTION_SET_IDS.REVIEW_CYCLE_FREQUENCY,
    tooltip:
      'How often the tool should be re-evaluated based on risk, update cadence, and access conditions.',
  }),
]);

const SECTION_FIELDS = Object.freeze({
  [SECTION_IDS.S0]: S0_FIELDS,
  [SECTION_IDS.S1]: S1_FIELDS,
  [SECTION_IDS.S2]: S2_FIELDS,
  [SECTION_IDS.TR]: TR_FIELDS,
  [SECTION_IDS.RE]: RE_FIELDS,
  [SECTION_IDS.UC]: UC_FIELDS,
  [SECTION_IDS.SE]: SE_FIELDS,
  [SECTION_IDS.TC]: TC_FIELDS,
  [SECTION_IDS.S8]: S8_FIELDS,
  [SECTION_IDS.S9]: S9_FIELDS,
  [SECTION_IDS.S10A]: S10A_FIELDS,
  [SECTION_IDS.S10B]: S10B_FIELDS,
  [SECTION_IDS.S10C]: S10C_FIELDS,
});

export const CRITERIA = freezeArray(
  CRITERION_BLUEPRINTS.map((criterion) =>
    Object.freeze({
      ...criterion,
      fieldIds: CRITERION_FIELD_IDS[criterion.code],
    }),
  ),
);

export const CRITERIA_BY_CODE = indexBy(CRITERIA, 'code');

export const QUESTIONNAIRE_SECTIONS = freezeArray([
  createSectionSchema({ sectionId: SECTION_IDS.S0, fields: S0_FIELDS }),
  createSectionSchema({ sectionId: SECTION_IDS.S1, fields: S1_FIELDS }),
  createSectionSchema({ sectionId: SECTION_IDS.S2, fields: S2_FIELDS }),
  createSectionSchema({
    sectionId: SECTION_IDS.TR,
    fields: TR_FIELDS,
    criterionCodes: freezeArray(['TR1', 'TR2', 'TR3']),
  }),
  createSectionSchema({
    sectionId: SECTION_IDS.RE,
    fields: RE_FIELDS,
    criterionCodes: freezeArray(['RE1', 'RE2', 'RE3']),
  }),
  createSectionSchema({
    sectionId: SECTION_IDS.UC,
    fields: UC_FIELDS,
    criterionCodes: freezeArray(['UC1', 'UC2', 'UC3', 'UC4']),
  }),
  createSectionSchema({
    sectionId: SECTION_IDS.SE,
    fields: SE_FIELDS,
    criterionCodes: freezeArray(['SE1', 'SE2', 'SE3', 'SE4']),
  }),
  createSectionSchema({
    sectionId: SECTION_IDS.TC,
    fields: TC_FIELDS,
    criterionCodes: freezeArray(['TC1', 'TC2']),
  }),
  createSectionSchema({ sectionId: SECTION_IDS.S8, fields: S8_FIELDS }),
  createSectionSchema({ sectionId: SECTION_IDS.S9, fields: S9_FIELDS }),
  createSectionSchema({ sectionId: SECTION_IDS.S10A, fields: S10A_FIELDS }),
  createSectionSchema({ sectionId: SECTION_IDS.S10B, fields: S10B_FIELDS }),
  createSectionSchema({ sectionId: SECTION_IDS.S10C, fields: S10C_FIELDS }),
]);

export const QUESTIONNAIRE_FIELDS = freezeArray(Object.values(SECTION_FIELDS).flat());
export const QUESTIONNAIRE_FIELDS_BY_ID = indexBy(QUESTIONNAIRE_FIELDS);
export const QUESTIONNAIRE_SECTIONS_BY_ID = indexBy(QUESTIONNAIRE_SECTIONS);

export const SECTION_FIELD_IDS = Object.freeze(
  Object.fromEntries(QUESTIONNAIRE_SECTIONS.map((section) => [section.id, section.fieldIds])),
);

export const CRITERION_CODES_BY_SECTION = Object.freeze(
  Object.fromEntries(QUESTIONNAIRE_SECTIONS.map((section) => [section.id, section.criterionCodes])),
);

export const SECTION_FIELD_COUNTS = Object.freeze(
  Object.fromEntries(
    QUESTIONNAIRE_SECTIONS.map((section) => [section.id, section.fieldIds.length]),
  ),
);

export const QUESTIONNAIRE_SCHEMA_META = Object.freeze({
  sourceQuestionnaire: 'docs/trust-questionnaire.md',
  sourceFramework: 'docs/trust-framework-v2.md',
  sourceImprovementNote: 'docs/improvement_03_04_2026/03_form_schema_and_dependencies.md',
  appendixFieldCount: 132,
  resolvedFieldCount: QUESTIONNAIRE_FIELDS.length,
  resolvedFieldCountRationale:
    'The schema follows the explicit field listing. Section 6 contains 21 fields in the canonical text, so the resolved total is 139 rather than the stale appendix total of 132.',
  criterionCount: CRITERIA.length,
  sectionCount: QUESTIONNAIRE_SECTIONS.length,
});

assertInvariant(CRITERIA.length === 16, `Expected 16 criteria, received ${CRITERIA.length}.`);
assertInvariant(
  QUESTIONNAIRE_FIELDS.length === 139,
  `Expected 139 explicit questionnaire fields, received ${QUESTIONNAIRE_FIELDS.length}.`,
);
assertInvariant(
  SECTION_FIELD_COUNTS[SECTION_IDS.SE] === 21,
  `Expected Section 6 (SE) to resolve to 21 fields, received ${SECTION_FIELD_COUNTS[SECTION_IDS.SE]}.`,
);

export const QUESTIONNAIRE_SCHEMA = Object.freeze({
  meta: QUESTIONNAIRE_SCHEMA_META,
  sections: QUESTIONNAIRE_SECTIONS,
  fields: QUESTIONNAIRE_FIELDS,
  criteria: CRITERIA,
});
