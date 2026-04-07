import { CRITERIA_BY_CODE } from '../config/questionnaire-schema.js';
import { SECTION_IDS } from '../config/sections.js';
import {
  appendChildren,
  createElement,
  createSelectControl,
  createTextareaControl,
} from './dom-factories.js';
import {
  buildEvidenceDownloadUrl,
  createEvidenceLink,
  deleteEvidenceAsset,
  deleteEvidenceLink,
  finalizeEvidenceUpload,
  getEvidenceManifest,
  initializeEvidenceUpload,
  listEvidence,
  updateEvidenceLink,
} from '../api/evidence.js';
import { createEvidenceManifest, serializeEvidenceManifest } from '../adapters/evidence-storage.js';
import {
  EMPTY_ARRAY,
  isPlainObject,
  toArray,
  inferMimeTypeFromName,
  extractEvidenceItems,
  normalizeTextValue,
  isImageMimeType,
} from '../utils/shared.js';
import { confirmDialog } from '../utils/confirm-dialog.js';
import { ensureSurfaceManager } from '../utils/surface-manager.js';

const EVIDENCE_BLOCK_SELECTOR = '[data-evidence-block="true"]';
const LIGHTBOX_ELEMENT_ID = 'questionnaire-evidence-lightbox';
const MANIFEST_DOWNLOAD_NAME = 'trust-evidence-manifest.json';
const REVIEW_WORKSPACE_PATH_PATTERN = /^\/reviews\/([^/]+)\/workspace(?:\/|$)/;
const TEST_RUN_SYNC_EVENT = 'trust:test-runs-sync';

const LIGHTBOX_SURFACE_ID = 'questionnaire-evidence-lightbox-surface';

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

const hasMeaningfulText = (value) => typeof value === 'string' && value.trim().length > 0;

const isDataUrl = (value) => typeof value === 'string' && value.startsWith('data:');

const resolveEvidenceAccessUrl = (item) =>
  normalizeTextValue(item?.downloadUrl) ??
  (isDataUrl(item?.dataUrl) ? normalizeTextValue(item?.dataUrl) : null);

const resolveBackendReviewId = (documentRef) => {
  const pathname = documentRef?.defaultView?.location?.pathname ?? '';
  const match = pathname.match(REVIEW_WORKSPACE_PATH_PATTERN);

  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

const createQueueEntry = ({ id, name, status, detail = '' } = {}) => ({
  id: id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: name ?? 'Evidence item',
  status: status ?? 'pending',
  detail: detail ?? '',
});

const formatQueueEntry = (entry) => {
  if (!entry) {
    return '';
  }

  const statusLabel =
    entry.status === 'uploading'
      ? 'Uploading'
      : entry.status === 'linking'
        ? 'Linking'
        : entry.status === 'linked'
          ? 'Linked'
          : entry.status === 'error'
            ? 'Failed'
            : 'Queued';

  return `${statusLabel}: ${entry.name}${entry.detail ? ` — ${entry.detail}` : ''}`;
};

const projectEvidenceResponseToCompatibility = ({ evidence, reviewId } = {}) => {
  const assets = Array.isArray(evidence?.assets) ? evidence.assets : [];
  const links = Array.isArray(evidence?.links) ? evidence.links : [];
  const assetMap = new Map(assets.map((asset) => [asset.assetId, asset]));
  const nextEvidence = {
    evaluation: [],
    criteria: {},
  };

  links.forEach((link) => {
    if (link.scopeType === 'review_inbox') {
      return;
    }

    const asset = assetMap.get(link.assetId);
    if (!asset) {
      return;
    }

    const item = {
      id: link.linkId,
      assetId: link.assetId,
      scope: link.scopeType,
      sectionId: link.scopeType === 'criterion' ? link.sectionId : SECTION_IDS.S2,
      criterionCode: link.criterionCode,
      evidenceType: link.evidenceType,
      note: link.note,
      name: asset.originalName ?? asset.sanitizedName ?? asset.assetId,
      mimeType: asset.mimeType,
      size: asset.sizeBytes,
      isImage: asset.assetKind === 'image' || isImageMimeType(asset.mimeType),
      dataUrl: null,
      downloadUrl:
        normalizeTextValue(asset.downloadUrl) ??
        (reviewId
          ? buildEvidenceDownloadUrl(reviewId, asset.assetId, { linkId: link.linkId })
          : null),
      previewDataUrl: null,
      addedAt: asset.capturedAtClient ?? link.linkedAt ?? asset.createdAt ?? asset.receivedAtServer,
    };

    if (link.scopeType === 'criterion' && link.criterionCode) {
      if (!nextEvidence.criteria[link.criterionCode]) {
        nextEvidence.criteria[link.criterionCode] = [];
      }

      nextEvidence.criteria[link.criterionCode].push(item);
      return;
    }

    nextEvidence.evaluation.push(item);
  });

  return nextEvidence;
};

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

const getEvidenceTypeLabel = (value) => EVIDENCE_TYPE_LABELS[value] ?? value ?? 'Unknown';

const createEmptyDraftState = () => ({
  evidenceType: '',
  note: '',
  files: [],
  existingAssetId: '',
  replaceItemId: null,
  busy: false,
  queue: [],
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

const PRINCIPLE_EVIDENCE_HINTS = Object.freeze({
  tr: 'No evidence attached. Attach source documentation, screenshots, or methodology disclosures.',
  re: 'No evidence attached. Attach repeated-query results, verification records, or accuracy test data.',
  uc: 'No evidence attached. Attach usability observations, accessibility test results, or workflow screenshots.',
  se: 'No evidence attached. Attach privacy policy excerpts, DPIA notes, or compliance records.',
  tc: 'No evidence attached. Attach provenance path screenshots, source verification records, or attribution samples.',
});

const getEvidenceEmptyStateText = (scope) => {
  if (scope.level === 'evaluation') {
    return 'No evaluation-level evidence attached yet.';
  }

  const principleKey = scope.criterionCode?.slice(0, 2).toLowerCase();
  return PRINCIPLE_EVIDENCE_HINTS[principleKey] ?? 'No criterion-level evidence attached yet.';
};

const getEvidenceBlockDescription = (scope) => {
  if (scope.level === 'evaluation') {
    return 'Attach review-level evidence used across multiple criteria or general workflow setup.';
  }

  return `Attach only evidence that directly supports ${scope.criterionCode}. Reuse shared review evidence when appropriate.`;
};

const getEvidenceStatusKind = ({ draftState, items, replaceTarget } = {}) => {
  if (
    Array.isArray(draftState?.queue) &&
    draftState.queue.some((entry) => entry.status === 'error')
  ) {
    return 'error';
  }

  if (draftState?.busy || (Array.isArray(draftState?.queue) && draftState.queue.length > 0)) {
    return 'processing';
  }

  if (replaceTarget) {
    return 'attention';
  }

  if (Array.isArray(items) && items.length > 0) {
    return 'ready';
  }

  return 'empty';
};

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
    Array.isArray(items) ? items : [],
  ),
];

const getEvidenceAssetId = (item) => normalizeTextValue(item?.assetId ?? item?.id);

const getEvidenceItemUsageCount = (state, assetId) =>
  getAllEvidenceItems(state).filter((item) => getEvidenceAssetId(item) === assetId).length;

const getEvidenceItemByAssetId = ({ state, assetId } = {}) => {
  const normalizedAssetId = normalizeTextValue(assetId);

  if (!normalizedAssetId) {
    return null;
  }

  return (
    getAllEvidenceItems(state).find((item) => getEvidenceAssetId(item) === normalizedAssetId) ??
    null
  );
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
  item?.criterionCode ? `${item.criterionCode}` : 'Evaluation';

const createReusableEvidenceOptionLabel = (item, state) => {
  const assetId = getEvidenceAssetId(item);
  const usageCount = assetId ? getEvidenceItemUsageCount(state, assetId) : 0;
  const usageText = usageCount > 1 ? ` · ${usageCount} links` : '';

  return `${item.name ?? 'Unnamed evidence'} — ${describeEvidenceSource(item)}${usageText}`;
};

const syncReusableEvidenceSelect = ({ select, items, selectedAssetId, state } = {}) => {
  if (!(select instanceof HTMLSelectElement)) {
    return '';
  }

  const normalizedSelectedAssetId = normalizeTextValue(selectedAssetId) ?? '';
  const documentRef = select.ownerDocument ?? document;
  const options = [
    createElement('option', {
      documentRef,
      text:
        items.length > 0 ? 'Select existing evidence to reuse' : 'No reusable evidence available',
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
      }),
    ),
  ];

  select.replaceChildren(...options);

  const allowedAssetIds = new Set(items.map((item) => getEvidenceAssetId(item)).filter(Boolean));
  const nextValue = allowedAssetIds.has(normalizedSelectedAssetId) ? normalizedSelectedAssetId : '';
  select.value = nextValue;

  return nextValue;
};

const createEvidenceSelect = ({ documentRef, value = '', disabled = false } = {}) =>
  createSelectControl({
    documentRef,
    options: [...EVIDENCE_TYPE_OPTIONS],
    valueText: value,
    placeholderText: 'Select evidence type',
    dataset: {
      evidenceControl: 'type',
    },
    attributes: {
      'aria-label': 'Evidence type',
    },
    disabled,
  });

const createReusableEvidenceSelect = ({ documentRef, disabled = false } = {}) =>
  createSelectControl({
    documentRef,
    options: [],
    placeholderText: 'No reusable evidence available',
    dataset: {
      evidenceControl: 'existing-asset',
    },
    attributes: {
      'aria-label': 'Reuse existing evidence',
    },
    disabled,
  });

const createEvidenceInputGroup = ({ documentRef, label, control, className = '' } = {}) =>
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

export const createEvidenceBlockElement = ({ documentRef, scope, editable = true } = {}) => {
  const typeControl = createEvidenceSelect({
    documentRef,
    disabled: !editable,
  });
  const noteControl = createTextareaControl({
    documentRef,
    valueText: '',
    placeholderText:
      scope.level === 'evaluation'
        ? 'Describe what this evidence supports at review level.'
        : `Explain how this evidence supports ${scope.criterionCode}.`,
    dataset: {
      evidenceControl: 'note',
    },
    attributes: {
      rows: '2',
      'aria-label': 'Evidence note',
    },
    disabled: !editable,
  });
  const existingAssetControl = createReusableEvidenceSelect({
    documentRef,
    disabled: !editable,
  });
  const fileInput = createElement('input', {
    documentRef,
    dataset: {
      evidenceControl: 'files',
    },
    attributes: {
      type: 'file',
      multiple: true,
      disabled: !editable ? true : null,
      'aria-label': 'Upload evidence files',
      style: 'display:none',
    },
  });

  const dropZone = createElement('div', {
    documentRef,
    className: 'evidence-drop-zone',
    attributes: {
      role: 'button',
      tabindex: editable ? '0' : '-1',
      'aria-label': 'Drop files here or paste evidence from the clipboard',
    },
    children: [
      createElement('span', {
        documentRef,
        className: 'evidence-drop-zone-title',
        text: 'Drop files here or paste clipboard evidence',
      }),
      createElement('span', {
        documentRef,
        className: 'evidence-drop-zone-hint',
        text: 'Use Browse files for the picker input. Attach only direct support for the current scope.',
      }),
    ],
  });

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  const actionButtons = [];

  if (scope.level === 'evaluation') {
    actionButtons.push(
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
    className: [
      'field-group',
      'evidence-block',
      scope.level === 'criterion' ? 'criterion' : 'evaluation',
    ],
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
                    className: 'evidence-block-title',
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
          dropZone,
          fileInput,
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
                label: scope.level === 'criterion' ? 'Reuse stored evidence' : 'Reuse',
                control: existingAssetControl,
                className: scope.level === 'criterion' ? '' : 'is-disabled',
              }),
              createEvidenceInputGroup({
                documentRef,
                label: 'Note',
                control: noteControl,
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
                children: [
                  createElement('button', {
                    documentRef,
                    className: 'evidence-button',
                    text: 'Browse files',
                    dataset: {
                      evidenceAction: 'choose-files',
                    },
                    attributes: {
                      type: 'button',
                      disabled: !editable ? true : null,
                    },
                  }),
                  createElement('button', {
                    documentRef,
                    className: 'evidence-button',
                    text: 'Add evidence',
                    dataset: {
                      evidenceAction: 'add-files',
                    },
                    attributes: {
                      type: 'button',
                      disabled: !editable ? true : null,
                    },
                  }),
                  ...(scope.level === 'criterion'
                    ? [
                        createElement('button', {
                          documentRef,
                          className: 'evidence-button',
                          text: 'Reuse selected evidence',
                          dataset: {
                            evidenceAction: 'reuse-asset',
                          },
                          attributes: {
                            type: 'button',
                            disabled: !editable ? true : null,
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
                      ]
                    : []),
                  ...actionButtons,
                ],
              }),
            ],
          }),
          createElement('div', {
            documentRef,
            className: 'evidence-queue',
            dataset: {
              evidenceRole: 'queue',
            },
            attributes: {
              'aria-live': 'polite',
            },
          }),
          createElement('p', {
            documentRef,
            className: 'evidence-status',
            dataset: {
              evidenceRole: 'status',
              evidenceStatusKind: 'empty',
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

  return createElement('button', {
    documentRef,
    className: 'evidence-preview-button',
    dataset: {
      evidenceAction: 'open-lightbox',
      evidenceItemId: item.id,
    },
    attributes: {
      type: 'button',
      'aria-label': `Open preview for ${item.name ?? 'image evidence'}`,
    },
    children: [
      ...(imageSrc
        ? [
            createElement('img', {
              documentRef,
              className: 'evidence-preview-image',
              attributes: {
                src: imageSrc,
                alt: item.name ?? 'Evidence preview',
                loading: 'lazy',
              },
            }),
          ]
        : []),
      createElement('span', {
        documentRef,
        className: 'evidence-preview-caption',
        text: imageSrc ? 'Open preview' : 'Preview file',
      }),
    ],
  });
};

const createEvidenceDownloadLink = ({ documentRef, item } = {}) => {
  const downloadUrl = resolveEvidenceAccessUrl(item);

  if (!downloadUrl) {
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
      href: downloadUrl,
      download: item.name ?? 'evidence-file',
      target: '_blank',
      rel: 'noreferrer noopener',
    },
  });
};

const createLinkedTestRunSummary = ({ documentRef, linkedRuns = [] } = {}) => {
  if (!Array.isArray(linkedRuns) || linkedRuns.length === 0) {
    return null;
  }

  return createElement('div', {
    documentRef,
    className: 'evidence-linked-test-runs',
    children: [
      createElement('div', {
        documentRef,
        className: 'evidence-note-label',
        text: 'Linked test runs',
      }),
      createElement('div', {
        documentRef,
        className: 'evidence-item-meta',
        children: linkedRuns.map((run) =>
          createEvidenceMetaItem({
            documentRef,
            text: `${run.criterionCode ?? 'Review'} · case ${run.caseOrdinal} · ${run.status}`,
          }),
        ),
      }),
    ],
  });
};

const createEvidenceItemElement = ({ documentRef, item, editable = true } = {}) => {
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

  if (Array.isArray(item.linkedTestRuns) && item.linkedTestRuns.length > 0) {
    metaItems.push(
      createEvidenceMetaItem({
        documentRef,
        text: `${item.linkedTestRuns.length} test ${item.linkedTestRuns.length === 1 ? 'run' : 'runs'}`,
      }),
    );
  }

  const fileLead =
    item.isImage === true || isImageMimeType(item.mimeType)
      ? createEvidencePreviewButton({ documentRef, item })
      : createElement('div', {
          documentRef,
          className: 'evidence-file-row',
          children: [createEvidenceDownloadLink({ documentRef, item })],
        });

  return createElement('article', {
    documentRef,
    className: [
      'evidence-item',
      item.isImage === true || isImageMimeType(item.mimeType) ? 'is-image' : 'is-file',
    ],
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
                children:
                  item.scope === 'criterion'
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
            text: 'Notes',
          }),
          editable
            ? createElement('button', {
                documentRef,
                className: 'evidence-note evidence-note-button',
                dataset: {
                  evidenceAction: 'edit-note',
                  evidenceItemId: item.id,
                },
                attributes: {
                  type: 'button',
                  'aria-label': `Edit note for ${item.name ?? 'evidence item'}`,
                },
                text: item.note ?? 'No note recorded.',
              })
            : createElement('p', {
                documentRef,
                className: 'evidence-note',
                text: item.note ?? 'No note recorded.',
              }),
          createLinkedTestRunSummary({
            documentRef,
            linkedRuns: item.linkedTestRuns,
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

const renderEvidenceItems = ({ container, items, scope, editable } = {}) => {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  const documentRef = container.ownerDocument ?? document;
  const fingerprint =
    Array.isArray(items) && items.length > 0
      ? items
          .map(
            (i) =>
              `${i.id}:${i.note ?? ''}:${i.downloadUrl ?? ''}:${i.dataUrl ?? ''}:${(
                i.linkedTestRuns ?? []
              )
                .map((run) => `${run.runId}:${run.status}`)
                .join(',')}`,
          )
          .join('|')
      : '__empty__';

  if (container.dataset.renderedFingerprint === fingerprint) {
    return;
  }

  container.dataset.renderedFingerprint = fingerprint;

  if (!Array.isArray(items) || items.length === 0) {
    container.replaceChildren(createEvidenceEmptyState({ documentRef, scope }));
    return;
  }

  container.replaceChildren(
    ...items.map((item) =>
      createEvidenceItemElement({
        documentRef,
        item,
        editable,
      }),
    ),
  );
};

const renderEvidenceQueue = ({ container, queue = [] } = {}) => {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  if (!Array.isArray(queue) || queue.length === 0) {
    container.replaceChildren();
    container.hidden = true;
    return;
  }

  const documentRef = container.ownerDocument ?? document;
  container.hidden = false;
  container.replaceChildren(
    ...queue.map((entry) =>
      createElement('div', {
        documentRef,
        className: ['evidence-queue-item', `is-${entry.status ?? 'queued'}`],
        dataset: {
          queueStatus: entry.status ?? 'queued',
        },
        text: formatQueueEntry(entry),
      }),
    ),
  );
};

const describeSelectedFiles = (files) => {
  if (!Array.isArray(files) || files.length === 0) {
    return 'No files selected.';
  }

  if (files.length === 1) {
    return `1 file selected: ${files[0].name}`;
  }

  return `${files.length} files selected: ${files
    .slice(0, 3)
    .map((file) => file.name)
    .join(', ')}${files.length > 3 ? ', …' : ''}`;
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

const loadEvidencePreviewSource = async (item) => {
  const inlineSource = normalizeTextValue(item?.previewDataUrl ?? item?.dataUrl);

  if (inlineSource) {
    return {
      src: inlineSource,
      revoke() {},
    };
  }

  const downloadUrl = normalizeTextValue(item?.downloadUrl);
  if (!downloadUrl) {
    return null;
  }

  const response = await fetch(downloadUrl, {
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error(`Preview request failed with status ${response.status}.`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  return {
    src: objectUrl,
    revoke() {
      URL.revokeObjectURL(objectUrl);
    },
  };
};

const openEvidenceLightbox = async ({ documentRef, item, trigger } = {}) => {
  const lightbox = ensureEvidenceLightbox(documentRef);
  const closeButton = lightbox.querySelector('.evidence-lightbox-close');
  const image = lightbox.querySelector('.evidence-lightbox-image');
  const title = lightbox.querySelector('.evidence-lightbox-title');
  const note = lightbox.querySelector('.evidence-lightbox-note');
  const surfaceManager = ensureSurfaceManager({
    documentRef,
    statusRegion: documentRef.getElementById('reviewShellStatusLiveRegion'),
  });
  const previewSource = await loadEvidencePreviewSource(item);

  if (!(image instanceof HTMLImageElement) || !previewSource?.src) {
    return;
  }

  if (title instanceof HTMLElement) {
    title.textContent = item?.name ?? 'Evidence preview';
  }

  if (note instanceof HTMLElement) {
    note.textContent = item?.note ?? '';
  }

  if (typeof lightbox._revokePreviewSource === 'function') {
    lightbox._revokePreviewSource();
  }

  lightbox._returnFocusTarget = trigger instanceof HTMLElement ? trigger : null;
  lightbox._revokePreviewSource = previewSource.revoke;

  image.src = previewSource.src;
  image.alt = item?.name ?? 'Evidence preview image';

  const initialFocusTarget = closeButton instanceof HTMLButtonElement ? closeButton : lightbox;

  surfaceManager.registerSurface({
    id: LIGHTBOX_SURFACE_ID,
    element: lightbox,
    label: 'evidence preview',
    priority: 40,
    modal: true,
    initialFocusTarget,
    restoreFocusTarget: trigger instanceof HTMLElement ? trigger : null,
    closeAnnouncement: 'Closed evidence preview.',
    onBeforeClose() {
      const lightboxImage = lightbox.querySelector('.evidence-lightbox-image');
      if (lightboxImage instanceof HTMLImageElement) {
        lightboxImage.removeAttribute('src');
      }

      if (typeof lightbox._revokePreviewSource === 'function') {
        lightbox._revokePreviewSource();
      }

      lightbox._revokePreviewSource = null;
      lightbox._returnFocusTarget = null;
    },
  });

  surfaceManager.openSurface(LIGHTBOX_SURFACE_ID, {
    trigger: trigger instanceof HTMLElement ? trigger : null,
    initialFocusTarget,
    announceMessage: 'Opened evidence preview.',
  });
};

const closeEvidenceLightbox = (documentRef) => {
  const lightbox = documentRef.getElementById(LIGHTBOX_ELEMENT_ID);
  const surfaceManager = ensureSurfaceManager({
    documentRef,
    statusRegion: documentRef.getElementById('reviewShellStatusLiveRegion'),
  });

  if (!(lightbox instanceof HTMLElement) || lightbox.hidden) {
    return;
  }

  surfaceManager.closeSurface(LIGHTBOX_SURFACE_ID, { reason: 'dismiss' });

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

const syncEvidenceBlock = ({ block, state, draftsByKey, testRunLinksByEvidenceId } = {}) => {
  if (!(block instanceof HTMLElement)) {
    return;
  }

  const scope = resolveScopeFromElement(block);
  const draftState = ensureDraftState(draftsByKey, scope.key);
  const editable = getScopeEditableState(state, scope);
  const items = getEvidenceItemsForScope(state, scope);
  const replaceTarget = draftState.replaceItemId
    ? (items.find((item) => item?.id === draftState.replaceItemId) ?? null)
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
    linkedTestRuns: Array.isArray(testRunLinksByEvidenceId?.get(item.id))
      ? testRunLinksByEvidenceId.get(item.id)
      : EMPTY_ARRAY,
  }));
  const countElement = block.querySelector('[data-evidence-role="count"]');
  const selectionSummaryElement = block.querySelector('[data-evidence-role="selection-summary"]');
  const statusElement = block.querySelector('[data-evidence-role="status"]');
  const queueElement = block.querySelector('[data-evidence-role="queue"]');
  const itemsContainer = block.querySelector('[data-evidence-role="items"]');
  const typeControl = block.querySelector('[data-evidence-control="type"]');
  const noteControl = block.querySelector('[data-evidence-control="note"]');
  const existingAssetControl = block.querySelector('[data-evidence-control="existing-asset"]');
  const fileControl = block.querySelector('[data-evidence-control="files"]');
  const addButton = block.querySelector('[data-evidence-action="add-files"]');
  const reuseButton = block.querySelector('[data-evidence-action="reuse-asset"]');
  const cancelReplaceButton = block.querySelector('[data-evidence-action="cancel-replace"]');
  const exportButton = block.querySelector('[data-evidence-action="export-manifest"]');
  const chooseFilesButton = block.querySelector('[data-evidence-action="choose-files"]');
  const statusKind = getEvidenceStatusKind({
    draftState,
    items: decoratedItems,
    replaceTarget,
  });

  if (countElement instanceof HTMLElement) {
    countElement.textContent = `${decoratedItems.length} ${
      decoratedItems.length === 1 ? 'file' : 'files'
    }`;
  }

  if (selectionSummaryElement instanceof HTMLElement) {
    selectionSummaryElement.textContent = describeSelectedFiles(draftState.files);
  }

  renderEvidenceQueue({
    container: queueElement,
    queue: draftState.queue,
  });

  if (statusElement instanceof HTMLElement) {
    statusElement.dataset.evidenceStatusKind = statusKind;
    statusElement.textContent =
      draftState.message ||
      (draftState.queue.length > 0
        ? formatQueueEntry(draftState.queue[draftState.queue.length - 1])
        : '') ||
      (replaceTarget
        ? `Replace mode active for ${replaceTarget.name ?? 'selected evidence'}. Select one new file or one existing evidence item.`
        : decoratedItems.length > 0
          ? `${decoratedItems.length} ${decoratedItems.length === 1 ? 'file is' : 'files are'} attached.`
          : getEvidenceEmptyStateText(scope));
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
    typeControl.setAttribute('aria-disabled', String(Boolean(!editable || draftState.busy)));
  }

  if (noteControl instanceof HTMLTextAreaElement) {
    noteControl.readOnly = !editable || draftState.busy;
    noteControl.setAttribute('aria-readonly', String(Boolean(!editable || draftState.busy)));
  }

  if (existingAssetControl instanceof HTMLSelectElement) {
    existingAssetControl.disabled = !editable || draftState.busy || reusableItems.length === 0;
    existingAssetControl.setAttribute(
      'aria-disabled',
      String(Boolean(!editable || draftState.busy || reusableItems.length === 0)),
    );
  }

  if (fileControl instanceof HTMLInputElement) {
    fileControl.disabled = !editable || draftState.busy;

    if (!draftState.files.length && fileControl.value) {
      fileControl.value = '';
    }
  }

  if (addButton instanceof HTMLButtonElement) {
    addButton.disabled =
      !editable ||
      draftState.busy ||
      draftState.files.length === 0 ||
      !hasMeaningfulText(draftState.note) ||
      !hasMeaningfulText(draftState.evidenceType) ||
      (draftState.replaceItemId !== null && draftState.files.length !== 1);
    addButton.textContent = draftState.busy
      ? draftState.replaceItemId !== null
        ? 'Replacing…'
        : 'Adding…'
      : draftState.replaceItemId !== null
        ? 'Replace with upload'
        : 'Add evidence';
  }

  if (chooseFilesButton instanceof HTMLButtonElement) {
    chooseFilesButton.disabled = !editable || draftState.busy;
  }

  if (reuseButton instanceof HTMLButtonElement) {
    reuseButton.disabled =
      !editable ||
      draftState.busy ||
      !hasMeaningfulText(draftState.note) ||
      !hasMeaningfulText(draftState.evidenceType) ||
      !hasMeaningfulText(draftState.existingAssetId);
    reuseButton.textContent =
      draftState.replaceItemId !== null
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

const syncEvidenceBlocks = ({
  questionnaireRoot,
  state,
  draftsByKey,
  testRunLinksByEvidenceId,
} = {}) => {
  const activePageId = state.ui?.activePageId;
  toArray(questionnaireRoot.querySelectorAll(EVIDENCE_BLOCK_SELECTOR)).forEach((block) => {
    if (activePageId) {
      const blockPageId = block.dataset.evidencePageId;
      if (blockPageId && blockPageId !== activePageId) return;
    }
    syncEvidenceBlock({
      block,
      state,
      draftsByKey,
      testRunLinksByEvidenceId,
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

const createStoredEvidenceItem = async ({ file, scope, evidenceType, note } = {}) => {
  const dataUrl = await readFileAsDataUrl(file);
  const normalizedNote = note.trim();
  const mimeType =
    normalizeTextValue(file.type) ?? inferMimeTypeFromName(file.name) ?? 'application/octet-stream';

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

const getEvidenceItemById = ({ state, scope, itemId } = {}) =>
  getEvidenceItemsForScope(state, scope).find((item) => item?.id === itemId) ?? null;

export const initializeEvidenceUi = ({ root = document, store } = {}) => {
  const documentRef = root?.ownerDocument ?? root ?? document;
  const questionnaireRoot = documentRef.getElementById('questionnaireRenderRoot');

  if (!questionnaireRoot || !store?.subscribe || !store?.actions) {
    return {
      destroy() {},
    };
  }

  const reviewId = resolveBackendReviewId(documentRef);
  const usesBackendEvidence = hasMeaningfulText(reviewId);
  const draftsByKey = new Map();
  const testRunLinksByEvidenceId = new Map();
  const cleanup = [];
  let destroyed = false;

  const syncBlock = (block) => {
    if (!(block instanceof HTMLElement)) {
      return;
    }

    syncEvidenceBlock({
      block,
      state: store.getState(),
      draftsByKey,
      testRunLinksByEvidenceId,
    });
  };

  const syncAllBlocks = (state = store.getState()) => {
    syncEvidenceBlocks({
      questionnaireRoot,
      state,
      draftsByKey,
      testRunLinksByEvidenceId,
    });
  };

  const setDraftMessage = (scope, message) => {
    const draftState = ensureDraftState(draftsByKey, scope.key);
    draftState.message = message;
  };

  const resetDraftIntake = (draftState, block) => {
    draftState.files = [];
    draftState.existingAssetId = '';
    draftState.replaceItemId = null;
    draftState.queue = [];

    const fileInput = block?.querySelector('[data-evidence-control="files"]');
    if (fileInput instanceof HTMLInputElement) {
      fileInput.value = '';
    }
  };

  const inferDraftEvidenceType = (files) => {
    if (!Array.isArray(files) || files.length === 0) {
      return '';
    }

    const mimeTypes = files.map(
      (file) => normalizeTextValue(file?.type) ?? inferMimeTypeFromName(file?.name),
    );
    if (mimeTypes.every((mimeType) => isImageMimeType(mimeType))) {
      return 'screenshot';
    }

    if (mimeTypes.some((mimeType) => mimeType === 'application/json')) {
      return 'export';
    }

    return 'document';
  };

  const syncEvidenceProjectionFromServer = async () => {
    if (!usesBackendEvidence) {
      return null;
    }

    const response = await listEvidence(reviewId);
    if (destroyed) {
      return response;
    }

    const nextEvidence = projectEvidenceResponseToCompatibility({
      evidence: response?.evidence,
      reviewId,
    });

    store.actions.replaceEvidenceProjection({
      evaluationItems: nextEvidence.evaluation,
      criterionItems: nextEvidence.criteria,
    });

    return response;
  };

  const removeLinkOrAsset = async (stateSnapshot, item, { forceDeleteAsset = false } = {}) => {
    if (!usesBackendEvidence || !item) {
      return;
    }

    const usageCount = getEvidenceItemUsageCount(stateSnapshot, getEvidenceAssetId(item));

    if (forceDeleteAsset || usageCount <= 1) {
      await deleteEvidenceAsset(reviewId, item.assetId);
      return;
    }

    await deleteEvidenceLink(reviewId, item.id);
  };

  const uploadFileToBackend = async ({ file, queueEntry } = {}) => {
    if (!(file instanceof File)) {
      throw new Error('A file is required to upload evidence.');
    }

    queueEntry.status = 'uploading';
    queueEntry.detail = 'Initializing upload';

    const upload = await initializeEvidenceUpload(reviewId, {
      originalName: file.name,
      mimeType:
        normalizeTextValue(file.type) ??
        inferMimeTypeFromName(file.name) ??
        'application/octet-stream',
      sizeBytes: Number.isFinite(file.size) ? file.size : null,
      assetKind:
        isImageMimeType(file.type) || isImageMimeType(inferMimeTypeFromName(file.name))
          ? 'image'
          : 'document',
      sourceType: 'manual_upload',
      capturedAtClient: new Date().toISOString(),
    });

    queueEntry.detail = 'Finalizing asset';
    const dataUrl = await readFileAsDataUrl(file);
    const finalized = await finalizeEvidenceUpload(reviewId, {
      uploadToken: upload?.upload?.uploadToken,
      dataUrl,
    });

    return finalized?.asset ?? null;
  };

  const createBackendLinkForScope = ({ scope, assetId, evidenceType, note } = {}) =>
    createEvidenceLink(reviewId, {
      assetId,
      scopeType: scope.level,
      criterionCode: scope.criterionCode,
      evidenceType,
      note,
    });

  const updateBlockFromElement = (element) => {
    const block = element.closest(EVIDENCE_BLOCK_SELECTOR);

    if (!(block instanceof HTMLElement)) {
      return;
    }

    syncBlock(block);
  };

  const handleTestRunSync = (event) => {
    const linkedRunsByEvidenceId = event?.detail?.byEvidenceLinkId ?? {};

    testRunLinksByEvidenceId.clear();
    Object.entries(linkedRunsByEvidenceId).forEach(([evidenceLinkId, linkedRuns]) => {
      testRunLinksByEvidenceId.set(evidenceLinkId, Array.isArray(linkedRuns) ? linkedRuns : []);
    });

    syncAllBlocks();
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
    const editable = getScopeEditableState(store.getState(), scope);
    if (!editable) return;

    const files = toArray(control.files).filter((file) => file instanceof File);
    if (files.length === 0) return;

    const draftState = ensureDraftState(draftsByKey, scope.key);
    draftState.files = files;
    draftState.queue = files.map((file) => createQueueEntry({ name: file.name, status: 'queued' }));
    draftState.message = `${files.length} ${
      files.length === 1 ? 'file staged' : 'files staged'
    }. Review type and note, then add.`;

    if (!hasMeaningfulText(draftState.evidenceType)) {
      draftState.evidenceType = inferDraftEvidenceType(files);
    }

    if (!hasMeaningfulText(draftState.note)) {
      draftState.note =
        files.length === 1 ? files[0].name : `${files.length} files uploaded together`;
    }

    control.value = '';

    syncBlock(block);
  };

  const handleClick = async (event) => {
    const actionTarget =
      event.target instanceof HTMLElement ? event.target.closest('[data-evidence-action]') : null;

    if (!(actionTarget instanceof HTMLElement)) {
      return;
    }

    const action = actionTarget.dataset.evidenceAction;

    if (action === 'close-lightbox') {
      closeEvidenceLightbox(documentRef);
      return;
    }

    if (action === 'edit-note') {
      const noteEl = actionTarget;
      const itemId = noteEl.dataset.evidenceItemId;
      const block = noteEl.closest(EVIDENCE_BLOCK_SELECTOR);
      if (!itemId || !block) return;

      const scope = resolveScopeFromElement(block);
      const editable = getScopeEditableState(store.getState(), scope);
      if (!editable) return;

      const currentText = noteEl.textContent === 'No note recorded.' ? '' : noteEl.textContent;

      const textarea = createElement('textarea', {
        documentRef,
        className: 'evidence-note-editor',
        text: currentText,
        attributes: {
          rows: 2,
          'aria-label': 'Edit note',
        },
      });

      noteEl.replaceWith(textarea);
      textarea.focus();

      const handleBlur = async () => {
        textarea.removeEventListener('blur', handleBlur);
        const newNote = textarea.value.trim();

        if (!newNote || newNote === currentText) {
          const noteButton = createElement('button', {
            documentRef,
            className: 'evidence-note evidence-note-button',
            dataset: {
              evidenceAction: 'edit-note',
              evidenceItemId: itemId,
            },
            attributes: {
              type: 'button',
              'aria-label': 'Edit evidence note',
            },
            text: currentText || 'No note recorded.',
          });
          textarea.replaceWith(noteButton);
          return;
        }

        try {
          if (usesBackendEvidence) {
            await updateEvidenceLink(reviewId, itemId, {
              note: newNote,
            });
            await syncEvidenceProjectionFromServer();
          } else if (scope.level === 'criterion') {
            store.actions.updateCriterionEvidenceItemNote(scope.criterionCode, itemId, newNote);
          } else {
            store.actions.updateEvaluationEvidenceItemNote(itemId, newNote);
          }

          setDraftMessage(scope, 'Evidence note updated.');
          syncBlock(block);
        } catch (error) {
          setDraftMessage(
            scope,
            error instanceof Error ? error.message : 'Failed to update the evidence note.',
          );
          syncBlock(block);
        }
      };

      textarea.addEventListener('blur', handleBlur);
      return;
    }

    if (action === 'export-manifest') {
      const block = actionTarget.closest(EVIDENCE_BLOCK_SELECTOR);
      if (block instanceof HTMLElement) {
        const scope = resolveScopeFromElement(block);
        const draftState = ensureDraftState(draftsByKey, scope.key);

        try {
          const manifest = usesBackendEvidence
            ? await getEvidenceManifest(reviewId)
            : createEvidenceManifest(store.getState().evaluation);
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

          draftState.message = 'Evidence manifest exported.';
          updateBlockFromElement(actionTarget);
        } catch (error) {
          draftState.message =
            error instanceof Error ? error.message : 'Failed to export evidence manifest.';
          updateBlockFromElement(actionTarget);
        }
      }
      return;
    }

    if (action === 'choose-files') {
      const fileControl = block.querySelector('[data-evidence-control="files"]');
      if (fileControl instanceof HTMLInputElement && !fileControl.disabled) {
        fileControl.click();
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
      resetDraftIntake(draftState, block);
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

      try {
        await openEvidenceLightbox({
          documentRef,
          item,
          trigger: actionTarget,
        });
      } catch (error) {
        draftState.message = error instanceof Error ? error.message : 'Failed to open preview.';
        syncBlock(block);
      }
      return;
    }

    if (action === 'cancel-replace') {
      clearReplaceMode();
      draftState.message = 'Replace mode cancelled.';
      syncBlock(block);
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

      syncBlock(block);
      return;
    }

    if (action === 'remove-item') {
      const itemId = actionTarget.dataset.evidenceItemId;

      if (!itemId) {
        return;
      }

      try {
        if (usesBackendEvidence) {
          const stateSnapshot = store.getState();
          const item = getEvidenceItemById({ state: stateSnapshot, scope, itemId });
          await removeLinkOrAsset(stateSnapshot, item);
          await syncEvidenceProjectionFromServer();
        } else if (scope.level === 'criterion') {
          store.actions.removeCriterionEvidenceItem(scope.criterionCode, itemId);
        } else {
          store.actions.removeEvaluationEvidenceItem(itemId);
        }

        draftState.message = 'Evidence item removed.';
      } catch (error) {
        draftState.message =
          error instanceof Error ? error.message : 'Failed to remove evidence item.';
      }
      syncBlock(block);
      return;
    }

    if (action === 'unlink-item') {
      const itemId = actionTarget.dataset.evidenceItemId;

      if (!itemId || scope.level !== 'criterion') {
        return;
      }

      try {
        if (usesBackendEvidence) {
          const stateSnapshot = store.getState();
          const item = getEvidenceItemById({ state: stateSnapshot, scope, itemId });
          await removeLinkOrAsset(stateSnapshot, item);
          await syncEvidenceProjectionFromServer();
        } else {
          store.actions.unlinkCriterionEvidenceItem(scope.criterionCode, itemId);
        }

        if (draftState.replaceItemId === itemId) {
          clearReplaceMode();
        }

        draftState.message = 'Evidence association removed from this criterion.';
      } catch (error) {
        draftState.message =
          error instanceof Error
            ? error.message
            : 'Failed to remove the criterion evidence association.';
      }
      syncBlock(block);
      return;
    }

    if (action === 'remove-asset') {
      const assetId = actionTarget.dataset.evidenceAssetId;
      const sourceItem = getEvidenceItemByAssetId({
        state: store.getState(),
        assetId,
      });
      const usageCount = getEvidenceItemUsageCount(store.getState(), normalizeTextValue(assetId));
      const confirmMessage =
        usageCount > 1
          ? `Remove “${sourceItem?.name ?? 'this evidence file'}” everywhere? This will remove ${usageCount} linked associations.`
          : `Remove “${sourceItem?.name ?? 'this evidence file'}” from this questionnaire?`;
      const shouldRemove = await confirmDialog(confirmMessage, { documentRef });

      if (!shouldRemove) {
        return;
      }

      try {
        if (usesBackendEvidence) {
          await deleteEvidenceAsset(reviewId, assetId);
          await syncEvidenceProjectionFromServer();
        } else {
          store.actions.removeEvidenceAsset(assetId);
        }

        if (
          draftState.replaceItemId &&
          getEvidenceItemById({
            state: store.getState(),
            scope,
            itemId: draftState.replaceItemId,
          }) === null
        ) {
          clearReplaceMode();
        }

        draftState.message = 'Evidence file removed everywhere it was linked.';
      } catch (error) {
        draftState.message =
          error instanceof Error ? error.message : 'Failed to remove the evidence file.';
      }
      syncBlock(block);
      return;
    }

    if (action === 'reuse-asset') {
      if (scope.level !== 'criterion') {
        return;
      }

      if (
        !hasMeaningfulText(draftState.note) ||
        !hasMeaningfulText(draftState.evidenceType) ||
        !hasMeaningfulText(draftState.existingAssetId)
      ) {
        draftState.message =
          'Select existing evidence, an evidence type, and a note before linking it to this criterion.';
        updateBlockFromElement(actionTarget);
        return;
      }

      if (draftState.replaceItemId) {
        try {
          if (usesBackendEvidence) {
            const stateSnapshot = store.getState();
            const currentItem = getEvidenceItemById({
              state: stateSnapshot,
              scope,
              itemId: draftState.replaceItemId,
            });

            if (!currentItem) {
              throw new Error('The evidence association to replace was not found.');
            }

            if (currentItem.assetId === draftState.existingAssetId) {
              await updateEvidenceLink(reviewId, currentItem.id, {
                evidenceType: draftState.evidenceType,
                note: draftState.note,
              });
            } else {
              await createBackendLinkForScope({
                scope,
                assetId: draftState.existingAssetId,
                evidenceType: draftState.evidenceType,
                note: draftState.note,
              });
              await removeLinkOrAsset(stateSnapshot, currentItem);
            }

            await syncEvidenceProjectionFromServer();
          } else {
            store.actions.replaceCriterionEvidenceItem(
              scope.criterionCode,
              draftState.replaceItemId,
              {
                assetId: draftState.existingAssetId,
                evidenceType: draftState.evidenceType,
                note: draftState.note,
              },
            );
          }

          draftState.message = 'Criterion evidence association replaced with existing evidence.';
        } catch (error) {
          draftState.message =
            error instanceof Error ? error.message : 'Failed to reuse existing evidence.';
          updateBlockFromElement(actionTarget);
          return;
        }
      } else {
        try {
          if (usesBackendEvidence) {
            await createBackendLinkForScope({
              scope,
              assetId: draftState.existingAssetId,
              evidenceType: draftState.evidenceType,
              note: draftState.note,
            });
            await syncEvidenceProjectionFromServer();
          } else {
            store.actions.reuseCriterionEvidenceAsset(
              scope.criterionCode,
              draftState.existingAssetId,
              {
                evidenceType: draftState.evidenceType,
                note: draftState.note,
              },
            );
          }

          draftState.message = 'Existing evidence linked to this criterion.';
        } catch (error) {
          draftState.message =
            error instanceof Error ? error.message : 'Failed to link existing evidence.';
          updateBlockFromElement(actionTarget);
          return;
        }
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

    if (
      !draftState.files.length ||
      !hasMeaningfulText(draftState.note) ||
      !hasMeaningfulText(draftState.evidenceType)
    ) {
      draftState.message =
        'Select at least one file, an evidence type, and a note before adding evidence.';
      updateBlockFromElement(actionTarget);
      return;
    }

    if (draftState.replaceItemId && draftState.files.length !== 1) {
      draftState.message = 'Replacing an association requires exactly one new file.';
      updateBlockFromElement(actionTarget);
      return;
    }

    draftState.busy = true;
    draftState.message = draftState.replaceItemId
      ? 'Reading replacement file…'
      : 'Reading selected file(s)…';
    updateBlockFromElement(actionTarget);

    try {
      if (usesBackendEvidence) {
        draftState.queue = draftState.files.map((file) =>
          createQueueEntry({
            name: file.name,
            status: 'queued',
          }),
        );
        syncBlock(block);

        const uploadedAssets = [];
        for (const [index, file] of draftState.files.entries()) {
          const queueEntry = draftState.queue[index];
          const asset = await uploadFileToBackend({ file, queueEntry });
          queueEntry.status = 'linking';
          queueEntry.detail = 'Creating evidence link';
          uploadedAssets.push(asset);
        }

        const stateSnapshot = store.getState();
        const replaceTarget = draftState.replaceItemId
          ? getEvidenceItemById({
              state: stateSnapshot,
              scope,
              itemId: draftState.replaceItemId,
            })
          : null;

        if (scope.level === 'criterion' && draftState.replaceItemId) {
          await createBackendLinkForScope({
            scope,
            assetId: uploadedAssets[0]?.assetId,
            evidenceType: draftState.evidenceType,
            note: draftState.note,
          });

          if (replaceTarget) {
            await removeLinkOrAsset(stateSnapshot, replaceTarget);
          }
        } else {
          for (const asset of uploadedAssets) {
            await createBackendLinkForScope({
              scope,
              assetId: asset?.assetId,
              evidenceType: draftState.evidenceType,
              note: draftState.note,
            });
          }
        }

        draftState.queue = draftState.queue.map((entry) => ({
          ...entry,
          status: 'linked',
          detail: 'Stored on server',
        }));
        await syncEvidenceProjectionFromServer();
      } else {
        const nextItems = await Promise.all(
          draftState.files.map((file) =>
            createStoredEvidenceItem({
              file,
              scope,
              evidenceType: draftState.evidenceType,
              note: draftState.note,
            }),
          ),
        );

        if (scope.level === 'criterion' && draftState.replaceItemId) {
          store.actions.replaceCriterionEvidenceItem(
            scope.criterionCode,
            draftState.replaceItemId,
            {
              ...nextItems[0],
              evidenceType: draftState.evidenceType,
              note: draftState.note,
            },
          );
          draftState.message = 'Criterion evidence association replaced with a new upload.';
          clearReplaceMode();
        } else if (scope.level === 'criterion') {
          store.actions.addCriterionEvidenceItems(scope.criterionCode, nextItems);
          draftState.message = `${nextItems.length} ${nextItems.length === 1 ? 'file' : 'files'} added.`;
        } else {
          store.actions.addEvaluationEvidenceItems(nextItems);
          draftState.message = `${nextItems.length} ${nextItems.length === 1 ? 'file' : 'files'} added.`;
        }
      }

      const addedCount = draftState.files.length;
      draftState.busy = false;

      if (scope.level === 'criterion' && draftState.replaceItemId) {
        draftState.message = 'Criterion evidence association replaced with a new upload.';
      } else {
        draftState.message = `${addedCount} ${addedCount === 1 ? 'file' : 'files'} added.`;
      }

      draftState.note = '';
      draftState.evidenceType = '';
      resetDraftIntake(draftState, block);
      syncBlock(block);
    } catch (error) {
      draftState.busy = false;
      draftState.queue = draftState.queue.map((entry) => ({
        ...entry,
        status: 'error',
        detail: error instanceof Error ? error.message : 'Upload failed',
      }));
      draftState.message = error instanceof Error ? error.message : 'Failed to add evidence.';
      updateBlockFromElement(actionTarget);
    }
  };

  const handlePaste = (event) => {
    const clipboard = event.clipboardData;
    if (!clipboard || !clipboard.files || clipboard.files.length === 0) {
      return;
    }

    const control = event.target;
    const block =
      control instanceof HTMLElement
        ? control.closest(EVIDENCE_BLOCK_SELECTOR) || control.closest('.criterion-card')
        : null;
    if (!block) return;

    let scope;
    if (block.matches(EVIDENCE_BLOCK_SELECTOR)) {
      scope = resolveScopeFromElement(block);
    } else {
      const criterionCode = block.dataset.criterion;
      if (!criterionCode) return;
      scope = createEvidenceScope({ criterionCode });
    }

    const editable = getScopeEditableState(store.getState(), scope);
    if (!editable) return;

    event.preventDefault();
    const files = Array.from(clipboard.files);

    const draftState = ensureDraftState(draftsByKey, scope.key);
    draftState.files = files;
    draftState.queue = files.map((file) => createQueueEntry({ name: file.name, status: 'queued' }));
    draftState.message = `${files.length} ${files.length === 1 ? 'file pasted and staged' : 'files pasted and staged'}.`;

    if (!hasMeaningfulText(draftState.evidenceType)) {
      draftState.evidenceType = 'screenshot';
    }

    if (!hasMeaningfulText(draftState.note)) {
      draftState.note = 'Pasted from clipboard';
    }

    const evidenceBlock = block.matches(EVIDENCE_BLOCK_SELECTOR)
      ? block
      : block.querySelector(EVIDENCE_BLOCK_SELECTOR);
    if (evidenceBlock) {
      syncBlock(evidenceBlock);
    }
  };

  const handleDragOver = (event) => {
    const block =
      event.target instanceof HTMLElement ? event.target.closest(EVIDENCE_BLOCK_SELECTOR) : null;
    if (!block) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    block.classList.add('is-drag-active');
  };

  const handleDragLeave = (event) => {
    const block =
      event.target instanceof HTMLElement ? event.target.closest(EVIDENCE_BLOCK_SELECTOR) : null;
    if (!block) return;
    if (block.contains(event.relatedTarget)) return;
    block.classList.remove('is-drag-active');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const block =
      event.target instanceof HTMLElement ? event.target.closest(EVIDENCE_BLOCK_SELECTOR) : null;
    if (!block) return;
    block.classList.remove('is-drag-active');

    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;

    const scope = resolveScopeFromElement(block);
    const editable = getScopeEditableState(store.getState(), scope);
    if (!editable) return;

    const draftState = ensureDraftState(draftsByKey, scope.key);
    draftState.files = files;
    draftState.queue = files.map((file) => createQueueEntry({ name: file.name, status: 'queued' }));
    draftState.message = `${files.length} ${files.length === 1 ? 'file dropped and staged' : 'files dropped and staged'}.`;

    if (!hasMeaningfulText(draftState.evidenceType)) {
      draftState.evidenceType = inferDraftEvidenceType(files);
    }

    if (!hasMeaningfulText(draftState.note)) {
      draftState.note = files.length === 1 ? files[0].name : `${files.length} dropped files`;
    }

    syncBlock(block);
  };

  questionnaireRoot.addEventListener('input', handleInput);
  questionnaireRoot.addEventListener('change', handleChange);
  documentRef.addEventListener('click', handleClick);
  documentRef.addEventListener('paste', handlePaste);
  documentRef.addEventListener('dragover', handleDragOver);
  documentRef.addEventListener('dragleave', handleDragLeave);
  documentRef.addEventListener('drop', handleDrop);
  documentRef.addEventListener(TEST_RUN_SYNC_EVENT, handleTestRunSync);

  cleanup.push(() => {
    destroyed = true;
    questionnaireRoot.removeEventListener('input', handleInput);
    questionnaireRoot.removeEventListener('change', handleChange);
    documentRef.removeEventListener('click', handleClick);
    documentRef.removeEventListener('paste', handlePaste);
    documentRef.removeEventListener('dragover', handleDragOver);
    documentRef.removeEventListener('dragleave', handleDragLeave);
    documentRef.removeEventListener('drop', handleDrop);
    documentRef.removeEventListener(TEST_RUN_SYNC_EVENT, handleTestRunSync);
    ensureSurfaceManager({
      documentRef,
      statusRegion: documentRef.getElementById('reviewShellStatusLiveRegion'),
    }).unregisterSurface(LIGHTBOX_SURFACE_ID);
  });

  const unsubscribe = store.subscribe(
    (state) => {
      syncAllBlocks(state);
    },
    { immediate: true },
  );

  cleanup.push(unsubscribe);

  if (usesBackendEvidence) {
    queueMicrotask(() => {
      syncEvidenceProjectionFromServer().catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to load stored evidence.';
        draftsByKey.forEach((draftState) => {
          draftState.message = message;
        });
        syncAllBlocks(store.getState());
      });
    });
  }

  return {
    destroy() {
      closeEvidenceLightbox(documentRef);
      cleanup.splice(0).forEach((dispose) => {
        dispose();
      });
    },
  };
};
