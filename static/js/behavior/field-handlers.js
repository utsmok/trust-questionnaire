import { OPTION_SET_IDS } from '../config/option-sets.js';
import {
  FIELD_TYPES,
  QUESTIONNAIRE_FIELDS_BY_ID,
  CRITERIA_BY_CODE,
} from '../config/questionnaire-schema.js';
import { SKIP_STATES } from '../config/rules.js';
import { getFieldControlId } from '../render/questionnaire-pages.js';
import { initializeEvidenceUi } from '../render/evidence.js';
import { initializeTestPlanPanel } from '../render/test-plan-panel.js';
import { toArray, getDocumentRef, isPlainObject } from '../utils/shared.js';
const EVIDENCE_BLOCK_SELECTOR = '[data-evidence-block="true"]';
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const createUrlEvidenceItem = ({ url, criterionCode, sectionId }) => ({
  id: `url-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  scope: 'criterion',
  sectionId,
  criterionCode,
  evidenceType: 'link',
  note: url,
  name: url,
  mimeType: null,
  size: null,
  isImage: false,
  dataUrl: null,
  previewDataUrl: null,
  addedAt: new Date().toISOString(),
});

const extractUrlsToEvidence = (control, store) => {
  const value = control.value;
  if (!value) return;

  const urls = value.match(URL_REGEX);
  if (!urls || urls.length === 0) return;

  const criterionCode = control.dataset.fieldId.split('.')[0];
  const sectionId = CRITERIA_BY_CODE[criterionCode]?.sectionId;
  if (!sectionId) return;

  const state = store.getState();
  const existingItems = state.evaluation?.evidence?.criteria?.[criterionCode] ?? [];
  const existingUrls = existingItems
    .filter((item) => item.evidenceType === 'link')
    .map((item) => item.url);

  const newItems = urls
    .filter((url) => !existingUrls.includes(url))
    .map((url) => createUrlEvidenceItem({ url, criterionCode, sectionId }));

  if (newItems.length > 0) {
    store.actions.addCriterionEvidenceItems(criterionCode, newItems);
  }
};

const isFormControl = (value) =>
  value instanceof HTMLInputElement ||
  value instanceof HTMLTextAreaElement ||
  value instanceof HTMLSelectElement;

const getRenderedPageSections = (root) =>
  toArray(root?.children).filter(
    (element) => element instanceof HTMLElement && element.matches('[data-page-id]'),
  );

const setDatasetValue = (element, key, value) => {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  if (value === null || value === undefined || value === false) {
    delete element.dataset[key];
    return;
  }

  element.dataset[key] = typeof value === 'string' ? value : String(value);
};

const SECTION_RECORD_KEY_FALLBACKS = Object.freeze({
  sectionNote: Object.freeze(['sectionNote', 'section_note']),
  sectionSkipReasonCode: Object.freeze(['sectionSkipReasonCode', 'section_skip_reason_code']),
  sectionSkipRationale: Object.freeze(['sectionSkipRationale', 'section_skip_rationale']),
});

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

const getSectionRecordValue = (sectionRecord, key) => {
  const candidateKeys = SECTION_RECORD_KEY_FALLBACKS[key] ?? [key];

  for (const candidateKey of candidateKeys) {
    const candidateValue = sectionRecord?.[candidateKey];

    if (typeof candidateValue === 'string') {
      return candidateValue;
    }
  }

  return '';
};

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

const normalizeListValue = (value, splitter = /[\n,]+/) => {
  const items = Array.isArray(value)
    ? value
    : value instanceof Set
      ? Array.from(value)
      : typeof value === 'string'
        ? value.split(splitter)
        : value === null || value === undefined
          ? []
          : [value];

  return [
    ...new Set(
      items
        .map((item) => (typeof item === 'string' ? item.trim() : String(item).trim()))
        .filter(Boolean),
    ),
  ];
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
      return normalizeListValue(rawValue);
    case FIELD_TYPES.URL_LIST:
      return normalizeListValue(rawValue, /\n+/).join('\n');
    case FIELD_TYPES.DATE_RANGE:
      return serializeDateRangeValue(rawValue);
    case FIELD_TYPES.NUMBER:
    case FIELD_TYPES.PERCENT:
      return rawValue === null || rawValue === undefined ? '' : String(rawValue);
    case FIELD_TYPES.PEOPLE_LIST:
      return normalizeListValue(rawValue).join('\n');
    case FIELD_TYPES.PERSON:
      return typeof rawValue === 'string'
        ? rawValue
        : (rawValue?.name ?? rawValue?.displayName ?? rawValue?.email ?? rawValue?.id ?? '');
    default:
      return typeof rawValue === 'string' ? rawValue : (rawValue ?? '');
  }
};

const getFieldTagText = (field, fieldState) => {
  if (field.derived) {
    return { text: 'Display only', kind: 'display' };
  }

  if (field.requiredPolicy === 'conditional') {
    return {
      text: fieldState.required ? 'Condition active' : 'Conditional',
      kind: 'condition',
    };
  }

  return null;
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

const getRecommendationClassName = (field, rawValue) => {
  if (field.optionSetId !== OPTION_SET_IDS.RECOMMENDATION_STATUS) {
    return '';
  }

  switch (rawValue) {
    case 'recommended':
      return 'recommendation-recommended';
    case 'recommended_with_caveats':
      return 'recommendation-recommended-with-caveats';
    case 'needs_review_provisional':
      return 'recommendation-needs-review-provisional';
    case 'pilot_only':
      return 'recommendation-pilot-only';
    case 'not_recommended':
      return 'recommendation-not-recommended';
    case 'out_of_scope':
      return 'recommendation-out-of-scope';
    default:
      return '';
  }
};

const syncCheckboxItem = (item) => {
  const input = item.querySelector('input[type="checkbox"]');
  item.classList.toggle('has-checked', Boolean(input?.checked));
};

const syncRatingOption = (option, selectedValue, optionValue, readOnly) => {
  const normalizedOptionValue = Number.isFinite(Number(optionValue))
    ? Number(optionValue)
    : optionValue;
  const isSelected =
    selectedValue === normalizedOptionValue ||
    String(selectedValue ?? '') === String(optionValue ?? '');

  const wasNotSelected =
    !option.classList.contains('selected') &&
    !option.classList.contains('score-0') &&
    !option.classList.contains('score-1') &&
    !option.classList.contains('score-2') &&
    !option.classList.contains('score-3');

  option.classList.toggle('selected', isSelected);
  option.classList.toggle('score-0', isSelected && normalizedOptionValue === 0);
  option.classList.toggle('score-1', isSelected && normalizedOptionValue === 1);
  option.classList.toggle('score-2', isSelected && normalizedOptionValue === 2);
  option.classList.toggle('score-3', isSelected && normalizedOptionValue === 3);
  option.setAttribute('aria-checked', String(isSelected));
  option.setAttribute('aria-disabled', String(Boolean(readOnly)));
  option.tabIndex = readOnly ? -1 : 0;

  // Rating selection confirmation pulse
  if (isSelected && wasNotSelected) {
    option.classList.add('is-just-selected');
    const removeClass = () => option.classList.remove('is-just-selected');
    option.addEventListener('animationend', removeClass, { once: true });
    setTimeout(removeClass, 200);
  }

  const input = option.querySelector('input[type="radio"]');
  if (input instanceof HTMLInputElement) {
    input.checked = isSelected;
    input.disabled = Boolean(readOnly);
    input.setAttribute('aria-disabled', String(Boolean(readOnly)));
  }
};

const syncFieldTag = (fieldGroup, field, fieldState) => {
  const tag = fieldGroup.querySelector('.condition-tag, .display-tag');
  const tagMeta = getFieldTagText(field, fieldState);

  if (!tag || !tagMeta) {
    return;
  }

  tag.textContent = tagMeta.text;
  tag.classList.toggle('condition-tag', tagMeta.kind === 'condition');
  tag.classList.toggle('display-tag', tagMeta.kind === 'display');
};

const syncTextLikeControl = (control, fieldState, field) => {
  if (!(control instanceof HTMLInputElement) && !(control instanceof HTMLTextAreaElement)) {
    return;
  }

  const nextValue = serializeFieldValueForControl(field, fieldState.value);

  if (control.value !== nextValue) {
    control.value = nextValue;
  }

  control.readOnly = Boolean(fieldState.readOnly);
  control.setAttribute('aria-readonly', String(Boolean(fieldState.readOnly)));
};

const syncSelectControl = (fieldGroup, fieldState, field) => {
  const select = fieldGroup.querySelector(`select[data-field-id="${field.id}"]`);

  if (!(select instanceof HTMLSelectElement)) {
    return;
  }

  const nextValue = serializeFieldValueForControl(field, fieldState.value);

  if (select.value !== nextValue) {
    select.value = nextValue;
  }

  select.disabled = Boolean(fieldState.readOnly);
  select.setAttribute('aria-disabled', String(Boolean(fieldState.readOnly)));

  const shell = select.closest('.mock-control');
  const judgmentClassName = getJudgmentClassName(field, fieldState.value);
  const recommendationClassName = getRecommendationClassName(field, fieldState.value);

  if (shell instanceof HTMLElement) {
    shell.classList.toggle('judgment-pass', judgmentClassName === 'judgment-pass');
    shell.classList.toggle('judgment-conditional', judgmentClassName === 'judgment-conditional');
    shell.classList.toggle('judgment-fail', judgmentClassName === 'judgment-fail');
    shell.classList.toggle(
      'recommendation-recommended',
      recommendationClassName === 'recommendation-recommended',
    );
    shell.classList.toggle(
      'recommendation-recommended-with-caveats',
      recommendationClassName === 'recommendation-recommended-with-caveats',
    );
    shell.classList.toggle(
      'recommendation-needs-review-provisional',
      recommendationClassName === 'recommendation-needs-review-provisional',
    );
    shell.classList.toggle(
      'recommendation-pilot-only',
      recommendationClassName === 'recommendation-pilot-only',
    );
    shell.classList.toggle(
      'recommendation-not-recommended',
      recommendationClassName === 'recommendation-not-recommended',
    );
    shell.classList.toggle(
      'recommendation-out-of-scope',
      recommendationClassName === 'recommendation-out-of-scope',
    );
  }
};

const syncCheckboxBlock = (fieldGroup, fieldState, field) => {
  const selectedValues = new Set(
    serializeFieldValueForControl(field, fieldState.value).map((value) => String(value)),
  );

  toArray(
    fieldGroup.querySelectorAll(`input[type="checkbox"][data-field-id="${field.id}"]`),
  ).forEach((input) => {
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    input.checked = selectedValues.has(String(input.value));
    input.disabled = Boolean(fieldState.readOnly);
    input.setAttribute('aria-disabled', String(Boolean(fieldState.readOnly)));
    input.tabIndex = fieldState.readOnly ? -1 : 0;
    const item = input.closest('.checkbox-item');
    if (item instanceof HTMLElement) {
      syncCheckboxItem(item);
    }
  });
};

const syncRatingScale = (fieldGroup, fieldState) => {
  const scale = fieldGroup.querySelector('.rating-scale');

  if (scale instanceof HTMLElement) {
    scale.setAttribute('aria-disabled', String(Boolean(fieldState.readOnly)));
  }

  toArray(fieldGroup.querySelectorAll('.rating-option')).forEach((option) => {
    if (!(option instanceof HTMLElement)) {
      return;
    }

    syncRatingOption(
      option,
      fieldState.value,
      option.dataset.optionValue ?? option.dataset.score,
      fieldState.readOnly,
    );
  });
};

const syncDateRangeControl = (fieldGroup, fieldState, field) => {
  const values = serializeFieldValueForControl(field, fieldState.value);

  toArray(fieldGroup.querySelectorAll(`input[type="date"][data-field-id="${field.id}"]`)).forEach(
    (input) => {
      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      const nextValue = input.dataset.fieldPart === 'end' ? values.end : values.start;

      if (input.value !== nextValue) {
        input.value = nextValue;
      }

      input.disabled = Boolean(fieldState.readOnly);
      input.setAttribute('aria-disabled', String(Boolean(fieldState.readOnly)));
    },
  );
};

const syncScoreDropdown = (fieldGroup, fieldState) => {
  const dropdown = fieldGroup.querySelector('.score-dropdown');
  if (!(dropdown instanceof HTMLElement)) return;

  const trigger = dropdown.querySelector('.score-dropdown-trigger');
  const indicator = dropdown.querySelector('.score-dropdown-indicator');
  const valueSpan = dropdown.querySelector('.score-dropdown-value');
  const panel = dropdown.querySelector('.score-dropdown-panel');
  const rawValue = fieldState.value;

  const isOpen = dropdown.classList.contains('is-open');
  if (!isOpen) {
    if (panel) {
      panel.hidden = true;
      panel.setAttribute('aria-hidden', 'true');
    }
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
    }
  }

  for (let i = 0; i <= 3; i++) dropdown.classList.remove(`score-dropdown--score-${i}`);

  const options = dropdown.querySelectorAll('.score-dropdown-option');
  options.forEach((opt) => {
    const isSelected = String(rawValue ?? '') === String(opt.dataset.optionValue);
    opt.classList.toggle('is-selected', isSelected);
    opt.setAttribute('aria-selected', String(isSelected));
  });

  if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
    const numVal = Number(rawValue);
    const selectedOpt = dropdown.querySelector(
      `.score-dropdown-option[data-option-value="${numVal}"]`,
    );
    const label =
      selectedOpt?.querySelector('.score-dropdown-option-label')?.textContent ?? String(numVal);
    if (valueSpan) valueSpan.textContent = `${numVal} \u2014 ${label}`;
    dropdown.classList.add(`score-dropdown--score-${numVal}`);
  } else {
    if (valueSpan) valueSpan.textContent = 'Select a score';
  }

  dropdown.classList.toggle('is-disabled', Boolean(fieldState.readOnly));
  if (trigger) {
    trigger.disabled = Boolean(fieldState.readOnly);
    trigger.setAttribute('aria-disabled', String(Boolean(fieldState.readOnly)));
  }
};

const syncFieldValidationAccessibility = (fieldGroup, fieldState, fieldId) => {
  const { validationState, issues } = fieldState;
  const isErrored = validationState === 'invalid' || validationState === 'blocked';
  const controlId = getFieldControlId(fieldId);
  const control = fieldGroup.querySelector(`[id="${controlId}"]`);
  const targets = control
    ? [control]
    : toArray(fieldGroup.querySelectorAll('input, select, textarea'));

  for (const target of targets) {
    if (isErrored) {
      target.setAttribute('aria-invalid', 'true');
    } else {
      target.removeAttribute('aria-invalid');
    }
  }

  const existing = fieldGroup.querySelector('.validation-message');

  if (isErrored && Array.isArray(issues) && issues.length > 0) {
    const text = issues.map((issue) => issue.message).join(' ');
    if (existing) {
      existing.textContent = text;
    } else {
      const doc = fieldGroup.ownerDocument;
      const msg = doc.createElement('div');
      msg.className = 'validation-message';
      msg.setAttribute('role', 'alert');
      msg.textContent = text;
      fieldGroup.appendChild(msg);
    }
  } else if (existing) {
    existing.remove();
  }
};

const syncFieldGroup = (fieldGroup, state) => {
  const fieldId = fieldGroup.dataset.fieldId;
  const field = QUESTIONNAIRE_FIELDS_BY_ID[fieldId] ?? null;
  const fieldState = state.derived.fieldStates.byId[fieldId] ?? null;

  if (!field || !fieldState) {
    return;
  }

  fieldGroup.hidden = fieldState.visible === false;

  if (fieldState.visible === false) {
    fieldGroup.setAttribute('aria-hidden', 'true');
  } else {
    fieldGroup.removeAttribute('aria-hidden');
  }

  setDatasetValue(fieldGroup, 'fieldVisible', fieldState.visible);
  setDatasetValue(fieldGroup, 'fieldRequired', fieldState.required);
  setDatasetValue(fieldGroup, 'fieldLogicallyRequired', fieldState.logicallyRequired);
  setDatasetValue(fieldGroup, 'fieldAnswered', fieldState.answered);
  setDatasetValue(fieldGroup, 'fieldMissing', fieldState.missing);
  setDatasetValue(fieldGroup, 'fieldReadOnly', fieldState.readOnly);
  setDatasetValue(fieldGroup, 'fieldValidationState', fieldState.validationState);
  setDatasetValue(fieldGroup, 'fieldAttention', fieldState.attention);
  setDatasetValue(fieldGroup, 'fieldInvalid', fieldState.invalid);
  setDatasetValue(fieldGroup, 'fieldBlocked', fieldState.blocked);
  setDatasetValue(fieldGroup, 'fieldSuppressedBySkip', fieldState.suppressedBySkip);
  syncFieldTag(fieldGroup, field, fieldState);
  syncFieldValidationAccessibility(fieldGroup, fieldState, fieldId);

  if (fieldId.endsWith('.evidence')) {
    const textarea = fieldGroup.querySelector('textarea');
    if (textarea && !textarea.placeholder) {
      textarea.placeholder = 'Paste screenshots, links, or files to add as evidence.';
    }
  }

  switch (field.control) {
    case 'score_dropdown':
      syncScoreDropdown(fieldGroup, fieldState);
      break;
    case 'radio_group':
      syncRatingScale(fieldGroup, fieldState);
      break;
    case 'checkbox_group':
    case 'derived_checklist':
      syncCheckboxBlock(fieldGroup, fieldState, field);
      break;
    case 'dropdown':
    case 'computed_select':
      syncSelectControl(fieldGroup, fieldState, field);
      break;
    case 'date_range':
      syncDateRangeControl(fieldGroup, fieldState, field);
      break;
    case 'textarea':
    case 'url_list':
    case 'people_list_input': {
      const textarea = fieldGroup.querySelector(`textarea[data-field-id="${field.id}"]`);
      syncTextLikeControl(textarea, fieldState, field);
      break;
    }
    default: {
      const input = fieldGroup.querySelector(`input[data-field-id="${field.id}"]`);
      syncTextLikeControl(input, fieldState, field);
      break;
    }
  }
};

const syncCriterionCards = (questionnaireRoot, state) => {
  toArray(questionnaireRoot.querySelectorAll('.criterion-card[data-criterion]')).forEach((card) => {
    if (!(card instanceof HTMLElement)) {
      return;
    }

    const criterionCode = card.dataset.criterion;
    const criterionState = state.derived.criterionStates.byCode[criterionCode] ?? null;

    if (!criterionState) {
      return;
    }

    setDatasetValue(card, 'criterionStatus', criterionState.status);
    setDatasetValue(card, 'criterionSkipState', criterionState.skipState);
    setDatasetValue(card, 'criterionValidationState', criterionState.validationState);
    setDatasetValue(card, 'criterionAttention', criterionState.attention);
    setDatasetValue(card, 'criterionInvalid', criterionState.invalid);
    setDatasetValue(card, 'criterionBlocked', criterionState.blocked);

    const skipFieldGroup = card.querySelector('[data-criterion-meta="skip-scaffold"]');
    if (!(skipFieldGroup instanceof HTMLElement)) {
      return;
    }

    const criterionRecord = state.evaluation.criteria?.[criterionCode] ?? {};
    const pageState = state.derived.pageStates.bySectionId[criterionState.sectionId] ?? null;
    const localSkipRequested =
      criterionState.skipState === SKIP_STATES.USER_SKIPPED ||
      criterionState.skipMeta?.requested === true;
    const inheritedSectionSkip = criterionState.skipState === SKIP_STATES.INHERITED_SECTION_SKIP;
    const systemSkipped = criterionState.skipState === SKIP_STATES.SYSTEM_SKIPPED;
    const controlsEnabled =
      Boolean(pageState?.isEditable) &&
      localSkipRequested &&
      !inheritedSectionSkip &&
      !systemSkipped;

    setDatasetValue(skipFieldGroup, 'criterionSkipRequested', localSkipRequested);
    setDatasetValue(skipFieldGroup, 'criterionSkipInherited', inheritedSectionSkip);
    setDatasetValue(skipFieldGroup, 'criterionSkipSystem', systemSkipped);

    if (localSkipRequested || inheritedSectionSkip || systemSkipped) {
      if (skipFieldGroup instanceof HTMLDetailsElement && !skipFieldGroup.open) {
        skipFieldGroup.open = true;
      }
    }

    const tag = skipFieldGroup.querySelector('.display-tag, .condition-tag');
    if (tag instanceof HTMLElement) {
      tag.textContent = inheritedSectionSkip
        ? 'Inherited'
        : systemSkipped
          ? 'Workflow'
          : localSkipRequested
            ? 'Active'
            : 'Optional';
    }

    const toggleButton = skipFieldGroup.querySelector('[data-criterion-action="toggle-skip"]');
    if (toggleButton instanceof HTMLButtonElement) {
      const toggleDisabled = !pageState?.isEditable || inheritedSectionSkip || systemSkipped;
      toggleButton.textContent = localSkipRequested ? 'Resume criterion' : 'Skip criterion';
      toggleButton.disabled = Boolean(toggleDisabled);
      toggleButton.setAttribute('aria-disabled', String(Boolean(toggleDisabled)));
    }

    const reasonControl = skipFieldGroup.querySelector(
      'select[data-criterion-record-key="skipReasonCode"]',
    );
    if (reasonControl instanceof HTMLSelectElement) {
      const nextValue = getCriterionRecordValue(criterionRecord, 'skipReasonCode');
      if (reasonControl.value !== nextValue) {
        reasonControl.value = nextValue;
      }

      reasonControl.disabled = !controlsEnabled;
      reasonControl.setAttribute('aria-disabled', String(Boolean(!controlsEnabled)));
    }

    const rationaleControl = skipFieldGroup.querySelector(
      'textarea[data-criterion-record-key="skipRationale"]',
    );
    if (rationaleControl instanceof HTMLTextAreaElement) {
      const nextValue = getCriterionRecordValue(criterionRecord, 'skipRationale');
      if (rationaleControl.value !== nextValue) {
        rationaleControl.value = nextValue;
      }

      rationaleControl.readOnly = !controlsEnabled;
      rationaleControl.setAttribute('aria-readonly', String(Boolean(!controlsEnabled)));
    }
  });
};

const syncPageSections = (questionnaireRoot, state) => {
  getRenderedPageSections(questionnaireRoot).forEach((section) => {
    if (!(section instanceof HTMLElement)) {
      return;
    }

    const pageId = section.dataset.pageId;
    const sectionState = state.derived.sectionStates.bySectionId[pageId] ?? null;

    if (!sectionState) {
      return;
    }

    setDatasetValue(section, 'pageStatus', sectionState.status);
    setDatasetValue(section, 'pageValidationState', sectionState.validationState);
    setDatasetValue(section, 'pageAttention', sectionState.attention);
    setDatasetValue(section, 'pageInvalid', sectionState.invalid);
    setDatasetValue(section, 'pageBlocked', sectionState.blocked);
  });
};

const syncSectionMetaControls = (questionnaireRoot, state) => {
  toArray(questionnaireRoot.querySelectorAll('[data-section-record-key]')).forEach((control) => {
    if (
      !(control instanceof HTMLTextAreaElement) &&
      !(control instanceof HTMLSelectElement) &&
      !(control instanceof HTMLInputElement)
    ) {
      return;
    }

    const sectionId = control.dataset.sectionId;
    const recordKey = control.dataset.sectionRecordKey;

    if (!sectionId || !recordKey) {
      return;
    }

    const pageState = state.derived.pageStates.bySectionId[sectionId] ?? null;
    const sectionRecord = state.evaluation.sections?.[sectionId] ?? {};
    const nextValue = getSectionRecordValue(sectionRecord, recordKey);

    if (control.value !== nextValue) {
      control.value = nextValue;
    }

    const isEditable = Boolean(pageState?.isEditable);

    if (control instanceof HTMLSelectElement) {
      control.disabled = !isEditable;
      control.setAttribute('aria-disabled', String(Boolean(!isEditable)));
      return;
    }

    control.readOnly = !isEditable;
    control.setAttribute('aria-readonly', String(Boolean(!isEditable)));
  });

  toArray(questionnaireRoot.querySelectorAll('[data-section-meta="skip-scaffold"]')).forEach(
    (fieldGroup) => {
      if (!(fieldGroup instanceof HTMLElement)) {
        return;
      }

      const sectionId = fieldGroup.dataset.pageId;

      if (!sectionId) {
        return;
      }

      const sectionState = state.derived.sectionStates.bySectionId[sectionId] ?? null;
      const tag = fieldGroup.querySelector('.display-tag, .condition-tag');

      if (tag instanceof HTMLElement) {
        tag.textContent = sectionState?.skipRequested ? 'Active' : 'Optional';
      }

      if (sectionState?.skipRequested) {
        if (fieldGroup instanceof HTMLDetailsElement && !fieldGroup.open) {
          fieldGroup.open = true;
        }
      }
    },
  );
};

const resolveFieldValueFromControl = (control, field) => {
  switch (field.type) {
    case FIELD_TYPES.MULTI_SELECT:
    case FIELD_TYPES.CHECKLIST: {
      const fieldGroup = control.closest(`.field-group[data-field-id="${field.id}"]`);
      return toArray(
        fieldGroup?.querySelectorAll(`input[type="checkbox"][data-field-id="${field.id}"]`),
      )
        .filter((input) => input instanceof HTMLInputElement && input.checked)
        .map((input) => input.value);
    }
    case FIELD_TYPES.DATE_RANGE: {
      const fieldGroup = control.closest(`.field-group[data-field-id="${field.id}"]`);
      const start = fieldGroup?.querySelector(
        `input[type="date"][data-field-id="${field.id}"][data-field-part="start"]`,
      );
      const end = fieldGroup?.querySelector(
        `input[type="date"][data-field-id="${field.id}"][data-field-part="end"]`,
      );

      return {
        start: start instanceof HTMLInputElement ? start.value : '',
        end: end instanceof HTMLInputElement ? end.value : '',
      };
    }
    default:
      return control.value;
  }
};

const handleFieldControlCommit = (control, store) => {
  const fieldId = control.dataset.fieldId;
  const field = QUESTIONNAIRE_FIELDS_BY_ID[fieldId] ?? null;

  if (!field) {
    return;
  }

  store.actions.setFieldValue(fieldId, resolveFieldValueFromControl(control, field));
};

const handleSectionControlCommit = (control, store) => {
  const sectionId = control.dataset.sectionId;
  const key = control.dataset.sectionRecordKey;

  if (!sectionId || !key) {
    return;
  }

  store.actions.setSectionValue(sectionId, key, control.value);
};

const handleCriterionControlCommit = (control, store) => {
  const criterionCode = control.dataset.criterionCode;
  const key = control.dataset.criterionRecordKey;

  if (!criterionCode || !key) {
    return;
  }

  switch (key) {
    case 'skipReasonCode':
      store.actions.setCriterionSkipReasonCode(criterionCode, control.value);
      break;
    case 'skipRationale':
      store.actions.setCriterionSkipRationale(criterionCode, control.value);
      break;
    default:
      store.actions.setCriterionValue(criterionCode, key, control.value);
      break;
  }
};

export const initializeFieldHandlers = ({ root = document, store }) => {
  const documentRef = getDocumentRef(root);
  const questionnaireRoot = documentRef.getElementById('questionnaireRenderRoot');

  if (!questionnaireRoot || !store?.subscribe || !store?.actions) {
    return {
      destroy() {},
    };
  }

  const cleanup = [];

  const handleInput = (event) => {
    const control = event.target;

    if (!isFormControl(control)) {
      return;
    }

    if (control.disabled || control.readOnly) {
      return;
    }

    if (control.dataset.sectionRecordKey) {
      handleSectionControlCommit(control, store);
      return;
    }

    if (control.dataset.criterionRecordKey) {
      handleCriterionControlCommit(control, store);
      return;
    }

    if (control.closest(EVIDENCE_BLOCK_SELECTOR)) {
      return;
    }

    if (!control.dataset.fieldId) {
      return;
    }

    if (
      control instanceof HTMLInputElement &&
      (control.type === 'checkbox' || control.type === 'radio')
    ) {
      return;
    }

    if (control instanceof HTMLSelectElement) {
      return;
    }

    handleFieldControlCommit(control, store);

    if (
      control instanceof HTMLTextAreaElement &&
      control.dataset.fieldId &&
      control.dataset.fieldId.endsWith('.evidence')
    ) {
      extractUrlsToEvidence(control, store);
    }
  };

  const handleChange = (event) => {
    const control = event.target;

    if (!isFormControl(control)) {
      return;
    }

    if (control.disabled || control.readOnly) {
      return;
    }

    if (control.dataset.sectionRecordKey) {
      handleSectionControlCommit(control, store);
      return;
    }

    if (control.dataset.criterionRecordKey) {
      handleCriterionControlCommit(control, store);
      return;
    }

    if (control.closest(EVIDENCE_BLOCK_SELECTOR)) {
      return;
    }

    if (!control.dataset.fieldId) {
      return;
    }

    handleFieldControlCommit(control, store);

    if (
      control instanceof HTMLTextAreaElement &&
      control.dataset.fieldId &&
      control.dataset.fieldId.endsWith('.evidence')
    ) {
      extractUrlsToEvidence(control, store);
    }
  };

  const handleClick = (event) => {
    const actionTarget =
      event.target instanceof HTMLElement
        ? event.target.closest('[data-criterion-action="toggle-skip"]')
        : null;

    if (!(actionTarget instanceof HTMLButtonElement)) {
      return;
    }

    const criterionCode = actionTarget.dataset.criterionCode;

    if (!criterionCode) {
      return;
    }

    const criterionState = store.getState().derived.criterionStates.byCode[criterionCode] ?? null;
    if (!criterionState) {
      return;
    }

    const localSkipRequested =
      criterionState.skipState === SKIP_STATES.USER_SKIPPED ||
      criterionState.skipMeta?.requested === true;
    const inheritedSectionSkip = criterionState.skipState === SKIP_STATES.INHERITED_SECTION_SKIP;
    const systemSkipped = criterionState.skipState === SKIP_STATES.SYSTEM_SKIPPED;

    if (actionTarget.disabled || inheritedSectionSkip || systemSkipped) {
      return;
    }

    if (localSkipRequested) {
      store.actions.clearCriterionSkip(criterionCode);
      return;
    }

    store.actions.setCriterionSkipRequested(criterionCode, true);

    const skipDetails = questionnaireRoot.querySelector(
      `details[data-criterion-meta="skip-scaffold"][data-criterion="${criterionCode}"]`,
    );
    if (skipDetails instanceof HTMLDetailsElement) {
      skipDetails.open = true;
    }

    queueMicrotask(() => {
      const reasonControl = questionnaireRoot.querySelector(
        `select[data-criterion-record-key="skipReasonCode"][data-criterion-code="${criterionCode}"]`,
      );

      if (reasonControl instanceof HTMLSelectElement) {
        reasonControl.focus();
      }
    });
  };

  const closeScoreDropdown = (dropdown) => {
    dropdown.classList.remove('is-open');
    const panel = dropdown.querySelector('.score-dropdown-panel');
    if (panel) {
      panel.hidden = true;
      panel.setAttribute('aria-hidden', 'true');
    }
    const trig = dropdown.querySelector('.score-dropdown-trigger');
    if (trig) {
      trig.setAttribute('aria-expanded', 'false');
      trig.focus();
    }
  };

  const openScoreDropdown = (dropdown) => {
    const panel = dropdown?.querySelector('.score-dropdown-panel');
    const trigger = dropdown?.querySelector('.score-dropdown-trigger');
    if (!dropdown || !panel) return;
    dropdown.classList.add('is-open');
    panel.hidden = false;
    panel.setAttribute('aria-hidden', 'false');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    const selected =
      panel.querySelector('.score-dropdown-option.is-selected') ||
      panel.querySelector('.score-dropdown-option');
    if (selected instanceof HTMLElement) selected.focus();
  };

  const handleScoreDropdownClick = (event) => {
    if (!(event.target instanceof HTMLElement)) return;

    const openDropdowns = questionnaireRoot.querySelectorAll('.score-dropdown.is-open');
    openDropdowns.forEach((d) => {
      if (!d.contains(event.target)) closeScoreDropdown(d);
    });

    const triggerEl = event.target.closest('.score-dropdown-trigger');
    if (triggerEl) {
      if (triggerEl.disabled || triggerEl.getAttribute('aria-disabled') === 'true') {
        return;
      }

      const dropdown = triggerEl.closest('.score-dropdown');
      if (dropdown?.classList.contains('is-open')) {
        closeScoreDropdown(dropdown);
      } else {
        openScoreDropdown(dropdown);
      }
      return;
    }

    const option = event.target.closest('.score-dropdown-option');
    if (option) {
      const dropdown = option.closest('.score-dropdown');
      const fieldIdValue = dropdown?.dataset?.fieldId;
      if (fieldIdValue) {
        store.actions.setFieldValue(fieldIdValue, option.dataset.optionValue);
      }
      if (dropdown) closeScoreDropdown(dropdown);
    }
  };

  const handleScoreDropdownKeydown = (event) => {
    if (!(event.target instanceof HTMLElement)) return;

    const trigger = event.target.closest('.score-dropdown-trigger');
    const option = event.target.closest('.score-dropdown-option');

    if (!trigger && !option) return;

    const dropdown = (trigger || option).closest('.score-dropdown');
    const panel = dropdown?.querySelector('.score-dropdown-panel');
    if (!dropdown || !panel) return;
    if (trigger?.disabled || trigger?.getAttribute('aria-disabled') === 'true') {
      return;
    }

    const options = Array.from(panel.querySelectorAll('.score-dropdown-option'));
    if (options.length === 0) return;

    const isOpen = dropdown.classList.contains('is-open');

    if (trigger && !isOpen && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openScoreDropdown(dropdown);
      return;
    }

    if (!isOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeScoreDropdown(dropdown);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const currentIndex = options.indexOf(event.target);
      let nextIndex;
      if (event.key === 'ArrowDown') {
        nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
      }
      options[nextIndex].focus();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const fieldIdValue = dropdown.dataset?.fieldId;
      if (fieldIdValue && option?.dataset?.optionValue) {
        store.actions.setFieldValue(fieldIdValue, option.dataset.optionValue);
      }
      closeScoreDropdown(dropdown);
      return;
    }

    if (event.key === 'Home' || event.key === 'PageUp') {
      event.preventDefault();
      options[0].focus();
      return;
    }

    if (event.key === 'End' || event.key === 'PageDown') {
      event.preventDefault();
      options[options.length - 1].focus();
      return;
    }
  };

  questionnaireRoot.addEventListener('input', handleInput);
  questionnaireRoot.addEventListener('change', handleChange);
  questionnaireRoot.addEventListener('click', handleClick);
  questionnaireRoot.addEventListener('click', handleScoreDropdownClick);
  questionnaireRoot.addEventListener('keydown', handleScoreDropdownKeydown);
  cleanup.push(() => {
    questionnaireRoot.removeEventListener('input', handleInput);
    questionnaireRoot.removeEventListener('change', handleChange);
    questionnaireRoot.removeEventListener('click', handleClick);
    questionnaireRoot.removeEventListener('click', handleScoreDropdownClick);
    questionnaireRoot.removeEventListener('keydown', handleScoreDropdownKeydown);
  });

  const evidenceUi = initializeEvidenceUi({
    root: documentRef,
    store,
  });
  cleanup.push(() => {
    evidenceUi.destroy();
  });

  const testPlanPanel = initializeTestPlanPanel({
    root: documentRef,
    store,
  });
  cleanup.push(() => {
    testPlanPanel.destroy();
  });

  const unsubscribe = store.subscribe(
    (state) => {
      const activePageId = state.ui?.activePageId;
      const activeSection = activePageId
        ? questionnaireRoot.querySelector(`[data-page-id="${activePageId}"]`)
        : null;
      const scope = activeSection instanceof HTMLElement ? activeSection : questionnaireRoot;
      toArray(scope.querySelectorAll('.field-group[data-field-id]')).forEach((fieldGroup) => {
        if (fieldGroup instanceof HTMLElement) {
          syncFieldGroup(fieldGroup, state);
        }
      });

      syncPageSections(questionnaireRoot, state);
      syncCriterionCards(questionnaireRoot, state);
      syncSectionMetaControls(questionnaireRoot, state);
    },
    { immediate: true },
  );

  cleanup.push(unsubscribe);

  return {
    destroy() {
      cleanup.splice(0).forEach((dispose) => {
        dispose();
      });
    },
  };
};
