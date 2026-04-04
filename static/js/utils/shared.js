export const toArray = (value) => Array.from(value ?? []);

export const getDocumentRef = (root) => root?.ownerDocument ?? root ?? document;

export const clearChildren = (element) => {
  while (element?.firstChild) element.removeChild(element.firstChild);
};

export const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const freezeArray = (items) => Object.freeze([...items]);

export const EMPTY_ARRAY = Object.freeze([]);

export const EMPTY_OBJECT = Object.freeze({});

export const inferMimeTypeFromName = (name) => {
  const normalizedName = normalizeTextValue(name);

  if (!normalizedName || !normalizedName.includes('.')) {
    return null;
  }

  const extension = normalizedName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'pdf':
      return 'application/pdf';
    case 'json':
      return 'application/json';
    case 'csv':
      return 'text/csv';
    case 'txt':
      return 'text/plain';
    case 'md':
      return 'text/markdown';
    case 'html':
      return 'text/html';
    default:
      return null;
  }
};

export const extractEvidenceItems = (value) => {
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

export const normalizeTextValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const nextValue = String(value).trim();
  return nextValue === '' ? null : nextValue;
};

export const normalizeDelimitedList = (value, splitter = /[\n,]+/) => {
  const values = Array.isArray(value)
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
      values
        .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry).trim()))
        .filter(Boolean),
    ),
  ];
};

export const isImageMimeType = (mimeType) =>
  typeof mimeType === 'string' && mimeType.startsWith('image/');

export const joinTokens = (items) => items.filter(Boolean).join(' \u00b7 ');

export const setAccentKey = (element, accentKey) => {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  if (accentKey) {
    element.dataset.accentKey = accentKey;
    return;
  }

  delete element.dataset.accentKey;
};

export const createInfoRow = (documentRef, label, value, extraClassName = '') => {
  const wrapper = documentRef.createElement('div');
  const dt = documentRef.createElement('dt');
  const dd = documentRef.createElement('dd');

  wrapper.className = `context-route-row${extraClassName ? ` ${extraClassName}` : ''}`;
  dt.textContent = label;
  dd.textContent = value;

  wrapper.append(dt, dd);
  return wrapper;
};

export const getCompletionGroupLabel = (completionGroupId, completionGroups = []) =>
  completionGroups.find((group) => group.id === completionGroupId)?.label ?? completionGroupId;

const PROGRESS_STATE_LABELS = Object.freeze({
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
  invalid_attention: 'Needs attention',
  skipped: 'Skipped',
  blocked_escalated: 'Blocked / escalated',
});

export const formatProgressStateLabel = (value, fallback = 'Not started') =>
  PROGRESS_STATE_LABELS[value] ?? fallback;

export const formatSectionProgressCompact = (sectionProgress) => {
  if (!sectionProgress) {
    return 'Awaiting input';
  }

  if (sectionProgress.canonicalState === 'skipped') {
    return sectionProgress.skippedByWorkflow ? 'Workflow skip' : 'Skip satisfied';
  }

  if (sectionProgress.applicableRequiredFieldCount > 0) {
    return `${sectionProgress.satisfiedRequiredFieldCount}/${sectionProgress.applicableRequiredFieldCount} req`;
  }

  if (sectionProgress.criterionCount > 0) {
    return `${sectionProgress.resolvedCriterionCount}/${sectionProgress.criterionCount} crit`;
  }

  return sectionProgress.hasAnyActivity ? 'No active req' : 'Awaiting input';
};

export const createSourceList = (documentRef, sourceRefs) => {
  const block = documentRef.createElement('div');
  const label = documentRef.createElement('p');
  const list = documentRef.createElement('ul');

  block.className = 'context-source-block';
  label.className = 'context-block-label';
  label.textContent = 'Source refs';
  list.className = 'context-source-list';

  sourceRefs.forEach((sourceRef) => {
    const item = documentRef.createElement('li');
    item.className = 'context-source-item';
    item.textContent = sourceRef;
    list.appendChild(item);
  });

  block.append(label, list);
  return block;
};
