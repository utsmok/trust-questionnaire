import { CRITERIA_BY_CODE } from '../config/questionnaire-schema.js';
import { SECTION_IDS } from '../config/sections.js';
import {
  appendChildren,
  createElement,
} from './dom-factories.js';
import {
  createEvidenceManifest,
  serializeEvidenceManifest,
} from '../adapters/evidence-storage.js';
import { EMPTY_ARRAY, isPlainObject, toArray, inferMimeTypeFromName, extractEvidenceItems, normalizeTextValue, isImageMimeType } from '../utils/shared.js';
import { confirmDialog } from '../utils/confirm-dialog.js';

const EVIDENCE_BLOCK_SELECTOR = '[data-evidence-block="true"]';
const LIGHTBOX_ELEMENT_ID = 'questionnaire-evidence-lightbox';
const MANIFEST_DOWNLOAD_NAME = 'trust-evidence-manifest.json';

export const EVIDENCE_TYPE_OPTIONS = Object.freeze([
  Object.freeze({ value: 'screenshot', label: 'Screenshot' }),
  Object.freeze({ value: 'export', label: 'Tool export' }),
  Object.freeze({ value: 'document', label: 'Document / PDF' }),
  Object.freeze({ value: 'policy', label: 'Policy / terms' }),
  Object.freeze({ value: 'benchmark', label: 'Benchmark / source' }),
  Object.freeze({ value: 'other', label: 'Other' }),
]);

const EVIDENCE_TYPE_LABELS = Object.freeze(
  Object.fromEntries(EVIDENCE_TYPE_OPTIONS.map((option) => [option.value, option.label])),
);

const hasMeaningfulText = (value) =>
  typeof value === 'string' && value.trim().length > 0;

const formatFileSize = (value) => {
  const size = Number(value);

  if (!Number.isFinite(size) || size < 0) {
    return null;
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getEvidenceTypeLabel = (value) =>
  EVIDENCE_TYPE_LABELS[value] ?? value ?? 'Unknown';

const createEmptyDraftState = () => ({
  evidenceType: '',
  note: '',
  files: [],
  existingAssetId: '',
  replaceItemId: null,
  busy: false,
  message: '',
});

const ensureDraftState = (draftsByKey, scopeKey) => {
  if (!draftsByKey.has(scopeKey)) {
    draftsByKey.set(scopeKey, createEmptyDraftState());
  }

  return draftsByKey.get(scopeKey);
};

const createEvidenceId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `evidence-${globalThis.crypto.randomUUID()}`;
  }

  return `evidence-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getEvidenceFieldGroupLabel = (scope) =>
  scope.level === 'evaluation'
    ? 'Evaluation evidence intake'
    : `${scope.criterionCode} evidence association`;

const getEvidenceBlockDescription = (scope) =>
  scope.level === 'evaluation'
    ? 'Capture evaluation-level screenshots, exports, and supporting files. Files stay frontend-only and are included in the exported manifest.'
    : 'Attach files to this criterion. Each stored association requires an evidence type and an explanatory note.';

const getEvidenceEmptyStateText = (scope) =>
  scope.level === 'evaluation'
    ? 'No evaluation-level evidence attached yet.'
    : 'No criterion-level evidence attached yet.';

const getEvidenceScopeKey = ({ criterionCode = null } = {}) =>
  criterionCode ? `criterion:${criterionCode}` : 'evaluation';

export const createEvidenceScope = ({ pageId, criterionCode = null } = {}) => {
  if (criterionCode) {
    return Object.freeze({
      key: getEvidenceScopeKey({ criterionCode }),
      level: 'criterion',
      pageId: pageId ?? CRITERIA_BY_CODE[criterionCode]?.sectionId ?? null,
      sectionId: CRITERIA_BY_CODE[criterionCode]?.sectionId ?? pageId ?? null,
      criterionCode,
    });
  }

  return Object.freeze({
    key: getEvidenceScopeKey(),
    level: 'evaluation',
    pageId: pageId ?? SECTION_IDS.S2,
    sectionId: SECTION_IDS.S2,
    criterionCode: null,
  });
};

const resolveScopeFromElement = (element) =>
  createEvidenceScope({
    pageId: element?.dataset.evidencePageId ?? SECTION_IDS.S2,
    criterionCode: normalizeTextValue(element?.dataset.evidenceCriterionCode),
  });

const getEvidenceItemsForScope = (state, scope) =>
  scope.level === 'criterion'
    ? extractEvidenceItems(state.evaluation.evidence?.criteria?.[scope.criterionCode])
    : extractEvidenceItems(state.evaluation.evidence?.evaluation);

const getScopeEditableState = (state, scope) =>
  state.derived.pageStates.bySectionId[scope.pageId]?.isEditable === true;

const getAllEvidenceItems = (state) => [
  ...extractEvidenceItems(state.evaluation.evidence?.evaluation),
  ...Object.values(state.evaluation.evidence?.criteria ?? {}).flatMap((items) =>
    Array.isArray(items) ? items : []),
];

const getEvidenceAssetId = (item) =>
  normalizeTextValue(item?.assetId ?? item?.id);

const getEvidenceItemUsageCount = (state, assetId) =>
  getAllEvidenceItems(state).filter((item) => getEvidenceAssetId(item) === assetId).length;

const getEvidenceItemByAssetId = ({ state, assetId } = {}) => {
  const normalizedAssetId = normalizeTextValue(assetId);

  if (!normalizedAssetId) {
    return null;
  }

  return getAllEvidenceItems(state).find((item) => getEvidenceAssetId(item) === normalizedAssetId) ?? null;
};

const getReusableEvidenceItemsForScope = (state, scope, { replaceItemId = null } = {}) => {
  if (scope.level !== 'criterion') {
    return EMPTY_ARRAY;
  }

  const excludedAssetIds = new Set(
    getEvidenceItemsForScope(state, scope)
      .filter((item) => item?.id !== replaceItemId)
      .map((item) => getEvidenceAssetId(item))
      .filter(Boolean),
  );
  const uniqueItems = new Map();

  getAllEvidenceItems(state).forEach((item) => {
    const assetId = getEvidenceAssetId(item);

    if (!assetId || excludedAssetIds.has(assetId) || uniqueItems.has(assetId)) {
      return;
    }

    uniqueItems.set(assetId, item);
  });

  return Array.from(uniqueItems.values());
};

const describeEvidenceSource = (item) =>
  item?.criterionCode
    ? `${item.criterionCode}`
    : 'Evaluation';

const createReusableEvidenceOptionLabel = (item, state) => {
  const assetId = getEvidenceAssetId(item);
  const usageCount = assetId ? getEvidenceItemUsageCount(state, assetId) : 0;
  const usageText = usageCount > 1 ? ` · ${usageCount} links` : '';

  return `${item.name ?? 'Unnamed evidence'} — ${describeEvidenceSource(item)}${usageText}`;
};

const syncReusableEvidenceSelect = ({
  select,
  items,
  selectedAssetId,
  state,
} = {}) => {
  if (!(select instanceof HTMLSelectElement)) {
    return '';
  }

  const normalizedSelectedAssetId = normalizeTextValue(selectedAssetId) ?? '';
  const documentRef = select.ownerDocument ?? document;
  const options = [
    createElement('option', {
      documentRef,
      text: items.length > 0 ? 'Select existing evidence to reuse' : 'No reusable evidence available',
      attributes: {
        value: '',
      },
    }),
    ...items.map((item) =>
      createElement('option', {
        documentRef,
        text: createReusableEvidenceOptionLabel(item, state),
        attributes: {
          value: getEvidenceAssetId(item),
        },
      })),
  ];

  select.replaceChildren(...options);

  const allowedAssetIds = new Set(items.map((item) => getEvidenceAssetId(item)).filter(Boolean));
  const nextValue = allowedAssetIds.has(normalizedSelectedAssetId) ? normalizedSelectedAssetId : '';
  select.value = nextValue;

  return nextValue;
};

const createEvidenceSelect = ({ documentRef, value = '', disabled = false } = {}) => {
  const select = createElement('select', {
    documentRef,
    className: 'evidence-select',
    dataset: {
      evidenceControl: 'type',
    },
    attributes: {
      'aria-label': 'Evidence type',
      disabled: disabled ? true : null,
    },
  });

  select.appendChild(
    createElement('option', {
      documentRef,
      text: 'Select evidence type',
      attributes: {
        value: '',
      },
    }),
  );

  EVIDENCE_TYPE_OPTIONS.forEach((option) => {
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

  select.value = value;

  return select;
};

const createReusableEvidenceSelect = ({ documentRef, disabled = false } = {}) =>
  createElement('select', {
    documentRef,
    className: 'evidence-select',
    dataset: {
      evidenceControl: 'existing-asset',
    },
    attributes: {
      'aria-label': 'Reuse existing evidence',
      disabled: disabled ? true : null,
    },
  });

const createEvidenceInputGroup = ({
  documentRef,
  label,
  control,
  className = '',
} = {}) =>
  createElement('label', {
    documentRef,
    className: ['evidence-input-group', className],
    children: [
      createElement('span', {
        documentRef,
        className: 'evidence-input-label',
        text: label,
      }),
      control,
    ],
  });

const createEvidenceItemsContainer = ({ documentRef } = {}) =>
  createElement('div', {
    documentRef,
    className: 'evidence-items',
    dataset: {
      evidenceRole: 'items',
    },
  });

export const createEvidenceBlockElement = ({
  documentRef,
  scope,
  editable = true,
} = {}) => {
  const typeControl = createEvidenceSelect({
    documentRef,
    disabled: !editable,
  });
  const existingAssetControl = scope.level === 'criterion'
    ? createReusableEvidenceSelect({
      documentRef,
      disabled: !editable,
    })
    : null;
  const noteControl = createElement('textarea', {
    documentRef,
    className: 'evidence-textarea',
    dataset: {
      evidenceControl: 'note',
    },
    attributes: {
      rows: 3,
      placeholder: 'Required note: why this file supports the evaluation or criterion.',
      'aria-label': 'Evidence note',
      readonly: editable ? null : true,
      'aria-readonly': editable ? null : 'true',
    },
  });
  const fileControl = createElement('input', {
    documentRef,
    className: 'evidence-file-input',
    dataset: {
      evidenceControl: 'files',
    },
    attributes: {
      type: 'file',
      multiple: true,
      disabled: !editable ? true : null,
      'aria-label': 'Upload evidence files',
    },
  });

  const actionButtons = [
    createElement('button', {
      documentRef,
      className: 'evidence-button evidence-button-primary',
      text: 'Add evidence',
      dataset: {
        evidenceAction: 'add-files',
      },
      attributes: {
        type: 'button',
        disabled: editable ? true : null,
      },
    }),
  ];

  if (scope.level === 'criterion') {
    actionButtons.push(
      createElement('button', {
        documentRef,
        className: 'evidence-button',
        text: 'Reuse selected evidence',
        dataset: {
          evidenceAction: 'reuse-asset',
        },
        attributes: {
          type: 'button',
          disabled: true,
        },
      }),
      createElement('button', {
        documentRef,
        className: 'evidence-button',
        text: 'Cancel replace',
        dataset: {
          evidenceAction: 'cancel-replace',
        },
        attributes: {
          type: 'button',
          disabled: true,
        },
      }),
    );
  }

  if (scope.level === 'evaluation') {
    actionButtons.unshift(
      createElement('button', {
        documentRef,
        className: 'evidence-button',
        text: 'Export manifest',
        dataset: {
          evidenceAction: 'export-manifest',
        },
        attributes: {
          type: 'button',
        },
      }),
    );
  }

  return createElement('section', {
    documentRef,
    className: ['field-group', 'evidence-block', scope.level === 'criterion' ? 'criterion' : 'evaluation'],
    dataset: {
      evidenceBlock: 'true',
      evidenceKey: scope.key,
      evidenceLevel: scope.level,
      evidencePageId: scope.pageId,
      evidenceSectionId: scope.sectionId,
      evidenceCriterionCode: scope.criterionCode,
    },
    children: [
      createElement('div', {
        documentRef,
        className: 'evidence-block-header',
        children: [
          createElement('div', {
            documentRef,
            className: 'evidence-block-heading',
            children: [
              createElement('div', {
                documentRef,
                className: 'field-label evidence-block-label',
                children: [
                  createElement('span', {
                    documentRef,
                    text: getEvidenceFieldGroupLabel(scope),
                  }),
                  createElement('span', {
                    documentRef,
                    className: 'display-tag evidence-count',
                    dataset: {
                      evidenceRole: 'count',
                    },
                    text: '0 files',
                  }),
                ],
              }),
              createElement('p', {
                documentRef,
                className: 'evidence-block-description',
                text: getEvidenceBlockDescription(scope),
              }),
            ],
          }),
        ],
      }),
      createElement('div', {
        documentRef,
        className: 'evidence-intake',
        children: [
          createElement('div', {
            documentRef,
            className: 'evidence-intake-grid',
            children: [
              createEvidenceInputGroup({
                documentRef,
                label: 'Evidence type',
                control: typeControl,
              }),
              createEvidenceInputGroup({
                documentRef,
                label: 'Association note',
                control: noteControl,
                className: 'evidence-note-group',
              }),
              existingAssetControl
                ? createEvidenceInputGroup({
                  documentRef,
                  label: 'Reuse existing file',
                  control: existingAssetControl,
                })
                : null,
              createEvidenceInputGroup({
                documentRef,
                label: 'Select file(s)',
                control: fileControl,
              }),
            ],
          }),
          createElement('div', {
            documentRef,
            className: 'evidence-intake-footer',
            children: [
              createElement('p', {
                documentRef,
                className: 'evidence-selection-summary',
                dataset: {
                  evidenceRole: 'selection-summary',
                },
                text: 'No files selected.',
              }),
              createElement('div', {
                documentRef,
                className: 'evidence-action-strip',
                children: actionButtons,
              }),
            ],
          }),
          createElement('p', {
            documentRef,
            className: 'evidence-status',
            dataset: {
              evidenceRole: 'status',
            },
            attributes: {
              'aria-live': 'polite',
            },
            text: getEvidenceEmptyStateText(scope),
          }),
        ],
      }),
      createEvidenceItemsContainer({ documentRef }),
    ],
  });
};

const createEvidenceMetaItem = ({ documentRef, text, className = '' } = {}) =>
  createElement('span', {
    documentRef,
    className: ['evidence-meta-item', className],
    text,
  });

const createEvidencePreviewButton = ({ documentRef, item } = {}) => {
  const imageSrc = normalizeTextValue(item.previewDataUrl ?? item.dataUrl);

  if (!imageSrc) {
    return createElement('div', {
      documentRef,
      className: 'evidence-preview evidence-preview-empty',
      text: 'Preview unavailable',
    });
  }

  return createElement('button', {
    documentRef,
    className: 'evidence-preview-button',
    dataset: {
      evidenceAction: 'open-lightbox',
      evidenceItemId: item.id,
    },
    attributes: {
      type: 'button',
      title: `Open preview for ${item.name ?? 'image evidence'}`,
    },
    children: [
      createElement('img', {
        documentRef,
        className: 'evidence-preview-image',
        attributes: {
          src: imageSrc,
          alt: item.name ?? 'Evidence preview',
          loading: 'lazy',
        },
      }),
      createElement('span', {
        documentRef,
        className: 'evidence-preview-caption',
        text: 'Open preview',
      }),
    ],
  });
};

const createEvidenceDownloadLink = ({ documentRef, item } = {}) => {
  const dataUrl = normalizeTextValue(item.dataUrl);

  if (!dataUrl) {
    return createElement('span', {
      documentRef,
      className: 'evidence-file-link evidence-file-link-disabled',
      text: item.name ?? 'Unavailable file',
    });
  }

  return createElement('a', {
    documentRef,
    className: 'evidence-file-link',
    text: item.name ?? 'Evidence file',
    attributes: {
      href: dataUrl,
      download: item.name ?? 'evidence-file',
      target: '_blank',
      rel: 'noreferrer noopener',
    },
  });
};

const createEvidenceItemElement = ({
  documentRef,
  item,
  editable = true,
} = {}) => {
  const metaItems = [
    createEvidenceMetaItem({
      documentRef,
      text: getEvidenceTypeLabel(item.evidenceType),
      className: 'evidence-meta-type',
    }),
  ];

  const sizeLabel = formatFileSize(item.size);
  if (sizeLabel) {
    metaItems.push(
      createEvidenceMetaItem({
        documentRef,
        text: sizeLabel,
      }),
    );
  }

  if (item.criterionCode) {
    metaItems.push(
      createEvidenceMetaItem({
        documentRef,
        text: item.criterionCode,
      }),
    );
  }

  if (Number(item.associationCount) > 1) {
    metaItems.push(
      createEvidenceMetaItem({
        documentRef,
        text: `${item.associationCount} links`,
      }),
    );
  }

  const fileLead = item.isImage === true || isImageMimeType(item.mimeType)
    ? createEvidencePreviewButton({ documentRef, item })
    : createElement('div', {
        documentRef,
        className: 'evidence-file-row',
        children: [
          createEvidenceDownloadLink({ documentRef, item }),
        ],
      });

  return createElement('article', {
    documentRef,
    className: ['evidence-item', item.isImage === true || isImageMimeType(item.mimeType) ? 'is-image' : 'is-file'],
    dataset: {
      evidenceItemId: item.id,
    },
    children: [
      fileLead,
      createElement('div', {
        documentRef,
        className: 'evidence-item-body',
        children: [
          createElement('div', {
            documentRef,
            className: 'evidence-item-topline',
            children: [
              createElement('div', {
                documentRef,
                className: 'evidence-item-title-block',
                children: [
                  createElement('div', {
                    documentRef,
                    className: 'evidence-item-name',
                    text: item.name ?? 'Unnamed evidence',
                  }),
                  createElement('div', {
                    documentRef,
                    className: 'evidence-item-meta',
                    children: metaItems,
                  }),
                ],
              }),
              createElement('div', {
                documentRef,
                className: 'evidence-action-strip',
                children: item.scope === 'criterion'
                  ? [
                    createElement('button', {
                      documentRef,
                      className: 'evidence-button',
                      text: 'Replace',
                      dataset: {
                        evidenceAction: 'start-replace',
                        evidenceItemId: item.id,
                      },
                      attributes: {
                        type: 'button',
                        disabled: editable ? null : true,
                      },
                    }),
                    createElement('button', {
                      documentRef,
                      className: 'evidence-button',
                      text: 'Unlink',
                      dataset: {
                        evidenceAction: 'unlink-item',
                        evidenceItemId: item.id,
                      },
                      attributes: {
                        type: 'button',
                        disabled: editable ? null : true,
                      },
                    }),
                    createElement('button', {
                      documentRef,
                      className: 'evidence-remove-button',
                      text: 'Remove file everywhere',
                      dataset: {
                        evidenceAction: 'remove-asset',
                        evidenceItemId: item.id,
                        evidenceAssetId: item.assetId,
                      },
                      attributes: {
                        type: 'button',
                        disabled: editable ? null : true,
                      },
                    }),
                  ]
                  : [
                    createElement('button', {
                      documentRef,
                      className: 'evidence-remove-button',
                      text: 'Remove',
                      dataset: {
                        evidenceAction: 'remove-item',
                        evidenceItemId: item.id,
                      },
                      attributes: {
                        type: 'button',
                        disabled: editable ? null : true,
                      },
                    }),
                  ],
              }),
            ],
          }),
          createElement('div', {
            documentRef,
            className: 'evidence-note-label',
            text: 'Association note',
          }),
          createElement('p', {
            documentRef,
            className: 'evidence-note',
            text: item.note ?? 'No note recorded.',
          }),
        ],
      }),
    ],
  });
};

const createEvidenceEmptyState = ({ documentRef, scope } = {}) =>
  createElement('div', {
    documentRef,
    className: 'evidence-empty-state',
    text: getEvidenceEmptyStateText(scope),
  });

const renderEvidenceItems = ({
  container,
  items,
  scope,
  editable,
} = {}) => {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  const documentRef = container.ownerDocument ?? document;

  if (!Array.isArray(items) || items.length === 0) {
    container.replaceChildren(
      createEvidenceEmptyState({ documentRef, scope }),
    );
    return;
  }

  container.replaceChildren(
    ...items.map((item) =>
      createEvidenceItemElement({
        documentRef,
        item,
        editable,
      })),
  );
};

const describeSelectedFiles = (files) => {
  if (!Array.isArray(files) || files.length === 0) {
    return 'No files selected.';
  }

  if (files.length === 1) {
    return `1 file selected: ${files[0].name}`;
  }

  return `${files.length} files selected: ${files.slice(0, 3).map((file) => file.name).join(', ')}${files.length > 3 ? ', …' : ''}`;
};

const ensureEvidenceLightbox = (documentRef) => {
  const existing = documentRef.getElementById(LIGHTBOX_ELEMENT_ID);

  if (existing instanceof HTMLElement) {
    return existing;
  }

  const lightbox = createElement('div', {
    documentRef,
    className: 'evidence-lightbox',
    attributes: {
      id: LIGHTBOX_ELEMENT_ID,
      hidden: true,
      'aria-hidden': 'true',
    },
    children: [
      createElement('button', {
        documentRef,
        className: 'evidence-lightbox-backdrop',
        dataset: {
          evidenceAction: 'close-lightbox',
        },
        attributes: {
          type: 'button',
          'aria-label': 'Close evidence preview',
        },
      }),
      createElement('div', {
        documentRef,
        className: 'evidence-lightbox-dialog',
        attributes: {
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': `${LIGHTBOX_ELEMENT_ID}-title`,
        },
        children: [
          createElement('div', {
            documentRef,
            className: 'evidence-lightbox-header',
            children: [
              createElement('h3', {
                documentRef,
                className: 'evidence-lightbox-title',
                attributes: {
                  id: `${LIGHTBOX_ELEMENT_ID}-title`,
                },
                text: 'Evidence preview',
              }),
              createElement('button', {
                documentRef,
                className: 'evidence-lightbox-close',
                text: 'Close',
                dataset: {
                  evidenceAction: 'close-lightbox',
                },
                attributes: {
                  type: 'button',
                },
              }),
            ],
          }),
          createElement('div', {
            documentRef,
            className: 'evidence-lightbox-frame',
            children: [
              createElement('img', {
                documentRef,
                className: 'evidence-lightbox-image',
                attributes: {
                  alt: 'Evidence preview image',
                },
              }),
            ],
          }),
          createElement('p', {
            documentRef,
            className: 'evidence-lightbox-note',
          }),
        ],
      }),
    ],
  });

  documentRef.body.appendChild(lightbox);
  return lightbox;
};

const openEvidenceLightbox = ({ documentRef, item, trigger } = {}) => {
  const lightbox = ensureEvidenceLightbox(documentRef);
  const image = lightbox.querySelector('.evidence-lightbox-image');
  const title = lightbox.querySelector('.evidence-lightbox-title');
  const note = lightbox.querySelector('.evidence-lightbox-note');
  const imageSrc = normalizeTextValue(item?.previewDataUrl ?? item?.dataUrl);

  if (!(image instanceof HTMLImageElement) || !imageSrc) {
    return;
  }

  if (title instanceof HTMLElement) {
    title.textContent = item?.name ?? 'Evidence preview';
  }

  if (note instanceof HTMLElement) {
    note.textContent = item?.note ?? '';
  }

  image.src = imageSrc;
  image.alt = item?.name ?? 'Evidence preview image';
  lightbox.hidden = false;
  lightbox.setAttribute('aria-hidden', 'false');
  lightbox.dataset.returnFocus = trigger instanceof HTMLElement ? 'true' : 'false';

  const closeButton = lightbox.querySelector('.evidence-lightbox-close');
  if (closeButton instanceof HTMLButtonElement) {
    closeButton.focus();
  }

  lightbox._returnFocusTarget = trigger instanceof HTMLElement ? trigger : null;
};

const closeEvidenceLightbox = (documentRef) => {
  const lightbox = documentRef.getElementById(LIGHTBOX_ELEMENT_ID);

  if (!(lightbox instanceof HTMLElement) || lightbox.hidden) {
    return;
  }

  const image = lightbox.querySelector('.evidence-lightbox-image');
  if (image instanceof HTMLImageElement) {
    image.removeAttribute('src');
  }

  lightbox.hidden = true;
  lightbox.setAttribute('aria-hidden', 'true');

  if (lightbox._returnFocusTarget instanceof HTMLElement) {
    lightbox._returnFocusTarget.focus();
  }

  lightbox._returnFocusTarget = null;
};

const exportEvidenceManifest = ({ documentRef, evaluation } = {}) => {
  const manifest = createEvidenceManifest(evaluation);
  const blob = new Blob([serializeEvidenceManifest(manifest)], {
    type: 'application/json',
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = createElement('a', {
    documentRef,
    attributes: {
      href: objectUrl,
      download: MANIFEST_DOWNLOAD_NAME,
    },
  });

  documentRef.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
};

const syncEvidenceBlock = ({
  block,
  state,
  draftsByKey,
} = {}) => {
  if (!(block instanceof HTMLElement)) {
    return;
  }

  const scope = resolveScopeFromElement(block);
  const draftState = ensureDraftState(draftsByKey, scope.key);
  const editable = getScopeEditableState(state, scope);
  const items = getEvidenceItemsForScope(state, scope);
  const replaceTarget = draftState.replaceItemId
    ? items.find((item) => item?.id === draftState.replaceItemId) ?? null
    : null;
  if (draftState.replaceItemId && !replaceTarget) {
    draftState.replaceItemId = null;
  }
  const reusableItems = getReusableEvidenceItemsForScope(state, scope, {
    replaceItemId: draftState.replaceItemId,
  });
  const decoratedItems = items.map((item) => ({
    ...item,
    associationCount: getEvidenceItemUsageCount(state, getEvidenceAssetId(item)),
  }));
  const countElement = block.querySelector('[data-evidence-role="count"]');
  const selectionSummaryElement = block.querySelector('[data-evidence-role="selection-summary"]');
  const statusElement = block.querySelector('[data-evidence-role="status"]');
  const itemsContainer = block.querySelector('[data-evidence-role="items"]');
  const typeControl = block.querySelector('[data-evidence-control="type"]');
  const noteControl = block.querySelector('[data-evidence-control="note"]');
  const existingAssetControl = block.querySelector('[data-evidence-control="existing-asset"]');
  const fileControl = block.querySelector('[data-evidence-control="files"]');
  const addButton = block.querySelector('[data-evidence-action="add-files"]');
  const reuseButton = block.querySelector('[data-evidence-action="reuse-asset"]');
  const cancelReplaceButton = block.querySelector('[data-evidence-action="cancel-replace"]');
  const exportButton = block.querySelector('[data-evidence-action="export-manifest"]');

  if (countElement instanceof HTMLElement) {
    countElement.textContent = `${decoratedItems.length} ${decoratedItems.length === 1 ? 'file' : 'files'}`;
  }

  if (selectionSummaryElement instanceof HTMLElement) {
    selectionSummaryElement.textContent = describeSelectedFiles(draftState.files);
  }

  if (statusElement instanceof HTMLElement) {
    statusElement.textContent = draftState.message || (
      replaceTarget
        ? `Replace mode active for ${replaceTarget.name ?? 'selected evidence'}. Select one new file or one existing evidence item.`
        : decoratedItems.length > 0
          ? `${decoratedItems.length} ${decoratedItems.length === 1 ? 'file is' : 'files are'} attached.`
          : getEvidenceEmptyStateText(scope)
    );
  }

  if (typeControl instanceof HTMLSelectElement && typeControl.value !== draftState.evidenceType) {
    typeControl.value = draftState.evidenceType;
  }

  if (noteControl instanceof HTMLTextAreaElement && noteControl.value !== draftState.note) {
    noteControl.value = draftState.note;
  }

  if (existingAssetControl instanceof HTMLSelectElement) {
    draftState.existingAssetId = syncReusableEvidenceSelect({
      select: existingAssetControl,
      items: reusableItems,
      selectedAssetId: draftState.existingAssetId,
      state,
    });
  }

  if (typeControl instanceof HTMLSelectElement) {
    typeControl.disabled = !editable || draftState.busy;
  }

  if (noteControl instanceof HTMLTextAreaElement) {
    noteControl.readOnly = !editable || draftState.busy;
    noteControl.setAttribute('aria-readonly', String(Boolean(!editable || draftState.busy)));
  }

  if (existingAssetControl instanceof HTMLSelectElement) {
    existingAssetControl.disabled = !editable || draftState.busy || reusableItems.length === 0;
    existingAssetControl.setAttribute('aria-disabled', String(Boolean(!editable || draftState.busy || reusableItems.length === 0)));
  }

  if (fileControl instanceof HTMLInputElement) {
    fileControl.disabled = !editable || draftState.busy;

    if (!draftState.files.length && fileControl.value) {
      fileControl.value = '';
    }
  }

  if (addButton instanceof HTMLButtonElement) {
    addButton.disabled = !editable
      || draftState.busy
      || draftState.files.length === 0
      || !hasMeaningfulText(draftState.note)
      || !hasMeaningfulText(draftState.evidenceType)
      || (draftState.replaceItemId !== null && draftState.files.length !== 1);
    addButton.textContent = draftState.busy
      ? draftState.replaceItemId !== null
        ? 'Replacing…'
        : 'Adding…'
      : draftState.replaceItemId !== null
        ? 'Replace with upload'
        : 'Add evidence';
  }

  if (reuseButton instanceof HTMLButtonElement) {
    reuseButton.disabled = !editable
      || draftState.busy
      || !hasMeaningfulText(draftState.note)
      || !hasMeaningfulText(draftState.evidenceType)
      || !hasMeaningfulText(draftState.existingAssetId);
    reuseButton.textContent = draftState.replaceItemId !== null
      ? 'Replace with selected evidence'
      : 'Reuse selected evidence';
  }

  if (cancelReplaceButton instanceof HTMLButtonElement) {
    cancelReplaceButton.disabled = draftState.busy || draftState.replaceItemId === null;
  }

  if (exportButton instanceof HTMLButtonElement) {
    exportButton.disabled = draftState.busy;
  }

  renderEvidenceItems({
    container: itemsContainer,
    items: decoratedItems,
    scope,
    editable,
  });
};

const syncEvidenceBlocks = ({ questionnaireRoot, state, draftsByKey } = {}) => {
  toArray(questionnaireRoot.querySelectorAll(EVIDENCE_BLOCK_SELECTOR)).forEach((block) => {
    syncEvidenceBlock({
      block,
      state,
      draftsByKey,
    });
  });
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => {
      resolve(typeof reader.result === 'string' ? reader.result : null);
    });

    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error(`Failed to read ${file?.name ?? 'file'}.`));
    });

    reader.readAsDataURL(file);
  });

const createStoredEvidenceItem = async ({
  file,
  scope,
  evidenceType,
  note,
} = {}) => {
  const dataUrl = await readFileAsDataUrl(file);
  const normalizedNote = note.trim();
  const mimeType = normalizeTextValue(file.type) ?? inferMimeTypeFromName(file.name) ?? 'application/octet-stream';

  return {
    id: createEvidenceId(),
    scope: scope.level,
    sectionId: scope.sectionId,
    criterionCode: scope.criterionCode,
    evidenceType,
    note: normalizedNote,
    name: file.name,
    mimeType,
    size: Number.isFinite(file.size) ? file.size : null,
    isImage: isImageMimeType(mimeType),
    dataUrl,
    previewDataUrl: isImageMimeType(mimeType) ? dataUrl : null,
    addedAt: new Date().toISOString(),
  };
};

const getEvidenceItemById = ({
  state,
  scope,
  itemId,
} = {}) =>
  getEvidenceItemsForScope(state, scope).find((item) => item?.id === itemId) ?? null;

export const initializeEvidenceUi = ({ root = document, store } = {}) => {
  const documentRef = root?.ownerDocument ?? root ?? document;
  const questionnaireRoot = documentRef.getElementById('questionnaireRenderRoot');

  if (!questionnaireRoot || !store?.subscribe || !store?.actions) {
    return {
      destroy() {},
    };
  }

  const draftsByKey = new Map();
  const cleanup = [];

  const updateBlockFromElement = (element) => {
    const block = element.closest(EVIDENCE_BLOCK_SELECTOR);

    if (!(block instanceof HTMLElement)) {
      return;
    }

    syncEvidenceBlock({
      block,
      state: store.getState(),
      draftsByKey,
    });
  };

  const handleInput = (event) => {
    const control = event.target;

    if (!(control instanceof HTMLTextAreaElement) && !(control instanceof HTMLSelectElement)) {
      return;
    }

    const block = control.closest(EVIDENCE_BLOCK_SELECTOR);
    if (!(block instanceof HTMLElement)) {
      return;
    }

    const scope = resolveScopeFromElement(block);
    const draftState = ensureDraftState(draftsByKey, scope.key);

    if (control.dataset.evidenceControl === 'note') {
      draftState.note = control.value;
      draftState.message = '';
    }

    if (control.dataset.evidenceControl === 'type') {
      draftState.evidenceType = control.value;
      draftState.message = '';
    }

    if (control.dataset.evidenceControl === 'existing-asset') {
      draftState.existingAssetId = control.value;
      draftState.message = '';
    }

    updateBlockFromElement(control);
  };

  const handleChange = (event) => {
    const control = event.target;

    if (control instanceof HTMLSelectElement && control.dataset.evidenceControl === 'existing-asset') {
      const block = control.closest(EVIDENCE_BLOCK_SELECTOR);
      if (!(block instanceof HTMLElement)) {
        return;
      }

      const scope = resolveScopeFromElement(block);
      const draftState = ensureDraftState(draftsByKey, scope.key);
      draftState.existingAssetId = control.value;
      draftState.message = '';
      updateBlockFromElement(control);
      return;
    }

    if (!(control instanceof HTMLInputElement)) {
      return;
    }

    const block = control.closest(EVIDENCE_BLOCK_SELECTOR);
    if (!(block instanceof HTMLElement)) {
      return;
    }

    if (control.dataset.evidenceControl !== 'files') {
      return;
    }

    const scope = resolveScopeFromElement(block);
    const draftState = ensureDraftState(draftsByKey, scope.key);
    draftState.files = toArray(control.files).filter((file) => file instanceof File);
    draftState.message = '';

    updateBlockFromElement(control);
  };

  const handleClick = async (event) => {
    const actionTarget = event.target instanceof HTMLElement
      ? event.target.closest('[data-evidence-action]')
      : null;

    if (!(actionTarget instanceof HTMLElement)) {
      return;
    }

    const action = actionTarget.dataset.evidenceAction;

    if (action === 'close-lightbox') {
      closeEvidenceLightbox(documentRef);
      return;
    }

    if (action === 'export-manifest') {
      exportEvidenceManifest({
        documentRef,
        evaluation: store.getState().evaluation,
      });

      const block = actionTarget.closest(EVIDENCE_BLOCK_SELECTOR);
      if (block instanceof HTMLElement) {
        const scope = resolveScopeFromElement(block);
        const draftState = ensureDraftState(draftsByKey, scope.key);
        draftState.message = 'Evidence manifest exported.';
        updateBlockFromElement(actionTarget);
      }
      return;
    }

    const block = actionTarget.closest(EVIDENCE_BLOCK_SELECTOR);
    if (!(block instanceof HTMLElement)) {
      return;
    }

    const scope = resolveScopeFromElement(block);
    const draftState = ensureDraftState(draftsByKey, scope.key);
    const clearReplaceMode = () => {
      draftState.replaceItemId = null;
      draftState.existingAssetId = '';
      draftState.files = [];
      const fileInput = block.querySelector('[data-evidence-control="files"]');
      if (fileInput instanceof HTMLInputElement) {
        fileInput.value = '';
      }
    };

    if (action === 'open-lightbox') {
      const item = getEvidenceItemById({
        state: store.getState(),
        scope,
        itemId: actionTarget.dataset.evidenceItemId,
      });

      if (!item) {
        return;
      }

      openEvidenceLightbox({
        documentRef,
        item,
        trigger: actionTarget,
      });
      return;
    }

    if (action === 'cancel-replace') {
      clearReplaceMode();
      draftState.message = 'Replace mode cancelled.';
      syncEvidenceBlock({
        block,
        state: store.getState(),
        draftsByKey,
      });
      return;
    }

    if (action === 'start-replace') {
      const item = getEvidenceItemById({
        state: store.getState(),
        scope,
        itemId: actionTarget.dataset.evidenceItemId,
      });

      if (!item) {
        return;
      }

      draftState.replaceItemId = item.id;
      draftState.evidenceType = item.evidenceType ?? draftState.evidenceType;
      draftState.note = item.note ?? draftState.note;
      draftState.existingAssetId = '';
      draftState.files = [];
      draftState.message = `Replace mode active for ${item.name ?? 'selected evidence'}.`;

      const fileInput = block.querySelector('[data-evidence-control="files"]');
      if (fileInput instanceof HTMLInputElement) {
        fileInput.value = '';
      }

      syncEvidenceBlock({
        block,
        state: store.getState(),
        draftsByKey,
      });
      return;
    }

    if (action === 'remove-item') {
      const itemId = actionTarget.dataset.evidenceItemId;

      if (!itemId) {
        return;
      }

      if (scope.level === 'criterion') {
        store.actions.removeCriterionEvidenceItem(scope.criterionCode, itemId);
      } else {
        store.actions.removeEvaluationEvidenceItem(itemId);
      }

      draftState.message = 'Evidence item removed.';
      syncEvidenceBlock({
        block,
        state: store.getState(),
        draftsByKey,
      });
      return;
    }

    if (action === 'unlink-item') {
      const itemId = actionTarget.dataset.evidenceItemId;

      if (!itemId || scope.level !== 'criterion') {
        return;
      }

      store.actions.unlinkCriterionEvidenceItem(scope.criterionCode, itemId);

      if (draftState.replaceItemId === itemId) {
        clearReplaceMode();
      }

      draftState.message = 'Evidence association removed from this criterion.';
      syncEvidenceBlock({
        block,
        state: store.getState(),
        draftsByKey,
      });
      return;
    }

    if (action === 'remove-asset') {
      const assetId = actionTarget.dataset.evidenceAssetId;
      const sourceItem = getEvidenceItemByAssetId({
        state: store.getState(),
        assetId,
      });
      const usageCount = getEvidenceItemUsageCount(store.getState(), normalizeTextValue(assetId));
      const confirmMessage = usageCount > 1
        ? `Remove “${sourceItem?.name ?? 'this evidence file'}” everywhere? This will remove ${usageCount} linked associations.`
        : `Remove “${sourceItem?.name ?? 'this evidence file'}” from this questionnaire?`;
      const shouldRemove = await confirmDialog(confirmMessage, { documentRef });

      if (!shouldRemove) {
        return;
      }

      store.actions.removeEvidenceAsset(assetId);

      if (draftState.replaceItemId && getEvidenceItemById({
        state: store.getState(),
        scope,
        itemId: draftState.replaceItemId,
      }) === null) {
        clearReplaceMode();
      }

      draftState.message = 'Evidence file removed everywhere it was linked.';
      syncEvidenceBlock({
        block,
        state: store.getState(),
        draftsByKey,
      });
      return;
    }

    if (action === 'reuse-asset') {
      if (scope.level !== 'criterion') {
        return;
      }

      if (!hasMeaningfulText(draftState.note) || !hasMeaningfulText(draftState.evidenceType) || !hasMeaningfulText(draftState.existingAssetId)) {
        draftState.message = 'Select existing evidence, an evidence type, and a note before linking it to this criterion.';
        updateBlockFromElement(actionTarget);
        return;
      }

      if (draftState.replaceItemId) {
        store.actions.replaceCriterionEvidenceItem(scope.criterionCode, draftState.replaceItemId, {
          assetId: draftState.existingAssetId,
          evidenceType: draftState.evidenceType,
          note: draftState.note,
        });
        draftState.message = 'Criterion evidence association replaced with existing evidence.';
      } else {
        store.actions.reuseCriterionEvidenceAsset(scope.criterionCode, draftState.existingAssetId, {
          evidenceType: draftState.evidenceType,
          note: draftState.note,
        });
        draftState.message = 'Existing evidence linked to this criterion.';
      }

      draftState.note = '';
      draftState.evidenceType = '';
      clearReplaceMode();
      updateBlockFromElement(actionTarget);
      return;
    }

    if (action !== 'add-files') {
      return;
    }

    if (draftState.busy) {
      return;
    }

    if (!draftState.files.length || !hasMeaningfulText(draftState.note) || !hasMeaningfulText(draftState.evidenceType)) {
      draftState.message = 'Select at least one file, an evidence type, and a note before adding evidence.';
      updateBlockFromElement(actionTarget);
      return;
    }

    if (draftState.replaceItemId && draftState.files.length !== 1) {
      draftState.message = 'Replacing an association requires exactly one new file.';
      updateBlockFromElement(actionTarget);
      return;
    }

    draftState.busy = true;
    draftState.message = draftState.replaceItemId ? 'Reading replacement file…' : 'Reading selected file(s)…';
    updateBlockFromElement(actionTarget);

    try {
      const nextItems = await Promise.all(
        draftState.files.map((file) =>
          createStoredEvidenceItem({
            file,
            scope,
            evidenceType: draftState.evidenceType,
            note: draftState.note,
          })),
      );

      const addedCount = nextItems.length;
      draftState.busy = false;

      const fileInput = block.querySelector('[data-evidence-control="files"]');
      if (fileInput instanceof HTMLInputElement) {
        fileInput.value = '';
      }

      if (scope.level === 'criterion' && draftState.replaceItemId) {
        store.actions.replaceCriterionEvidenceItem(scope.criterionCode, draftState.replaceItemId, {
          ...nextItems[0],
          evidenceType: draftState.evidenceType,
          note: draftState.note,
        });
        draftState.message = 'Criterion evidence association replaced with a new upload.';
        clearReplaceMode();
      } else if (scope.level === 'criterion') {
        store.actions.addCriterionEvidenceItems(scope.criterionCode, nextItems);
        draftState.files = [];
        draftState.existingAssetId = '';
        draftState.message = `${addedCount} ${addedCount === 1 ? 'file' : 'files'} added.`;
      } else {
        store.actions.addEvaluationEvidenceItems(nextItems);
        draftState.files = [];
        draftState.existingAssetId = '';
        draftState.message = `${addedCount} ${addedCount === 1 ? 'file' : 'files'} added.`;
      }

      draftState.note = '';
      draftState.evidenceType = '';
    } catch (error) {
      draftState.busy = false;
      draftState.message = error instanceof Error
        ? error.message
        : 'Failed to add evidence.';
      updateBlockFromElement(actionTarget);
    }
  };

  const handleKeydown = (event) => {
    if (event.key === 'Escape') {
      closeEvidenceLightbox(documentRef);
    }
  };

  questionnaireRoot.addEventListener('input', handleInput);
  questionnaireRoot.addEventListener('change', handleChange);
  documentRef.addEventListener('click', handleClick);
  documentRef.addEventListener('keydown', handleKeydown);

  cleanup.push(() => {
    questionnaireRoot.removeEventListener('input', handleInput);
    questionnaireRoot.removeEventListener('change', handleChange);
    documentRef.removeEventListener('click', handleClick);
    documentRef.removeEventListener('keydown', handleKeydown);
  });

  const unsubscribe = store.subscribe((state) => {
    syncEvidenceBlocks({
      questionnaireRoot,
      state,
      draftsByKey,
    });
  }, { immediate: true });

  cleanup.push(unsubscribe);

  return {
    destroy() {
      closeEvidenceLightbox(documentRef);
      cleanup.splice(0).forEach((dispose) => {
        dispose();
      });
    },
  };
};
