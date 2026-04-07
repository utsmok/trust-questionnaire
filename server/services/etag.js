import crypto from 'node:crypto';

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const stableStringify = (value) => {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
};

const normalizeEntityTag = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  let normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.startsWith('W/')) {
    normalized = normalized.slice(2).trim();
  }

  if (normalized.startsWith('"') && normalized.endsWith('"')) {
    normalized = normalized.slice(1, -1);
  }

  return normalized || null;
};

export const createEtagToken = ({
  publicId,
  revisionNumber,
  workflowMode,
  lifecycleState,
  stateJson,
}) =>
  crypto
    .createHash('sha256')
    .update(
      stableStringify({
        publicId,
        revisionNumber,
        workflowMode,
        lifecycleState,
        stateJson,
      }),
    )
    .digest('base64url');

export const formatEtagHeader = (etagToken) => `"${etagToken}"`;

export const parseIfMatchHeader = (headerValue) => {
  if (typeof headerValue !== 'string' || !headerValue.trim()) {
    return [];
  }

  return headerValue
    .split(',')
    .map((value) => normalizeEntityTag(value))
    .filter(Boolean);
};

export const matchesIfMatchHeader = (etagToken, headerValue) => {
  const expected = normalizeEntityTag(etagToken);

  if (!expected) {
    return false;
  }

  const providedTags = parseIfMatchHeader(headerValue);
  return providedTags.includes('*') || providedTags.includes(expected);
};
