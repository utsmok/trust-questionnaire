const isNodeLike = (value) =>
  Boolean(value) && typeof value === 'object' && typeof value.nodeType === 'number';

const resolveDocumentRef = (documentRef) => {
  if (documentRef?.createElement) {
    return documentRef;
  }

  throw new Error(
    '[dom-factories] A document reference is required to create questionnaire DOM nodes.',
  );
};

const INLINE_TEXT_CONTROL_STYLE = [
  'width:100%',
  'min-width:0',
  'border:0',
  'background:transparent',
  'color:var(--ut-text)',
  'font:inherit',
  'line-height:inherit',
  'padding:0',
  'margin:0',
  'outline:none',
].join(';');

const INLINE_TEXTAREA_STYLE = [
  INLINE_TEXT_CONTROL_STYLE,
  'min-height:96px',
  'resize:vertical',
].join(';');

const INLINE_SELECT_STYLE = [
  INLINE_TEXT_CONTROL_STYLE,
  'appearance:none',
  '-webkit-appearance:none',
  '-moz-appearance:none',
  'flex:1 1 auto',
].join(';');

const INLINE_HIDDEN_CHOICE_INPUT_STYLE = [
  'position:absolute',
  'inset:0',
  'width:100%',
  'height:100%',
  'margin:0',
  'opacity:0',
  'pointer-events:none',
].join(';');

const INLINE_STACK_STYLE = ['display:grid', 'gap:8px'].join(';');

const toClassNames = (value) => {
  if (!value) {
    return [];
  }

  const candidates = Array.isArray(value) ? value : [value];

  return candidates
    .flatMap((candidate) => String(candidate).split(/\s+/))
    .map((candidate) => candidate.trim())
    .filter(Boolean);
};

const setDataset = (element, dataset = {}) => {
  Object.entries(dataset).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) {
      return;
    }

    element.dataset[key] = typeof value === 'string' ? value : String(value);
  });

  return element;
};

const setAttributes = (element, attributes = {}) => {
  Object.entries(attributes).forEach(([name, value]) => {
    if (value === null || value === undefined || value === false) {
      return;
    }

    if (name === 'hidden') {
      element.hidden = Boolean(value);
      return;
    }

    if (value === true) {
      element.setAttribute(name, '');
      return;
    }

    element.setAttribute(name, String(value));
  });

  return element;
};

export const appendChildren = (parent, children = []) => {
  const childList = Array.isArray(children) ? children : [children];

  childList.flat().forEach((child) => {
    if (child === null || child === undefined || child === false) {
      return;
    }

    if (isNodeLike(child)) {
      parent.appendChild(child);
      return;
    }

    parent.appendChild(parent.ownerDocument.createTextNode(String(child)));
  });

  return parent;
};

export const createElement = (
  tagName,
  {
    documentRef,
    className = '',
    text = null,
    html = null,
    attributes = {},
    dataset = {},
    children = [],
  } = {},
) => {
  const documentNode = resolveDocumentRef(documentRef);
  const element = documentNode.createElement(tagName);

  toClassNames(className).forEach((token) => {
    element.classList.add(token);
  });

  setAttributes(element, attributes);
  setDataset(element, dataset);

  if (html !== null && html !== undefined) {
    element.innerHTML = html;
  } else if (text !== null && text !== undefined) {
    element.textContent = text;
  }

  appendChildren(element, children);

  return element;
};

export const createTag = ({ documentRef, text, kind = 'display', className = '' } = {}) =>
  createElement('span', {
    documentRef,
    className: [kind === 'condition' ? 'condition-tag' : 'display-tag', className],
    text,
  });

export const createSectionKicker = ({
  documentRef,
  text,
  accentClass = null,
  ariaHidden = true,
} = {}) =>
  createElement('div', {
    documentRef,
    className: ['section-kicker', accentClass],
    text,
    attributes: {
      'aria-hidden': ariaHidden ? 'true' : null,
    },
  });

export const createFieldLabel = ({
  documentRef,
  id = null,
  labelText,
  tagText = null,
  tagKind = 'condition',
} = {}) => {
  const children = [
    createElement('span', {
      documentRef,
      text: labelText,
    }),
  ];

  if (tagText) {
    children.push(
      createTag({
        documentRef,
        text: tagText,
        kind: tagKind,
      }),
    );
  }

  return createElement('div', {
    documentRef,
    className: 'field-label',
    attributes: {
      id,
    },
    children,
  });
};

export const createFieldHelp = ({ documentRef, id = null, text } = {}) => {
  if (!text) {
    return null;
  }

  return createElement('div', {
    documentRef,
    className: 'field-help',
    attributes: {
      id,
    },
    text,
  });
};

export const createFieldGrid = ({
  documentRef,
  layout = 'default',
  className = '',
  summaryAnchor = null,
  dataset = {},
  attributes = {},
  children = [],
} = {}) =>
  createElement('div', {
    documentRef,
    className: ['field-grid', layout === 'single' ? 'single' : null, className],
    dataset: {
      ...dataset,
      summaryAnchor,
    },
    attributes,
    children,
  });

export const createFieldGroup = ({
  documentRef,
  labelText,
  labelId = null,
  tagText = null,
  tagKind = 'condition',
  body = null,
  helpText = null,
  helpId = null,
  className = '',
  dataset = {},
  attributes = {},
} = {}) => {
  const fieldGroup = createElement('div', {
    documentRef,
    className: ['field-group', className],
    dataset,
    attributes,
  });

  fieldGroup.appendChild(
    createFieldLabel({
      documentRef,
      id: labelId,
      labelText,
      tagText,
      tagKind,
    }),
  );

  appendChildren(fieldGroup, body);

  const help = createFieldHelp({ documentRef, id: helpId, text: helpText });
  if (help) {
    fieldGroup.appendChild(help);
  }

  return fieldGroup;
};

const normalizeTextLines = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeTextLines(entry)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\n+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (value === null || value === undefined) {
    return [];
  }

  return [String(value)];
};

export const createPlaceholderLine = ({ documentRef, widthClass = 'w-90' } = {}) =>
  createElement('div', {
    documentRef,
    className: ['placeholder-line', widthClass],
  });

export const createMockControl = ({
  documentRef,
  valueText = null,
  placeholderText = '',
  showArrow = false,
  emphasiseValue = true,
  className = '',
  dataset = {},
  attributes = {},
} = {}) => {
  const hasValue = valueText !== null && valueText !== undefined && String(valueText).trim() !== '';
  const controlChildren = [
    createElement('span', {
      documentRef,
      className: hasValue && emphasiseValue ? 'value' : '',
      text: hasValue ? String(valueText) : String(placeholderText),
    }),
  ];

  if (showArrow) {
    controlChildren.push(
      createElement('span', {
        documentRef,
        className: 'arrow',
        text: '▾',
      }),
    );
  }

  return createElement('div', {
    documentRef,
    className: ['mock-control', className],
    dataset,
    attributes,
    children: controlChildren,
  });
};

export const createTextareaMock = ({
  documentRef,
  valueText = null,
  placeholderLineClasses = ['w-90', 'w-75', 'w-62'],
  className = '',
  dataset = {},
  attributes = {},
} = {}) => {
  const lines = normalizeTextLines(valueText);
  const children =
    lines.length > 0
      ? lines.map((line) =>
          createElement('div', {
            documentRef,
            text: line,
          }),
        )
      : placeholderLineClasses.map((widthClass) =>
          createPlaceholderLine({
            documentRef,
            widthClass,
          }),
        );

  return createElement('div', {
    documentRef,
    className: ['textarea-mock', className],
    dataset,
    attributes,
    children,
  });
};

export const createInputControl = ({
  documentRef,
  inputType = 'text',
  valueText = '',
  placeholderText = '',
  className = '',
  shellClassName = '',
  dataset = {},
  shellDataset = {},
  attributes = {},
  shellAttributes = {},
  disabled = false,
  readOnly = false,
} = {}) => {
  const input = createElement('input', {
    documentRef,
    className,
    dataset,
    attributes: {
      type: inputType,
      placeholder: placeholderText || null,
      style: INLINE_TEXT_CONTROL_STYLE,
      ...attributes,
    },
  });

  input.value = valueText ?? '';
  input.disabled = Boolean(disabled);
  input.readOnly = Boolean(readOnly);

  if (disabled) {
    input.setAttribute('aria-disabled', 'true');
  }

  if (readOnly) {
    input.setAttribute('aria-readonly', 'true');
  }

  return createElement('div', {
    documentRef,
    className: ['mock-control', shellClassName],
    dataset: shellDataset,
    attributes: shellAttributes,
    children: [input],
  });
};

export const createSelectControl = ({
  documentRef,
  options = [],
  valueText = '',
  placeholderText = 'Select an option',
  className = '',
  shellClassName = '',
  dataset = {},
  shellDataset = {},
  attributes = {},
  shellAttributes = {},
  disabled = false,
} = {}) => {
  const select = createElement('select', {
    documentRef,
    className,
    dataset,
    attributes: {
      style: INLINE_SELECT_STYLE,
      ...attributes,
    },
  });

  if (placeholderText) {
    select.appendChild(
      createElement('option', {
        documentRef,
        text: placeholderText,
        attributes: {
          value: '',
        },
      }),
    );
  }

  options.forEach((option) => {
    select.appendChild(
      createElement('option', {
        documentRef,
        text: option.label,
        attributes: {
          value: option.value,
        },
      }),
    );
  });

  select.value = valueText === null || valueText === undefined ? '' : String(valueText);
  select.disabled = Boolean(disabled);

  if (disabled) {
    select.setAttribute('aria-disabled', 'true');
  }

  return createElement('div', {
    documentRef,
    className: ['mock-control', shellClassName],
    dataset: shellDataset,
    attributes: shellAttributes,
    children: [
      select,
      createElement('span', {
        documentRef,
        className: 'arrow',
        text: '▾',
        attributes: {
          'aria-hidden': 'true',
          style: 'pointer-events:none;',
        },
      }),
    ],
  });
};

export const createTextareaControl = ({
  documentRef,
  valueText = '',
  placeholderText = '',
  className = '',
  shellClassName = '',
  dataset = {},
  shellDataset = {},
  attributes = {},
  shellAttributes = {},
  disabled = false,
  readOnly = false,
} = {}) => {
  const textarea = createElement('textarea', {
    documentRef,
    className,
    dataset,
    attributes: {
      style: INLINE_TEXTAREA_STYLE,
      placeholder: placeholderText || null,
      ...attributes,
    },
  });

  textarea.value = valueText ?? '';
  textarea.disabled = Boolean(disabled);
  textarea.readOnly = Boolean(readOnly);

  if (disabled) {
    textarea.setAttribute('aria-disabled', 'true');
  }

  if (readOnly) {
    textarea.setAttribute('aria-readonly', 'true');
  }

  return createElement('div', {
    documentRef,
    className: ['textarea-mock', shellClassName],
    dataset: shellDataset,
    attributes: shellAttributes,
    children: [textarea],
  });
};

export const createDateRangeControl = ({
  documentRef,
  values = {},
  dataset = {},
  attributes = {},
  disabled = false,
} = {}) => {
  const createDatePart = ({ label, part, value }) => {
    const input = createElement('input', {
      documentRef,
      dataset: {
        ...dataset,
        fieldPart: part,
      },
      attributes: {
        type: 'date',
        style: INLINE_TEXT_CONTROL_STYLE,
        ...attributes,
      },
    });

    input.value = value ?? '';
    input.disabled = Boolean(disabled);

    if (disabled) {
      input.setAttribute('aria-disabled', 'true');
    }

    return createElement('div', {
      documentRef,
      className: 'mock-control',
      children: [
        createTag({
          documentRef,
          text: label,
          kind: 'display',
        }),
        input,
      ],
    });
  };

  return createElement('div', {
    documentRef,
    className: 'date-range-control',
    attributes: {
      style: INLINE_STACK_STYLE,
    },
    children: [
      createDatePart({
        label: 'Start',
        part: 'start',
        value: values.start,
      }),
      createDatePart({
        label: 'End',
        part: 'end',
        value: values.end,
      }),
    ],
  });
};

export const createCheckboxBlock = ({
  documentRef,
  options = [],
  selectedValues = [],
  interactive = false,
  name = null,
  dataset = {},
  inputDataset = {},
  attributes = {},
} = {}) => {
  const normalizedSelectedValues = new Set(
    (Array.isArray(selectedValues) ? selectedValues : [selectedValues])
      .flat()
      .filter((value) => value !== null && value !== undefined)
      .map((value) => String(value)),
  );

  const checkboxList = createElement('div', {
    documentRef,
    className: 'checkbox-list',
  });

  options.forEach((option) => {
    const checkboxItem = createElement('label', {
      documentRef,
      className: 'checkbox-item',
      dataset: {
        optionValue: option.value,
      },
    });

    const input = createElement('input', {
      documentRef,
      attributes: {
        type: 'checkbox',
        value: option.value,
        name: name ?? null,
        disabled: interactive ? null : true,
        'aria-disabled': interactive ? null : 'true',
        tabindex: interactive ? null : '-1',
      },
      dataset: {
        ...inputDataset,
        optionValue: option.value,
      },
    });

    input.checked = normalizedSelectedValues.has(String(option.value));
    checkboxItem.classList.toggle('has-checked', input.checked);

    checkboxItem.append(input);
    checkboxItem.append(
      createElement('span', {
        documentRef,
        text: option.label,
      }),
    );
    checkboxList.appendChild(checkboxItem);
  });

  return createElement('div', {
    documentRef,
    className: 'checkbox-block',
    dataset,
    attributes,
    children: [checkboxList],
  });
};

export const createRatingScale = ({
  documentRef,
  options = [],
  selectedValue = null,
  name = 'rating-scale',
  fieldId = null,
  labelId = null,
  readOnly = false,
  dataset = {},
  inputDataset = {},
  attributes = {},
} = {}) => {
  const normalizedSelectedValue =
    selectedValue === null || selectedValue === undefined
      ? null
      : Number.isFinite(Number(selectedValue))
        ? Number(selectedValue)
        : selectedValue;

  const scale = createElement('div', {
    documentRef,
    className: 'rating-scale',
    dataset,
    attributes: {
      role: 'radiogroup',
      'aria-labelledby': labelId,
      'aria-disabled': String(Boolean(readOnly)),
      ...attributes,
    },
  });

  options.forEach((option) => {
    const numericValue = Number.isFinite(Number(option.value))
      ? Number(option.value)
      : option.value;
    const isSelected = normalizedSelectedValue === numericValue;
    const radioInput = createElement('input', {
      documentRef,
      dataset: {
        ...inputDataset,
        fieldId,
        optionValue: option.value,
      },
      attributes: {
        type: 'radio',
        name,
        value: option.value,
        tabindex: '-1',
        'aria-hidden': 'true',
        style: INLINE_HIDDEN_CHOICE_INPUT_STYLE,
        disabled: readOnly ? true : null,
      },
    });

    radioInput.checked = isSelected;

    const optionElement = createElement('label', {
      documentRef,
      className: [
        'rating-option',
        isSelected ? 'selected' : null,
        isSelected && Number.isFinite(Number(numericValue)) ? `score-${numericValue}` : null,
      ],
      dataset: {
        optionValue: option.value,
        score: option.value,
        fieldId,
      },
      attributes: {
        tabindex: readOnly ? '-1' : '0',
        role: 'radio',
        'aria-checked': String(isSelected),
        'aria-disabled': String(Boolean(readOnly)),
        'aria-label': option.label,
        title: option.label,
        style: 'position:relative;',
      },
      children: [
        radioInput,
        createElement('span', {
          documentRef,
          className: 'rating-dot',
        }),
        createElement('span', {
          documentRef,
          className: 'rating-text',
          children: [
            createElement('strong', {
              documentRef,
              text: String(option.value),
            }),
            createElement('span', {
              documentRef,
              text: option.shortLabel ?? option.label,
            }),
          ],
        }),
      ],
    });

    scale.appendChild(optionElement);
  });

  return scale;
};

export const createCriterionCard = ({
  documentRef,
  criterionCode,
  headingId = null,
  title,
  statement,
  accentClass = null,
  dataset = {},
  attributes = {},
  children = [],
} = {}) => {
  const card = createElement('article', {
    documentRef,
    className: ['criterion-card', accentClass],
    dataset: {
      ...dataset,
      criterion: criterionCode,
    },
    attributes,
  });

  card.append(
    createElement('h3', {
      documentRef,
      text: title,
      attributes: {
        id: headingId,
      },
    }),
    createElement('p', {
      documentRef,
      text: statement,
    }),
  );

  appendChildren(card, children);

  return card;
};

let tooltipUid = 0;

export const createTooltipTrigger = ({ documentRef, label, tooltipText } = {}) => {
  const id = `tooltip-${++tooltipUid}`;

  const btn = createElement('button', {
    documentRef,
    className: 'tooltip-trigger-btn',
    text: '?',
    attributes: {
      type: 'button',
      'aria-describedby': id,
      'aria-label': label,
      title: tooltipText,
    },
  });

  const tip = createElement('span', {
    documentRef,
    className: 'tooltip-content',
    text: tooltipText,
    attributes: {
      id,
      role: 'tooltip',
    },
  });

  const wrapper = createElement('span', {
    documentRef,
    className: 'tooltip-trigger',
    children: [btn, tip],
  });

  let hoverTimer = null;

  const positionTooltip = () => {
    const rect = btn.getBoundingClientRect();
    const viewH = window.innerHeight;
    const spaceBelow = viewH - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = tip.offsetHeight || 80;

    tip.classList.toggle('is-flipped', spaceBelow < estimatedHeight && spaceAbove > spaceBelow);
  };

  const show = () => {
    tip.removeAttribute('hidden');
    positionTooltip();
    wrapper.classList.add('is-active');
  };

  const hide = () => {
    wrapper.classList.remove('is-active');
    tip.setAttribute('hidden', '');
  };

  btn.addEventListener('mouseenter', () => {
    hoverTimer = setTimeout(show, 300);
  });

  btn.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    hoverTimer = null;
    hide();
  });

  btn.addEventListener('focus', show);
  btn.addEventListener('blur', hide);

  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hide();
      btn.blur();
    }
  });

  documentRef.addEventListener(
    'click',
    (e) => {
      if (!wrapper.contains(e.target)) {
        hide();
      }
    },
    true,
  );

  tip.setAttribute('hidden', '');

  return wrapper;
};

export const createSection = ({
  documentRef,
  id,
  headingId,
  title,
  sectionKicker = null,
  className = '',
  dataset = {},
  attributes = {},
  children = [],
} = {}) => {
  const section = createElement('section', {
    documentRef,
    className: ['form-section', className],
    dataset,
    attributes: {
      id,
      'aria-labelledby': headingId,
      ...attributes,
    },
  });

  if (sectionKicker) {
    appendChildren(section, sectionKicker);
  }

  section.appendChild(
    createElement('h2', {
      documentRef,
      text: title,
      attributes: {
        id: headingId,
      },
    }),
  );

  appendChildren(section, children);

  return section;
};
