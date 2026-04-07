import crypto from 'node:crypto';

const VALID_SOURCE_TYPES = new Set([
  'manual_upload',
  'drag_drop',
  'clipboard',
  'pasted_url',
  'extension_capture',
  'manifest_import',
]);

const VALID_ASSET_KINDS = new Set([
  'image',
  'document',
  'export',
  'url',
  'selection',
  'metadata_only',
]);

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const normalizeNonNegativeInteger = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const normalizeIsoTimestamp = (value) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const epochMs = Date.parse(normalized);
  return Number.isFinite(epochMs) ? new Date(epochMs).toISOString() : null;
};

export const sanitizeFilename = (value, fallback = 'evidence') => {
  const normalized = normalizeText(value) ?? fallback;
  const sanitized = normalized
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._()\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return (sanitized || fallback).slice(0, 255);
};

export const assetKindRequiresStoredBytes = (assetKind) =>
  assetKind === 'image' || assetKind === 'document' || assetKind === 'export';

const inferAssetKind = ({ assetKind, mimeType, sourceType } = {}) => {
  const normalizedAssetKind = normalizeText(assetKind)?.toLowerCase();

  if (normalizedAssetKind && VALID_ASSET_KINDS.has(normalizedAssetKind)) {
    return normalizedAssetKind;
  }

  const normalizedMimeType = normalizeText(mimeType)?.toLowerCase() ?? null;

  if (sourceType === 'pasted_url') {
    return 'url';
  }

  if (normalizedMimeType?.startsWith('image/')) {
    return 'image';
  }

  return 'document';
};

const createSignedToken = (payload, secret) => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
};

const verifySignedToken = (token, secret) => {
  if (typeof token !== 'string') {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split('.');

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.byteLength !== expectedBuffer.byteLength) {
    return null;
  }

  const isValid = crypto.timingSafeEqual(providedBuffer, expectedBuffer);

  if (!isValid) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
};

export const createUploadPolicy = ({ env, now = () => Date.now(), secret } = {}) => {
  const maxUploadBytes = Number.isInteger(env?.evidenceMaxUploadBytes) && env.evidenceMaxUploadBytes > 0
    ? env.evidenceMaxUploadBytes
    : 10 * 1024 * 1024;
  const ttlSeconds =
    Number.isInteger(env?.evidenceUploadTokenTtlSeconds) && env.evidenceUploadTokenTtlSeconds > 0
      ? env.evidenceUploadTokenTtlSeconds
      : 900;
  const signingSecret = secret ?? `${env?.sessionSecret ?? 'local-dev-secret'}:evidence-upload`;

  return Object.freeze({
    maxUploadBytes,
    ttlSeconds,
    initializeUpload({ evaluationId, actorUserId, upload = {} } = {}) {
      const sourceType = normalizeText(upload.sourceType)?.toLowerCase() ?? 'manual_upload';

      if (!VALID_SOURCE_TYPES.has(sourceType)) {
        throw new Error(`Unsupported sourceType: ${upload.sourceType ?? '<missing>'}.`);
      }

      const originalName = normalizeText(upload.originalName);
      const mimeType = normalizeText(upload.mimeType)?.toLowerCase() ?? null;
      const sizeBytes = normalizeNonNegativeInteger(upload.sizeBytes);
      const assetKind = inferAssetKind({
        assetKind: upload.assetKind,
        mimeType,
        sourceType,
      });

      if (assetKindRequiresStoredBytes(assetKind)) {
        if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
          throw new Error('A positive sizeBytes value is required for uploaded evidence bytes.');
        }

        if (sizeBytes > maxUploadBytes) {
          throw new Error(
            `The requested upload exceeds the maximum size of ${maxUploadBytes} bytes.`,
          );
        }

        if (!originalName) {
          throw new Error('An originalName value is required for uploaded evidence bytes.');
        }
      }

      if (Number.isInteger(sizeBytes) && sizeBytes > maxUploadBytes) {
        throw new Error(`The requested upload exceeds the maximum size of ${maxUploadBytes} bytes.`);
      }

      const uploadEnvelope = Object.freeze({
        uploadId: `upload-${crypto.randomUUID()}`,
        evaluationId: Number(evaluationId),
        actorUserId: Number(actorUserId),
        assetKind,
        sourceType,
        originalName,
        sanitizedName: sanitizeFilename(originalName ?? `${assetKind}-evidence`),
        mimeType,
        sizeBytes,
        contentHash: normalizeText(upload.contentHash)?.toLowerCase() ?? null,
        capturedAtClient: normalizeIsoTimestamp(upload.capturedAtClient),
        originUrl: normalizeText(upload.originUrl),
        originTitle: normalizeText(upload.originTitle),
        captureToolVersion: normalizeText(upload.captureToolVersion),
        browserName: normalizeText(upload.browserName),
        browserVersion: normalizeText(upload.browserVersion),
        pageLanguage: normalizeText(upload.pageLanguage),
        expiresAt: new Date(now() + ttlSeconds * 1000).toISOString(),
      });

      return Object.freeze({
        ...uploadEnvelope,
        uploadToken: createSignedToken(uploadEnvelope, signingSecret),
        maxUploadBytes,
      });
    },
    consumeUploadToken({ uploadToken, evaluationId, actorUserId } = {}) {
      const payload = verifySignedToken(uploadToken, signingSecret);

      if (!payload) {
        throw new Error('The upload token is invalid.');
      }

      if (Date.parse(payload.expiresAt) <= now()) {
        throw new Error('The upload token has expired.');
      }

      if (Number(payload.evaluationId) !== Number(evaluationId)) {
        throw new Error('The upload token does not belong to this review.');
      }

      if (Number(payload.actorUserId) !== Number(actorUserId)) {
        throw new Error('The upload token does not belong to the current actor.');
      }

      return Object.freeze(payload);
    },
  });
};
