import { fileURLToPath } from 'node:url';

export const DEFAULT_HOST = '127.0.0.1';
export const DEFAULT_PORT = 4173;
export const DEFAULT_DATABASE_URL =
  'postgres://trust_questionnaire:trust_questionnaire@127.0.0.1:5432/trust_questionnaire';
export const DEFAULT_AUTH_MODE = 'dev';
export const DEFAULT_USER_STORAGE_DRIVER = 'memory';
export const DEFAULT_SESSION_SECRET = 'replace-me-local-dev-session-secret';
export const DEFAULT_OIDC_REDIRECT_PATH = '/auth/callback';
export const DEFAULT_EVIDENCE_STORAGE_DRIVER = 'fs';
export const DEFAULT_EVIDENCE_STORAGE_PATH = '.data/evidence';
export const DEFAULT_EVIDENCE_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const DEFAULT_EVIDENCE_UPLOAD_TOKEN_TTL_SECONDS = 900;

export const PROJECT_ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const STATIC_COMPATIBILITY_DOCUMENT = 'trust-framework.html';

const parsePort = (value) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeString = (value, fallback) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
};

const normalizeAuthMode = (value) => {
  const normalized = normalizeString(value, DEFAULT_AUTH_MODE).toLowerCase();
  return normalized === 'oidc' ? 'oidc' : DEFAULT_AUTH_MODE;
};

const normalizeStorageDriver = (value) => {
  const normalized = normalizeString(value, DEFAULT_USER_STORAGE_DRIVER).toLowerCase();
  return normalized === 'pg' ? 'pg' : DEFAULT_USER_STORAGE_DRIVER;
};

const normalizeEvidenceStorageDriver = (value) => {
  const normalized = normalizeString(value, DEFAULT_EVIDENCE_STORAGE_DRIVER).toLowerCase();
  return normalized === 'memory' ? 'memory' : DEFAULT_EVIDENCE_STORAGE_DRIVER;
};

export const loadRuntimeEnv = (overrides = {}) => {
  const source = {
    ...process.env,
    ...overrides,
  };

  const host = normalizeString(source.HOST, DEFAULT_HOST);
  const port = parsePort(source.PORT);
  const appOrigin = normalizeString(source.APP_ORIGIN, `http://${host}:${port}`);

  return Object.freeze({
    nodeEnv: normalizeString(source.NODE_ENV, 'development'),
    host,
    port,
    appOrigin,
    databaseUrl: normalizeString(source.DATABASE_URL, DEFAULT_DATABASE_URL),
    authMode: normalizeAuthMode(source.AUTH_MODE),
    userStorageDriver: normalizeStorageDriver(source.USER_STORAGE_DRIVER),
    sessionSecret: normalizeString(source.SESSION_SECRET, DEFAULT_SESSION_SECRET),
    oidcIssuerUrl: normalizeString(source.OIDC_ISSUER_URL, ''),
    oidcClientId: normalizeString(source.OIDC_CLIENT_ID, ''),
    oidcClientSecret: normalizeString(source.OIDC_CLIENT_SECRET, ''),
    oidcRedirectUri: normalizeString(
      source.OIDC_REDIRECT_URI,
      `${appOrigin}${DEFAULT_OIDC_REDIRECT_PATH}`,
    ),
    evidenceStorageDriver: normalizeEvidenceStorageDriver(source.EVIDENCE_STORAGE_DRIVER),
    evidenceStoragePath: normalizeString(source.EVIDENCE_STORAGE_PATH, DEFAULT_EVIDENCE_STORAGE_PATH),
    evidenceMaxUploadBytes: parsePositiveInteger(
      source.EVIDENCE_MAX_UPLOAD_BYTES,
      DEFAULT_EVIDENCE_MAX_UPLOAD_BYTES,
    ),
    evidenceUploadTokenTtlSeconds: parsePositiveInteger(
      source.EVIDENCE_UPLOAD_TOKEN_TTL_SECONDS,
      DEFAULT_EVIDENCE_UPLOAD_TOKEN_TTL_SECONDS,
    ),
    projectRoot: PROJECT_ROOT,
    staticCompatibilityDocument: STATIC_COMPATIBILITY_DOCUMENT,
  });
};
