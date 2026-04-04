import {
  CANONICAL_PAGE_SEQUENCE,
  SECTION_IDS,
  SECTION_REGISTRY_BY_ID,
  getSectionDefinition,
} from '../config/sections.js';
import {
  CRITERIA_BY_CODE,
  FIELD_IDS,
  FIELD_TYPES,
  QUESTIONNAIRE_FIELDS_BY_ID,
  QUESTIONNAIRE_SECTIONS_BY_ID,
} from '../config/questionnaire-schema.js';
import {
  OPTION_SET_IDS,
  OPTION_SETS,
} from '../config/option-sets.js';
import {
  FIELD_REQUIREMENT_RULES_BY_TARGET,
  FIELD_VISIBILITY_RULES_BY_TARGET,
  SKIP_STATES,
} from '../config/rules.js';
import { createAppStore } from '../state/store.js';
import { createEmptyEvaluationState, deriveQuestionnaireState } from '../state/derive.js';
import {
  createCheckboxBlock,
  createCriterionCard,
  createDateRangeControl,
  createElement,
  createFieldGrid,
  createFieldGroup,
  createInputControl,
  createRatingScale,
  createSection,
  createSectionKicker,
  createSelectControl,
  createTextareaControl,
} from './dom-factories.js';
import {
  createEvidenceBlockElement,
  createEvidenceScope,
} from './evidence.js';
import { EMPTY_ARRAY, freezeArray, isPlainObject } from '../utils/shared.js';

const EMPTY_OBJECT = Object.freeze({});
const SECTION_NOTE_HELP_TEXT = 'Optional section-level note for observations not captured elsewhere. This does not satisfy required summary, blocker, or rationale fields.';
const SECTION_SKIP_SCAFFOLD_HELP_TEXT = 'Section skip overrides child field dependencies and requiredness for this page, but both a skip reason and a substantive rationale are required.';
const CRITERION_SKIP_SCAFFOLD_HELP_TEXT = 'Criterion skip is separate from a low or negative score. Use it only when the criterion cannot be assessed; both a skip reason and a substantive rationale are required, and criterion child fields stop contributing requiredness while the skip is active.';

const assertInvariant = (condition, message) => {
  if (!condition) {
    throw new Error(`[questionnaire-pages] ${message}`);
  }
};

const createFieldGroupLayout = ({
  anchor,
  fieldIds,
  layout = 'default',
  className = '',
}) =>
  Object.freeze({
    anchor,
    fieldIds: freezeArray(fieldIds),
    layout,
    className,
  });

const createPageLayout = ({
  dataSection,
  criterionAnchor = 'criteria',
  groups = EMPTY_ARRAY,
}) =>
  Object.freeze({
    dataSection,
    criterionAnchor,
    groups: freezeArray(groups),
  });

const PAGE_LAYOUTS = Object.freeze({
  [SECTION_IDS.S0]: createPageLayout({
    dataSection: 'intro',
    groups: [
      createFieldGroupLayout({
        anchor: 'primary',
        fieldIds: [
          FIELD_IDS.S0.SUBMISSION_TYPE,
          FIELD_IDS.S0.TOOL_NAME,
          FIELD_IDS.S0.TOOL_URL,
          FIELD_IDS.S0.EXISTING_EVALUATION_ID,
          FIELD_IDS.S0.RESPONDER_ROLE,
        ],
      }),
      createFieldGroupLayout({
        anchor: 'detail',
        fieldIds: [FIELD_IDS.S0.NOMINATION_REASON],
        layout: 'single',
      }),
    ],
  }),
  [SECTION_IDS.S1]: createPageLayout({
    dataSection: 'scope',
    groups: [
      createFieldGroupLayout({
        anchor: 'primary',
        fieldIds: [
          FIELD_IDS.S1.VENDOR,
          FIELD_IDS.S1.DEPLOYMENT_TYPE,
          FIELD_IDS.S1.IN_SCOPE_CHECK,
          FIELD_IDS.S1.ACCESS_MODEL,
          FIELD_IDS.S1.ACCOUNT_REQUIRED,
          FIELD_IDS.S1.SIGN_IN_METHOD,
        ],
      }),
      createFieldGroupLayout({
        anchor: 'detail',
        fieldIds: [
          FIELD_IDS.S1.CATEGORY,
          FIELD_IDS.S1.SCOPE_RATIONALE,
          FIELD_IDS.S1.PRIMARY_USE_CASES,
          FIELD_IDS.S1.TARGET_USER_GROUPS,
        ],
        layout: 'single',
      }),
    ],
  }),
  [SECTION_IDS.S2]: createPageLayout({
    dataSection: 'evidence',
    groups: [
      createFieldGroupLayout({
        anchor: 'primary',
        fieldIds: [
          FIELD_IDS.S2.TESTING_DATES,
          FIELD_IDS.S2.PRICING_TIER_TESTED,
          FIELD_IDS.S2.HANDS_ON_ACCESS_CONFIRMED,
          FIELD_IDS.S2.REPEATED_QUERY_TEST_PERFORMED,
          FIELD_IDS.S2.BENCHMARK_COMPARISON_PERFORMED,
          FIELD_IDS.S2.SENSITIVE_DATA_ENTERED,
        ],
      }),
      createFieldGroupLayout({
        anchor: 'detail',
        fieldIds: [
          FIELD_IDS.S2.SAMPLE_QUERIES_OR_SCENARIOS,
          FIELD_IDS.S2.REPEATED_QUERY_TEXT,
          FIELD_IDS.S2.BENCHMARK_SOURCES,
          FIELD_IDS.S2.EVIDENCE_FOLDER_LINK,
        ],
        layout: 'single',
      }),
    ],
  }),
  [SECTION_IDS.TR]: createPageLayout({
    dataSection: 'tr',
    groups: [
      createFieldGroupLayout({
        anchor: 'summary',
        fieldIds: [
          FIELD_IDS.TR.PRINCIPLE_SUMMARY,
          FIELD_IDS.TR.PRINCIPLE_JUDGMENT,
        ],
        layout: 'single',
        className: 'principle-summary',
      }),
    ],
  }),
  [SECTION_IDS.RE]: createPageLayout({
    dataSection: 're',
    groups: [
      createFieldGroupLayout({
        anchor: 'supplementary',
        fieldIds: [
          FIELD_IDS.RE.TEST_METHOD_DESCRIPTION,
          FIELD_IDS.RE.CLAIMS_MANUALLY_CHECKED_COUNT,
        ],
      }),
      createFieldGroupLayout({
        anchor: 'summary',
        fieldIds: [
          FIELD_IDS.RE.PRINCIPLE_SUMMARY,
          FIELD_IDS.RE.PRINCIPLE_JUDGMENT,
        ],
        layout: 'single',
        className: 'principle-summary',
      }),
    ],
  }),
  [SECTION_IDS.UC]: createPageLayout({
    dataSection: 'uc',
    groups: [
      createFieldGroupLayout({
        anchor: 'supplementary',
        fieldIds: [
          FIELD_IDS.UC.TARGET_USER_PERSONAS,
          FIELD_IDS.UC.WORKFLOW_INTEGRATIONS_OBSERVED,
        ],
      }),
      createFieldGroupLayout({
        anchor: 'summary',
        fieldIds: [
          FIELD_IDS.UC.PRINCIPLE_SUMMARY,
          FIELD_IDS.UC.PRINCIPLE_JUDGMENT,
        ],
        layout: 'single',
        className: 'principle-summary',
      }),
    ],
  }),
  [SECTION_IDS.SE]: createPageLayout({
    dataSection: 'se',
    groups: [
      createFieldGroupLayout({
        anchor: 'supplementary',
        fieldIds: [
          FIELD_IDS.SE.DPIA_PRIVACY_ESCALATION_REQUIRED,
          FIELD_IDS.SE.COPYRIGHT_LICENSING_CONCERN,
          FIELD_IDS.SE.COMPLIANCE_CONFIDENCE,
        ],
      }),
      createFieldGroupLayout({
        anchor: 'summary',
        fieldIds: [
          FIELD_IDS.SE.PRINCIPLE_SUMMARY,
          FIELD_IDS.SE.PRINCIPLE_JUDGMENT,
        ],
        layout: 'single',
        className: 'principle-summary',
      }),
    ],
  }),
  [SECTION_IDS.TC]: createPageLayout({
    dataSection: 'tc',
    groups: [
      createFieldGroupLayout({
        anchor: 'supplementary',
        fieldIds: [FIELD_IDS.TC.CLAIMS_TRACEABLE_PERCENTAGE],
      }),
      createFieldGroupLayout({
        anchor: 'summary',
        fieldIds: [
          FIELD_IDS.TC.PRINCIPLE_SUMMARY,
          FIELD_IDS.TC.PRINCIPLE_JUDGMENT,
        ],
        layout: 'single',
        className: 'principle-summary',
      }),
    ],
  }),
  [SECTION_IDS.S8]: createPageLayout({
    dataSection: 'scoring',
    groups: [
      createFieldGroupLayout({
        anchor: 'summary',
        fieldIds: [
          FIELD_IDS.S8.CRITICAL_FAIL_FLAGS,
          FIELD_IDS.S8.CRITICAL_FAIL_NOTES,
          FIELD_IDS.S8.COMPLETION_CHECKLIST,
          FIELD_IDS.S8.OVERALL_REVIEW_CONFIDENCE,
        ],
        layout: 'single',
      }),
    ],
  }),
  [SECTION_IDS.S9]: createPageLayout({
    dataSection: 'governance',
    groups: [
      createFieldGroupLayout({
        anchor: 'primary',
        fieldIds: [
          FIELD_IDS.S9.RECOMMENDATION_STATUS,
          FIELD_IDS.S9.NEXT_REVIEW_DUE,
        ],
      }),
      createFieldGroupLayout({
        anchor: 'summary',
        fieldIds: [
          FIELD_IDS.S9.CONCLUSION_SUMMARY,
          FIELD_IDS.S9.CONDITIONS_OR_CAVEATS,
          FIELD_IDS.S9.SUITABLE_USE_CASES,
          FIELD_IDS.S9.UNSUITABLE_HIGH_RISK_USE_CASES,
          FIELD_IDS.S9.PUBLIC_FACING_SUMMARY_DRAFT,
        ],
        layout: 'single',
      }),
    ],
  }),
  [SECTION_IDS.S10A]: createPageLayout({
    dataSection: 'governance',
    groups: [
      createFieldGroupLayout({
        anchor: 'primary',
        fieldIds: [
          FIELD_IDS.S10A.PRIMARY_EVALUATOR,
          FIELD_IDS.S10A.DATE_SUBMITTED_FOR_REVIEW,
        ],
      }),
      createFieldGroupLayout({
        anchor: 'summary',
        fieldIds: [
          FIELD_IDS.S10A.KEY_CONCERNS_FOR_SECOND_REVIEWER,
          FIELD_IDS.S10A.AREAS_OF_UNCERTAINTY,
        ],
        layout: 'single',
      }),
    ],
  }),
  [SECTION_IDS.S10B]: createPageLayout({
    dataSection: 'governance',
    groups: [
      createFieldGroupLayout({
        anchor: 'primary',
        fieldIds: [
          FIELD_IDS.S10B.SECOND_REVIEWER,
          FIELD_IDS.S10B.DATE_OF_SECOND_REVIEW,
          FIELD_IDS.S10B.AGREEMENT_WITH_PRIMARY_EVALUATION,
          FIELD_IDS.S10B.SECOND_REVIEWER_RECOMMENDATION,
        ],
      }),
      createFieldGroupLayout({
        anchor: 'summary',
        fieldIds: [
          FIELD_IDS.S10B.CRITERIA_TO_REVISIT,
          FIELD_IDS.S10B.CONFLICT_SUMMARY,
        ],
        layout: 'single',
      }),
    ],
  }),
  [SECTION_IDS.S10C]: createPageLayout({
    dataSection: 'governance',
    groups: [
      createFieldGroupLayout({
        anchor: 'primary',
        fieldIds: [
          FIELD_IDS.S10C.DECISION_MEETING_DATE,
          FIELD_IDS.S10C.FINAL_STATUS,
          FIELD_IDS.S10C.PUBLICATION_STATUS,
          FIELD_IDS.S10C.REVIEW_CYCLE_FREQUENCY,
        ],
      }),
      createFieldGroupLayout({
        anchor: 'summary',
        fieldIds: [
          FIELD_IDS.S10C.MEETING_PARTICIPANTS,
          FIELD_IDS.S10C.FINAL_STATUS_RATIONALE,
        ],
        layout: 'single',
      }),
    ],
  }),
});

const RENDERABLE_PAGE_SEQUENCE = freezeArray(
  CANONICAL_PAGE_SEQUENCE.filter((pageId) => QUESTIONNAIRE_SECTIONS_BY_ID[pageId]),
);

assertInvariant(
  RENDERABLE_PAGE_SEQUENCE.length === 13,
  `Expected 13 canonical questionnaire pages, received ${RENDERABLE_PAGE_SEQUENCE.length}.`,
);

RENDERABLE_PAGE_SEQUENCE.forEach((pageId) => {
  assertInvariant(PAGE_LAYOUTS[pageId], `Missing page layout metadata for ${pageId}.`);
});

const sanitizeHookToken = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const uniqueText = (items) =>
  [...new Set(items.filter(Boolean).map((item) => item.trim()).filter(Boolean))];

const normalizeListValue = (value, splitter = /[\n,]+/) => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => normalizeListValue(item, splitter))
      .filter(Boolean);
  }

  if (value instanceof Set) {
    return normalizeListValue(Array.from(value), splitter);
  }

  if (typeof value === 'string') {
    return value
      .split(splitter)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (value === null || value === undefined) {
    return [];
  }

  return [String(value)];
};

const normalizeCheckboxSelections = (value) => {
  if (isPlainObject(value)) {
    return Object.entries(value)
      .filter(([, isSelected]) => isSelected === true)
      .map(([key]) => key);
  }

  return normalizeListValue(value);
};

const CRITERION_RECORD_KEY_FALLBACKS = Object.freeze({
  skipReasonCode: Object.freeze([
    'skipReasonCode',
    'criterionSkipReasonCode',
    'skip_reason_code',
    'criterion_skip_reason_code',
  ]),
  skipRationale: Object.freeze([
    'skipRationale',
    'criterionSkipRationale',
    'skip_rationale',
    'criterion_skip_rationale',
  ]),
});

const getCriterionRecordValue = (criterionRecord, key) => {
  const candidateKeys = CRITERION_RECORD_KEY_FALLBACKS[key] ?? [key];

  for (const candidateKey of candidateKeys) {
    const candidateValue = criterionRecord?.[candidateKey];

    if (typeof candidateValue === 'string') {
      return candidateValue;
    }
  }

  return '';
};

const formatPersonValue = (value) => {
  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (!isPlainObject(value)) {
    return null;
  }

  return value.name
    || value.displayName
    || value.email
    || value.id
    || null;
};

const formatDateRangeValue = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(' → ') || null;
  }

  if (!isPlainObject(value)) {
    return null;
  }

  return [value.start, value.end].filter(Boolean).join(' → ') || null;
};

const getOptionLabel = (optionSet, optionValue) =>
  optionSet?.options.find((option) => option.value === optionValue)?.label
  ?? optionSet?.options.find((option) => String(option.value) === String(optionValue))?.label
  ?? (optionValue === null || optionValue === undefined ? null : String(optionValue));

const resolveSelectValueLabel = (field, rawValue, optionSet) => {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }

  if (field.type === FIELD_TYPES.MULTI_SELECT || field.type === FIELD_TYPES.CHECKLIST) {
    return normalizeCheckboxSelections(rawValue)
      .map((value) => getOptionLabel(optionSet, value))
      .filter(Boolean)
      .join('\n');
  }

  return getOptionLabel(optionSet, rawValue);
};

const formatFieldValue = (field, rawValue, optionSet) => {
  switch (field.type) {
    case FIELD_TYPES.SINGLE_SELECT:
      return resolveSelectValueLabel(field, rawValue, optionSet);
    case FIELD_TYPES.SHORT_TEXT:
    case FIELD_TYPES.LONG_TEXT:
    case FIELD_TYPES.URL:
    case FIELD_TYPES.DATE:
      return typeof rawValue === 'string' ? rawValue.trim() || null : rawValue ?? null;
    case FIELD_TYPES.URL_LIST:
      return normalizeListValue(rawValue, /\n+/).join('\n') || null;
    case FIELD_TYPES.DATE_RANGE:
      return formatDateRangeValue(rawValue);
    case FIELD_TYPES.NUMBER:
    case FIELD_TYPES.PERCENT:
      return rawValue === null || rawValue === undefined || rawValue === '' ? null : String(rawValue);
    case FIELD_TYPES.PERSON:
      return formatPersonValue(rawValue);
    case FIELD_TYPES.PEOPLE_LIST:
      return normalizeListValue(rawValue).join('\n') || null;
    case FIELD_TYPES.MULTI_SELECT:
    case FIELD_TYPES.CHECKLIST:
      return resolveSelectValueLabel(field, rawValue, optionSet);
    default:
      return rawValue === null || rawValue === undefined ? null : String(rawValue);
  }
};

const serializeDateRangeValue = (value) => {
  if (Array.isArray(value)) {
    return {
      start: value[0] ?? '',
      end: value[1] ?? '',
    };
  }

  if (!isPlainObject(value)) {
    return {
      start: '',
      end: '',
    };
  }

  return {
    start: value.start ?? '',
    end: value.end ?? '',
  };
};

const serializeFieldValueForControl = (field, rawValue) => {
  switch (field.type) {
    case FIELD_TYPES.SINGLE_SELECT:
      return rawValue === null || rawValue === undefined ? '' : String(rawValue);
    case FIELD_TYPES.MULTI_SELECT:
    case FIELD_TYPES.CHECKLIST:
      return normalizeCheckboxSelections(rawValue);
    case FIELD_TYPES.SHORT_TEXT:
    case FIELD_TYPES.LONG_TEXT:
    case FIELD_TYPES.URL:
    case FIELD_TYPES.DATE:
      return typeof rawValue === 'string' ? rawValue : rawValue ?? '';
    case FIELD_TYPES.URL_LIST:
      return normalizeListValue(rawValue, /\n+/).join('\n');
    case FIELD_TYPES.DATE_RANGE:
      return serializeDateRangeValue(rawValue);
    case FIELD_TYPES.NUMBER:
    case FIELD_TYPES.PERCENT:
      return rawValue === null || rawValue === undefined ? '' : String(rawValue);
    case FIELD_TYPES.PERSON:
      return formatPersonValue(rawValue) ?? '';
    case FIELD_TYPES.PEOPLE_LIST:
      return normalizeListValue(rawValue).join('\n');
    default:
      return rawValue === null || rawValue === undefined ? '' : String(rawValue);
  }
};

const getMockControlPlaceholder = (field) => {
  if (field.derived) {
    return 'Derived from current state';
  }

  switch (field.type) {
    case FIELD_TYPES.URL:
      return 'https://example.org';
    case FIELD_TYPES.DATE:
      return 'YYYY-MM-DD';
    case FIELD_TYPES.DATE_RANGE:
      return 'YYYY-MM-DD → YYYY-MM-DD';
    case FIELD_TYPES.NUMBER:
      return 'Enter number';
    case FIELD_TYPES.PERCENT:
      return '0–100%';
    case FIELD_TYPES.PERSON:
      return 'Name or identifier';
    case FIELD_TYPES.SHORT_TEXT:
      return `Enter ${field.label.toLowerCase()}`;
    case FIELD_TYPES.SINGLE_SELECT:
      return field.control === 'computed_select' ? 'Computed value' : 'Select an option';
    default:
      return field.label;
  }
};

const getTextareaPlaceholderLines = (field) => {
  switch (field.type) {
    case FIELD_TYPES.URL_LIST:
      return ['w-75', 'w-62', 'w-48'];
    case FIELD_TYPES.PEOPLE_LIST:
      return ['w-75', 'w-62', 'w-48'];
    default:
      return ['w-90', 'w-75', 'w-62'];
  }
};

const getFieldDisplayLabel = (field) => {
  if (field.criterionCode && field.label.startsWith(`${field.criterionCode} `)) {
    return field.label.slice(field.criterionCode.length + 1);
  }

  if (/^\d/.test(field.code)) {
    return `${field.code} ${field.label}`;
  }

  return field.label;
};

const getRuleDescriptions = (fieldId) =>
  uniqueText([
    ...(FIELD_VISIBILITY_RULES_BY_TARGET[fieldId] ?? EMPTY_ARRAY).map((rule) => rule.description),
    ...(FIELD_REQUIREMENT_RULES_BY_TARGET[fieldId] ?? EMPTY_ARRAY).map((rule) => rule.description),
  ]);

const getFieldTagMeta = (field, fieldState) => {
  if (field.derived) {
    return { text: 'Display only', kind: 'display' };
  }

  if (field.requiredPolicy === 'conditional') {
    return {
      text: fieldState?.required ? 'Condition active' : 'Conditional',
      kind: 'condition',
    };
  }

  return null;
};

const getFieldHelpText = (field) => {
  const optionSet = field.optionSetId ? OPTION_SETS[field.optionSetId] : null;

  return uniqueText([
    field.notes,
    optionSet?.notes,
    ...getRuleDescriptions(field.id),
  ]).join(' • ') || null;
};

const getJudgmentClassName = (field, rawValue) => {
  if (field.optionSetId !== OPTION_SET_IDS.PRINCIPLE_JUDGMENT) {
    return '';
  }

  switch (rawValue) {
    case 'pass':
      return 'judgment-pass';
    case 'conditional_pass':
      return 'judgment-conditional';
    case 'fail':
      return 'judgment-fail';
    default:
      return '';
  }
};

const resolveFieldBodyKind = (field) => {
  if (field.control === 'radio_group') {
    return 'rating';
  }

  if (field.control === 'checkbox_group' || field.control === 'derived_checklist') {
    return 'checkbox';
  }

  if (field.control === 'dropdown' || field.control === 'computed_select') {
    return 'select';
  }

  if (field.control === 'date_range') {
    return 'date_range';
  }

  if (
    field.control === 'textarea'
    || field.control === 'url_list'
    || field.control === 'people_list_input'
  ) {
    return 'textarea';
  }

  return 'input';
};

const resolvePageOrder = (pageOrder) => {
  const candidateOrder = Array.isArray(pageOrder) && pageOrder.length > 0
    ? pageOrder
    : RENDERABLE_PAGE_SEQUENCE;
  const seenPageIds = new Set();

  return candidateOrder.filter((pageId) => {
    if (!QUESTIONNAIRE_SECTIONS_BY_ID[pageId] || seenPageIds.has(pageId)) {
      return false;
    }

    seenPageIds.add(pageId);
    return true;
  });
};

const hasStoreInterface = (store) =>
  Boolean(store)
  && typeof store.getState === 'function';

const resolveRenderState = ({
  store = null,
  evaluation = createEmptyEvaluationState(),
  pageOrder = null,
} = {}) => {
  if (hasStoreInterface(store)) {
    const state = store.getState();

    return {
      store,
      evaluation: state.evaluation,
      derived: state.derived ?? deriveQuestionnaireState(state.evaluation),
      pageOrder: resolvePageOrder(pageOrder ?? state.ui?.pageOrder),
    };
  }

  const ephemeralStore = createAppStore({
    initialEvaluation: evaluation,
    pageOrder: resolvePageOrder(pageOrder),
  });
  const state = ephemeralStore.getState();

  return {
    store: ephemeralStore,
    evaluation: state.evaluation,
    derived: state.derived,
    pageOrder: resolvePageOrder(pageOrder ?? state.ui?.pageOrder),
  };
};

export const getPageElementId = (pageId) => {
  const sectionDefinition = getSectionDefinition(pageId);
  return `questionnaire-section-${sanitizeHookToken(sectionDefinition?.sectionCode ?? pageId)}`;
};

export const getPageHeadingId = (pageId) => {
  const sectionDefinition = getSectionDefinition(pageId);
  return `q-s${sanitizeHookToken(sectionDefinition?.sectionCode ?? pageId)}-heading`;
};

export const getCriterionElementId = (criterionCode) =>
  `questionnaire-criterion-${sanitizeHookToken(criterionCode)}`;

export const getFieldElementId = (fieldId) =>
  `questionnaire-field-${sanitizeHookToken(fieldId)}`;

export const getFieldLabelId = (fieldId) =>
  `${getFieldElementId(fieldId)}-label`;

export const getFieldHelpId = (fieldId) =>
  `${getFieldElementId(fieldId)}-help`;

export const getFieldControlId = (fieldId) =>
  `${getFieldElementId(fieldId)}-control`;

export const getSectionMetaElementId = (pageId, key) =>
  `questionnaire-section-meta-${sanitizeHookToken(pageId)}-${sanitizeHookToken(key)}`;

const getCriterionMetaElementId = (criterionCode, key) =>
  `questionnaire-criterion-meta-${sanitizeHookToken(criterionCode)}-${sanitizeHookToken(key)}`;

export const getSummaryAnchorToken = (pageId, anchorName) =>
  `${String(pageId).toLowerCase()}.${sanitizeHookToken(anchorName)}`;

export const getSummaryAnchorId = (pageId, anchorName) =>
  `questionnaire-summary-${sanitizeHookToken(pageId)}-${sanitizeHookToken(anchorName)}`;

const getPageTitle = (sectionDefinition) =>
  sectionDefinition.principleKey
    ? `${sectionDefinition.title} (${sectionDefinition.principleKey})`
    : sectionDefinition.title;

const getSectionKickerText = (sectionDefinition) =>
  sectionDefinition.principleKey
    ? `Section ${sectionDefinition.sectionCode} — ${sectionDefinition.principleKey}`
    : `Section ${sectionDefinition.sectionCode}`;

const getAccentClass = (sectionDefinition) =>
  sectionDefinition.principleKey?.toLowerCase() ?? null;

const buildFieldModel = (fieldId, renderState) => {
  const field = QUESTIONNAIRE_FIELDS_BY_ID[fieldId];
  const fieldState = renderState.derived.fieldStates.byId[fieldId] ?? EMPTY_OBJECT;
  const optionSet = field.optionSetId ? OPTION_SETS[field.optionSetId] ?? null : null;
  const rawValue = fieldState.value;
  const bodyKind = resolveFieldBodyKind(field);

  return {
    fieldId,
    elementId: getFieldElementId(fieldId),
    labelId: getFieldLabelId(fieldId),
    helpId: getFieldHelpId(fieldId),
    controlId: getFieldControlId(fieldId),
    field,
    fieldState,
    optionSet,
    rawValue,
    bodyKind,
    labelText: getFieldDisplayLabel(field),
    tag: getFieldTagMeta(field, fieldState),
    helpText: getFieldHelpText(field),
    displayValue: formatFieldValue(field, rawValue, optionSet),
    controlValue: serializeFieldValueForControl(field, rawValue),
    placeholderText: getMockControlPlaceholder(field),
    placeholderLineClasses: getTextareaPlaceholderLines(field),
    checkboxSelections: normalizeCheckboxSelections(rawValue),
    mockClassName: getJudgmentClassName(field, rawValue),
    ratingGroupName: `field-${sanitizeHookToken(fieldId)}`,
  };
};

const buildFieldGroupModel = (pageId, groupLayout, renderState, { respectVisibility = false } = {}) => {
  const fieldModels = groupLayout.fieldIds
    .map((fieldId) => buildFieldModel(fieldId, renderState));

  if (fieldModels.length === 0) {
    return null;
  }

  return {
    ...groupLayout,
    pageId,
    elementId: getSummaryAnchorId(pageId, groupLayout.anchor),
    summaryAnchor: getSummaryAnchorToken(pageId, groupLayout.anchor),
    fieldModels,
  };
};

const buildCriterionModel = (pageId, criterionCode, renderState, options) => {
  const criterion = CRITERIA_BY_CODE[criterionCode];
  const criterionState = renderState.derived.criterionStates.byCode[criterionCode] ?? EMPTY_OBJECT;
  const criterionRecord = renderState.evaluation.criteria?.[criterionCode] ?? EMPTY_OBJECT;
  const pageState = renderState.derived.pageStates.bySectionId[pageId] ?? EMPTY_OBJECT;
  const schemaSection = QUESTIONNAIRE_SECTIONS_BY_ID[pageId];
  const criterionFieldIds = schemaSection.fieldIds.filter(
    (fieldId) => QUESTIONNAIRE_FIELDS_BY_ID[fieldId].criterionCode === criterionCode,
  );
  const localSkipRequested = criterionState.skipState === SKIP_STATES.USER_SKIPPED
    || criterionState.skipMeta?.requested === true;
  const inheritedSectionSkip = criterionState.skipState === SKIP_STATES.INHERITED_SECTION_SKIP;
  const systemSkipped = criterionState.skipState === SKIP_STATES.SYSTEM_SKIPPED;

  return {
    pageId,
    criterionCode,
    elementId: getCriterionElementId(criterionCode),
    headingId: `${getCriterionElementId(criterionCode)}-heading`,
    criterion,
    criterionState,
    skipScaffold: {
      elementId: getCriterionMetaElementId(criterionCode, 'skip-scaffold'),
      labelId: `${getCriterionMetaElementId(criterionCode, 'skip-scaffold')}-label`,
      helpId: `${getCriterionMetaElementId(criterionCode, 'skip-scaffold')}-help`,
      toggleControlId: `${getCriterionMetaElementId(criterionCode, 'skip-scaffold')}-toggle`,
      reasonControlId: `${getCriterionMetaElementId(criterionCode, 'skip-scaffold')}-reason`,
      rationaleControlId: `${getCriterionMetaElementId(criterionCode, 'skip-scaffold')}-rationale`,
      reasonValue: getCriterionRecordValue(criterionRecord, 'skipReasonCode'),
      rationaleValue: getCriterionRecordValue(criterionRecord, 'skipRationale'),
      requested: localSkipRequested,
      inheritedSectionSkip,
      systemSkipped,
      controlsEnabled: pageState.isEditable && localSkipRequested && !inheritedSectionSkip && !systemSkipped,
      isEditable: pageState.isEditable,
      options: (OPTION_SETS[OPTION_SET_IDS.SKIP_REASON_CODES]?.options ?? EMPTY_ARRAY)
        .filter((option) => option.availability !== 'system'),
    },
    evidenceEditable:
      pageState.isEditable
      && criterionState.skipState !== SKIP_STATES.USER_SKIPPED
      && criterionState.skipState !== SKIP_STATES.INHERITED_SECTION_SKIP
      && criterionState.skipState !== SKIP_STATES.SYSTEM_SKIPPED,
    fieldModels: criterionFieldIds
      .map((fieldId) => buildFieldModel(fieldId, renderState)),
  };
};

const buildSectionMetaModel = (pageId, renderState) => {
  const sectionRecord = renderState.evaluation.sections?.[pageId] ?? EMPTY_OBJECT;
  const pageState = renderState.derived.pageStates.bySectionId[pageId] ?? EMPTY_OBJECT;
  const sectionState = renderState.derived.sectionStates.bySectionId[pageId] ?? EMPTY_OBJECT;

  return {
    pageId,
    pageState,
    note: {
      elementId: getSectionMetaElementId(pageId, 'note'),
      labelId: `${getSectionMetaElementId(pageId, 'note')}-label`,
      helpId: `${getSectionMetaElementId(pageId, 'note')}-help`,
      controlId: `${getSectionMetaElementId(pageId, 'note')}-control`,
      value: typeof sectionRecord.sectionNote === 'string'
        ? sectionRecord.sectionNote
        : typeof sectionRecord.section_note === 'string'
          ? sectionRecord.section_note
          : '',
    },
    skipScaffold: {
      elementId: getSectionMetaElementId(pageId, 'skip-scaffold'),
      labelId: `${getSectionMetaElementId(pageId, 'skip-scaffold')}-label`,
      helpId: `${getSectionMetaElementId(pageId, 'skip-scaffold')}-help`,
      reasonControlId: `${getSectionMetaElementId(pageId, 'skip-scaffold')}-reason`,
      rationaleControlId: `${getSectionMetaElementId(pageId, 'skip-scaffold')}-rationale`,
      reasonValue: typeof sectionRecord.sectionSkipReasonCode === 'string'
        ? sectionRecord.sectionSkipReasonCode
        : typeof sectionRecord.section_skip_reason_code === 'string'
          ? sectionRecord.section_skip_reason_code
          : '',
      rationaleValue: typeof sectionRecord.sectionSkipRationale === 'string'
        ? sectionRecord.sectionSkipRationale
        : typeof sectionRecord.section_skip_rationale === 'string'
          ? sectionRecord.section_skip_rationale
          : '',
      requested: sectionState.skipRequested === true,
      options: (OPTION_SETS[OPTION_SET_IDS.SKIP_REASON_CODES]?.options ?? EMPTY_ARRAY)
        .filter((option) => option.availability !== 'system'),
    },
  };
};

const buildPageModel = (pageId, renderState, options = {}) => {
  const sectionDefinition = SECTION_REGISTRY_BY_ID[pageId];
  const schemaSection = QUESTIONNAIRE_SECTIONS_BY_ID[pageId];
  const layout = PAGE_LAYOUTS[pageId];
  const pageState = renderState.derived.pageStates.bySectionId[pageId] ?? EMPTY_OBJECT;
  const sectionState = renderState.derived.sectionStates.bySectionId[pageId] ?? EMPTY_OBJECT;
  const accentClass = getAccentClass(sectionDefinition);
  const groupModels = layout.groups
    .map((groupLayout) => buildFieldGroupModel(pageId, groupLayout, renderState, options))
    .filter(Boolean);
  const criterionModels = schemaSection.criterionCodes.map((criterionCode) =>
    buildCriterionModel(pageId, criterionCode, renderState, options));

  return {
    pageId,
    schemaSection,
    sectionDefinition,
    layout,
    pageState,
    sectionState,
    accentClass,
    elementId: getPageElementId(pageId),
    headingId: getPageHeadingId(pageId),
    title: getPageTitle(sectionDefinition),
    sectionKickerText: getSectionKickerText(sectionDefinition),
    criterionAnchor: criterionModels.length > 0
      ? {
          anchor: getSummaryAnchorToken(pageId, layout.criterionAnchor),
          elementId: getSummaryAnchorId(pageId, layout.criterionAnchor),
        }
      : null,
    criterionModels,
    groupModels,
    sectionMeta: buildSectionMetaModel(pageId, renderState),
    summaryAnchors: [
      ...(criterionModels.length > 0 ? [getSummaryAnchorToken(pageId, layout.criterionAnchor)] : []),
      ...groupModels.map((groupModel) => groupModel.summaryAnchor),
    ],
  };
};

export const buildQuestionnairePageModels = ({
  store = null,
  evaluation = createEmptyEvaluationState(),
  pageOrder = null,
  respectVisibility = false,
} = {}) => {
  const renderState = resolveRenderState({ store, evaluation, pageOrder });
  const pageModels = renderState.pageOrder.map((pageId) =>
    buildPageModel(pageId, renderState, { respectVisibility }));

  return {
    ...renderState,
    pageModels,
    summaryAnchors: pageModels.flatMap((pageModel) => pageModel.summaryAnchors),
  };
};

const getInputTypeForField = (field) => {
  switch (field.type) {
    case FIELD_TYPES.URL:
      return 'url';
    case FIELD_TYPES.DATE:
      return 'date';
    case FIELD_TYPES.NUMBER:
    case FIELD_TYPES.PERCENT:
      return 'number';
    default:
      return 'text';
  }
};

const createFieldBodyElement = (fieldModel, documentRef) => {
  const describedBy = fieldModel.helpText ? fieldModel.helpId : null;
  const inputDataset = {
    fieldId: fieldModel.fieldId,
    pageId: fieldModel.field.sectionId,
    controlKind: fieldModel.bodyKind,
  };

  switch (fieldModel.bodyKind) {
    case 'rating':
      return createRatingScale({
        documentRef,
        options: fieldModel.optionSet?.options ?? EMPTY_ARRAY,
        selectedValue: fieldModel.rawValue,
        name: fieldModel.ratingGroupName,
        fieldId: fieldModel.fieldId,
        labelId: fieldModel.labelId,
        readOnly: fieldModel.fieldState.readOnly,
        dataset: {
          fieldId: fieldModel.fieldId,
          criterion: fieldModel.field.criterionCode,
          pageId: fieldModel.field.sectionId,
        },
        inputDataset,
        attributes: {
          id: fieldModel.controlId,
          'aria-describedby': describedBy,
        },
      });
    case 'checkbox':
      return createCheckboxBlock({
        documentRef,
        options: fieldModel.optionSet?.options ?? EMPTY_ARRAY,
        selectedValues: fieldModel.checkboxSelections,
        interactive: !fieldModel.fieldState.readOnly,
        name: fieldModel.ratingGroupName,
        dataset: {
          fieldId: fieldModel.fieldId,
          pageId: fieldModel.field.sectionId,
        },
        inputDataset,
        attributes: {
          id: fieldModel.controlId,
          role: 'group',
          'aria-labelledby': fieldModel.labelId,
          'aria-describedby': describedBy,
        },
      });
    case 'select':
      return createSelectControl({
        documentRef,
        options: fieldModel.optionSet?.options ?? EMPTY_ARRAY,
        valueText: fieldModel.controlValue,
        placeholderText: fieldModel.placeholderText,
        shellClassName: fieldModel.mockClassName,
        dataset: inputDataset,
        shellDataset: {
          fieldId: fieldModel.fieldId,
          pageId: fieldModel.field.sectionId,
        },
        attributes: {
          id: fieldModel.controlId,
          'aria-labelledby': fieldModel.labelId,
          'aria-describedby': describedBy,
        },
        disabled: fieldModel.fieldState.readOnly,
      });
    case 'date_range':
      return createDateRangeControl({
        documentRef,
        values: fieldModel.controlValue,
        dataset: inputDataset,
        attributes: {
          'data-field-id': fieldModel.fieldId,
          'aria-labelledby': fieldModel.labelId,
          'aria-describedby': describedBy,
        },
        disabled: fieldModel.fieldState.readOnly,
      });
    case 'textarea':
      return createTextareaControl({
        documentRef,
        valueText: fieldModel.controlValue,
        placeholderText: fieldModel.placeholderText,
        dataset: inputDataset,
        shellDataset: {
          fieldId: fieldModel.fieldId,
          pageId: fieldModel.field.sectionId,
        },
        attributes: {
          id: fieldModel.controlId,
          rows: 5,
          'aria-labelledby': fieldModel.labelId,
          'aria-describedby': describedBy,
        },
        readOnly: fieldModel.fieldState.readOnly,
      });
    default:
      return createInputControl({
        documentRef,
        inputType: getInputTypeForField(fieldModel.field),
        valueText: fieldModel.controlValue,
        placeholderText: fieldModel.placeholderText,
        dataset: inputDataset,
        shellDataset: {
          fieldId: fieldModel.fieldId,
          pageId: fieldModel.field.sectionId,
        },
        attributes: {
          id: fieldModel.controlId,
          inputmode:
            fieldModel.field.type === FIELD_TYPES.NUMBER || fieldModel.field.type === FIELD_TYPES.PERCENT
              ? 'numeric'
              : null,
          step:
            fieldModel.field.type === FIELD_TYPES.NUMBER || fieldModel.field.type === FIELD_TYPES.PERCENT
              ? '1'
              : null,
          min: fieldModel.field.type === FIELD_TYPES.PERCENT ? '0' : null,
          max: fieldModel.field.type === FIELD_TYPES.PERCENT ? '100' : null,
          'aria-labelledby': fieldModel.labelId,
          'aria-describedby': describedBy,
        },
        readOnly: fieldModel.fieldState.readOnly,
      });
  }
};

const createFieldGroupElement = (fieldModel, documentRef, { respectVisibility = false } = {}) => {
  const fieldGroup = createFieldGroup({
    documentRef,
    labelText: fieldModel.labelText,
    labelId: fieldModel.labelId,
    tagText: fieldModel.tag?.text ?? null,
    tagKind: fieldModel.tag?.kind ?? 'condition',
    body: createFieldBodyElement(fieldModel, documentRef),
    helpText: fieldModel.helpText,
    helpId: fieldModel.helpText ? fieldModel.helpId : null,
    dataset: {
      field: fieldModel.fieldId,
      fieldId: fieldModel.fieldId,
      fieldCode: fieldModel.field.code,
      fieldType: fieldModel.field.type,
      fieldControl: fieldModel.field.control,
      pageId: fieldModel.field.sectionId,
      criterion: fieldModel.field.criterionCode,
      fieldVisible: fieldModel.fieldState.visible,
      fieldRequired: fieldModel.fieldState.required,
      fieldLogicallyRequired: fieldModel.fieldState.logicallyRequired,
      fieldAnswered: fieldModel.fieldState.answered,
      fieldMissing: fieldModel.fieldState.missing,
      fieldReadOnly: fieldModel.fieldState.readOnly,
      fieldValidationState: fieldModel.fieldState.validationState,
      fieldAttention: fieldModel.fieldState.attention,
      fieldInvalid: fieldModel.fieldState.invalid,
      fieldBlocked: fieldModel.fieldState.blocked,
      fieldSuppressedBySkip: fieldModel.fieldState.suppressedBySkip,
      fieldDerived: fieldModel.field.derived,
    },
    attributes: {
      id: fieldModel.elementId,
      hidden: respectVisibility && fieldModel.fieldState.visible === false,
      'aria-hidden': respectVisibility && fieldModel.fieldState.visible === false ? 'true' : null,
    },
  });

  return fieldGroup;
};

const createSectionMetaElement = (sectionMeta, documentRef) => {
  const sectionNoteGroup = createFieldGroup({
    documentRef,
    labelText: 'Section notes / comments',
    labelId: sectionMeta.note.labelId,
    tagText: 'Optional',
    tagKind: 'display',
    body: createTextareaControl({
      documentRef,
      valueText: sectionMeta.note.value,
      placeholderText: 'Add a free-form section note or reviewer comment',
      dataset: {
        sectionId: sectionMeta.pageId,
        controlKind: 'section_note',
        sectionRecordKey: 'sectionNote',
      },
      shellDataset: {
        sectionId: sectionMeta.pageId,
        sectionMeta: 'note',
      },
      attributes: {
        id: sectionMeta.note.controlId,
        rows: 5,
        'aria-labelledby': sectionMeta.note.labelId,
        'aria-describedby': sectionMeta.note.helpId,
      },
      readOnly: !sectionMeta.pageState.isEditable,
    }),
    helpText: SECTION_NOTE_HELP_TEXT,
    helpId: sectionMeta.note.helpId,
    dataset: {
      pageId: sectionMeta.pageId,
      sectionMeta: 'section-note',
    },
    attributes: {
      id: sectionMeta.note.elementId,
    },
  });

  const skipScaffoldBody = createElement('div', {
    documentRef,
    attributes: {
      style: 'display:grid;gap:8px;',
    },
    children: [
      createSelectControl({
        documentRef,
        options: sectionMeta.skipScaffold.options,
        valueText: sectionMeta.skipScaffold.reasonValue,
        placeholderText: 'Select a section skip reason',
        dataset: {
          sectionId: sectionMeta.pageId,
          controlKind: 'section_skip_reason_scaffold',
          sectionRecordKey: 'sectionSkipReasonCode',
        },
        shellDataset: {
          sectionId: sectionMeta.pageId,
          sectionMeta: 'skip-scaffold',
        },
        attributes: {
          id: sectionMeta.skipScaffold.reasonControlId,
          'aria-labelledby': sectionMeta.skipScaffold.labelId,
          'aria-describedby': sectionMeta.skipScaffold.helpId,
        },
        disabled: !sectionMeta.pageState.isEditable,
      }),
      createTextareaControl({
        documentRef,
        valueText: sectionMeta.skipScaffold.rationaleValue,
        placeholderText: 'Explain why the section is being skipped',
        dataset: {
          sectionId: sectionMeta.pageId,
          controlKind: 'section_skip_rationale_scaffold',
          sectionRecordKey: 'sectionSkipRationale',
        },
        shellDataset: {
          sectionId: sectionMeta.pageId,
          sectionMeta: 'skip-scaffold',
        },
        attributes: {
          id: sectionMeta.skipScaffold.rationaleControlId,
          rows: 4,
          'aria-labelledby': sectionMeta.skipScaffold.labelId,
          'aria-describedby': sectionMeta.skipScaffold.helpId,
        },
        readOnly: !sectionMeta.pageState.isEditable,
      }),
    ],
  });

  const skipScaffoldGroup = createFieldGroup({
    documentRef,
    labelText: 'Section skip',
    labelId: sectionMeta.skipScaffold.labelId,
    tagText: sectionMeta.skipScaffold.requested ? 'Active' : 'Optional',
    tagKind: 'display',
    body: skipScaffoldBody,
    helpText: SECTION_SKIP_SCAFFOLD_HELP_TEXT,
    helpId: sectionMeta.skipScaffold.helpId,
    dataset: {
      pageId: sectionMeta.pageId,
      sectionMeta: 'skip-scaffold',
    },
    attributes: {
      id: sectionMeta.skipScaffold.elementId,
    },
  });

  return createFieldGrid({
    documentRef,
    className: 'section-meta-grid',
    dataset: {
      pageId: sectionMeta.pageId,
      sectionMeta: 'true',
    },
    children: [sectionNoteGroup, skipScaffoldGroup],
  });
};

const createFieldGridElement = (groupModel, documentRef, options) =>
  createFieldGrid({
    documentRef,
    layout: groupModel.layout,
    className: groupModel.className,
    summaryAnchor: groupModel.summaryAnchor,
    dataset: {
      pageId: groupModel.pageId,
      summaryKind: groupModel.anchor,
    },
    attributes: {
      id: groupModel.elementId,
    },
    children: groupModel.fieldModels.map((fieldModel) =>
      createFieldGroupElement(fieldModel, documentRef, options)),
  });

const createCriterionSkipElement = (criterionModel, documentRef) => {
  const { skipScaffold } = criterionModel;
  const statusText = skipScaffold.inheritedSectionSkip
    ? 'Inherited'
    : skipScaffold.systemSkipped
      ? 'Workflow'
      : skipScaffold.requested
        ? 'Active'
        : 'Optional';
  const controlsDisabled = !skipScaffold.controlsEnabled;
  const toggleDisabled = !skipScaffold.isEditable || skipScaffold.inheritedSectionSkip || skipScaffold.systemSkipped;

  const body = createElement('div', {
    documentRef,
    attributes: {
      style: 'display:grid;gap:8px;',
    },
    children: [
      createElement('div', {
        documentRef,
        attributes: {
          style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;',
        },
        children: [
          createElement('button', {
            documentRef,
            className: ['evidence-button', skipScaffold.requested ? null : 'evidence-button-primary'],
            text: skipScaffold.requested ? 'Resume criterion' : 'Skip criterion',
            dataset: {
              criterionAction: 'toggle-skip',
              criterionCode: criterionModel.criterionCode,
            },
            attributes: {
              id: skipScaffold.toggleControlId,
              type: 'button',
              disabled: toggleDisabled ? true : null,
              'aria-disabled': String(Boolean(toggleDisabled)),
            },
          }),
          skipScaffold.inheritedSectionSkip
            ? createElement('span', {
                documentRef,
                className: 'field-help',
                text: 'Section skip currently overrides this criterion.',
              })
            : null,
        ],
      }),
      createSelectControl({
        documentRef,
        options: skipScaffold.options,
        valueText: skipScaffold.reasonValue,
        placeholderText: 'Select a criterion skip reason',
        dataset: {
          criterionCode: criterionModel.criterionCode,
          controlKind: 'criterion_skip_reason',
          criterionRecordKey: 'skipReasonCode',
        },
        shellDataset: {
          criterionCode: criterionModel.criterionCode,
          criterionMeta: 'skip-scaffold',
        },
        attributes: {
          id: skipScaffold.reasonControlId,
          'aria-labelledby': skipScaffold.labelId,
          'aria-describedby': skipScaffold.helpId,
        },
        disabled: controlsDisabled,
      }),
      createTextareaControl({
        documentRef,
        valueText: skipScaffold.rationaleValue,
        placeholderText: 'Explain why this criterion is being skipped',
        dataset: {
          criterionCode: criterionModel.criterionCode,
          controlKind: 'criterion_skip_rationale',
          criterionRecordKey: 'skipRationale',
        },
        shellDataset: {
          criterionCode: criterionModel.criterionCode,
          criterionMeta: 'skip-scaffold',
        },
        attributes: {
          id: skipScaffold.rationaleControlId,
          rows: 4,
          'aria-labelledby': skipScaffold.labelId,
          'aria-describedby': skipScaffold.helpId,
        },
        readOnly: controlsDisabled,
      }),
    ],
  });

  return createFieldGroup({
    documentRef,
    labelText: 'Criterion skip',
    labelId: skipScaffold.labelId,
    tagText: statusText,
    tagKind: 'display',
    body,
    helpText: CRITERION_SKIP_SCAFFOLD_HELP_TEXT,
    helpId: skipScaffold.helpId,
    dataset: {
      pageId: criterionModel.pageId,
      criterion: criterionModel.criterionCode,
      criterionMeta: 'skip-scaffold',
      criterionSkipRequested: skipScaffold.requested,
      criterionSkipInherited: skipScaffold.inheritedSectionSkip,
      criterionSkipSystem: skipScaffold.systemSkipped,
    },
    attributes: {
      id: skipScaffold.elementId,
    },
  });
};

export const createQuestionnairePageElement = (pageModel, { documentRef, respectVisibility = false } = {}) => {
  const criteriaStack = pageModel.criterionModels.length > 0
    ? createElement('div', {
        documentRef,
        className: 'criteria-stack',
        dataset: {
          pageId: pageModel.pageId,
          summaryAnchor: pageModel.criterionAnchor.anchor,
        },
        attributes: {
          id: pageModel.criterionAnchor.elementId,
        },
        children: pageModel.criterionModels.map((criterionModel) =>
          createCriterionCard({
            documentRef,
            criterionCode: criterionModel.criterionCode,
            headingId: criterionModel.headingId,
            title: `${criterionModel.criterion.code} — ${criterionModel.criterion.title}`,
            statement: criterionModel.criterion.statement,
            accentClass: pageModel.accentClass,
            dataset: {
              pageId: pageModel.pageId,
              criterionStatus: criterionModel.criterionState.status,
              criterionSkipState: criterionModel.criterionState.skipState,
              criterionValidationState: criterionModel.criterionState.validationState,
              criterionAttention: criterionModel.criterionState.attention,
              criterionInvalid: criterionModel.criterionState.invalid,
              criterionBlocked: criterionModel.criterionState.blocked,
              criterionOrder: criterionModel.criterion.orderWithinSection,
            },
            attributes: {
              id: criterionModel.elementId,
            },
            children: [
              createCriterionSkipElement(criterionModel, documentRef),
              createFieldGrid({
                documentRef,
                layout: 'single',
                dataset: {
                  pageId: pageModel.pageId,
                  criterion: criterionModel.criterionCode,
                },
                children: criterionModel.fieldModels.map((fieldModel) =>
                  createFieldGroupElement(fieldModel, documentRef, { respectVisibility })),
              }),
              createEvidenceBlockElement({
                documentRef,
                scope: createEvidenceScope({
                  pageId: pageModel.pageId,
                  criterionCode: criterionModel.criterionCode,
                }),
                editable: criterionModel.evidenceEditable,
              }),
            ],
          })),
      })
    : null;

  const fieldGrids = pageModel.groupModels.map((groupModel) =>
    createFieldGridElement(groupModel, documentRef, { respectVisibility }));
  const evaluationEvidenceBlock = pageModel.pageId === SECTION_IDS.S2
    ? createEvidenceBlockElement({
        documentRef,
        scope: createEvidenceScope({ pageId: pageModel.pageId }),
        editable: pageModel.pageState.isEditable,
      })
    : null;
  const sectionMeta = createSectionMetaElement(pageModel.sectionMeta, documentRef);

  return createSection({
    documentRef,
    id: pageModel.elementId,
    headingId: pageModel.headingId,
    title: pageModel.title,
    sectionKicker: createSectionKicker({
      documentRef,
      text: pageModel.sectionKickerText,
      accentClass: pageModel.accentClass,
      ariaHidden: pageModel.accentClass === null,
    }),
    dataset: {
      section: pageModel.layout.dataSection,
      pageId: pageModel.pageId,
      page: pageModel.pageId,
      pageSlug: pageModel.sectionDefinition.slug,
      contextTopicId: pageModel.sectionDefinition.contextTopicId,
      accentKey: pageModel.sectionDefinition.accentKey,
      completionGroupId: pageModel.sectionDefinition.completionGroupId,
      pageOrder: pageModel.sectionDefinition.pagerOrder,
      workflowState: pageModel.pageState.workflowState,
      pageEditable: pageModel.pageState.isEditable,
      pageAccessible: pageModel.pageState.isAccessible,
      pageStatus: pageModel.sectionState.status,
      pageValidationState: pageModel.sectionState.validationState,
      pageAttention: pageModel.sectionState.attention,
      pageInvalid: pageModel.sectionState.invalid,
      pageBlocked: pageModel.sectionState.blocked,
    },
    children: [
      criteriaStack,
      ...fieldGrids,
      evaluationEvidenceBlock,
      sectionMeta,
    ],
  });
};

export const createQuestionnairePagesFragment = ({
  documentRef,
  store = null,
  evaluation = createEmptyEvaluationState(),
  pageOrder = null,
  respectVisibility = false,
} = {}) => {
  const resolvedDocumentRef = documentRef ?? globalThis.document;

  assertInvariant(
    resolvedDocumentRef?.createDocumentFragment,
    'A document reference is required to create questionnaire page fragments.',
  );

  const renderBundle = buildQuestionnairePageModels({
    store,
    evaluation,
    pageOrder,
    respectVisibility,
  });
  const fragment = resolvedDocumentRef.createDocumentFragment();

  renderBundle.pageModels.forEach((pageModel) => {
    fragment.appendChild(
      createQuestionnairePageElement(pageModel, {
        documentRef: resolvedDocumentRef,
        respectVisibility,
      }),
    );
  });

  return {
    ...renderBundle,
    fragment,
  };
};

export const renderQuestionnairePages = (
  root,
  {
    store = null,
    evaluation = createEmptyEvaluationState(),
    pageOrder = null,
    respectVisibility = false,
  } = {},
) => {
  assertInvariant(root?.ownerDocument ?? root?.appendChild, 'A root element is required to render questionnaire pages.');

  const documentRef = root.ownerDocument ?? globalThis.document;
  const renderBundle = createQuestionnairePagesFragment({
    documentRef,
    store,
    evaluation,
    pageOrder,
    respectVisibility,
  });

  root.replaceChildren(renderBundle.fragment);
  root.dataset.renderedSource = 'schema';
  root.dataset.renderedPageCount = String(renderBundle.pageModels.length);
  root.dataset.summaryAnchorCount = String(renderBundle.summaryAnchors.length);

  return renderBundle;
};

export const mountQuestionnairePages = renderQuestionnairePages;
export const CANONICAL_QUESTIONNAIRE_PAGE_IDS = RENDERABLE_PAGE_SEQUENCE;
