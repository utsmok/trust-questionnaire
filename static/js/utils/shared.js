export const toArray = (value) => Array.from(value ?? []);

export const getDocumentRef = (root) => root?.ownerDocument ?? root ?? document;

export const clearChildren = (element) => {
  while (element?.firstChild) element.removeChild(element.firstChild);
};

export const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const freezeArray = (items) => Object.freeze([...items]);

export const EMPTY_ARRAY = Object.freeze([]);

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

  return [...new Set(values
    .map((entry) => (typeof entry === 'string' ? entry.trim() : String(entry).trim()))
    .filter(Boolean))];
};

export const isImageMimeType = (mimeType) =>
  typeof mimeType === 'string' && mimeType.startsWith('image/');
