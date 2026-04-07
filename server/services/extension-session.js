import crypto from 'node:crypto';

export const EXTENSION_SESSION_SCOPES = Object.freeze([
  'review:read',
  'review:evidence:write',
]);

const PAIRING_TTL_MS = 10 * 60 * 1000;
const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const createServiceError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const isExtensionSessionError = (error) => Number.isInteger(error?.statusCode);

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const createOpaqueToken = (prefix) => `${prefix}_${crypto.randomBytes(24).toString('base64url')}`;

const hashOpaqueToken = (value) =>
  crypto.createHash('sha256').update(String(value)).digest('hex');

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

  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
};

const normalizeScopes = (value) => {
  if (!Array.isArray(value)) {
    return [...EXTENSION_SESSION_SCOPES];
  }

  return [...new Set(value.map((entry) => normalizeText(entry)).filter(Boolean))];
};

const requireOpaqueToken = (value, fieldName) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    throw createServiceError(400, `${fieldName} is required.`);
  }

  return normalized;
};

const requireUnexpired = (timestamp, message, nowMs) => {
  const expiresAtMs = Date.parse(timestamp ?? '');

  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) {
    throw createServiceError(401, message);
  }
};

const buildAccessTokenPayload = ({ session, expiresAt }) => ({
  type: 'extension_access',
  sessionId: session.sessionId,
  userId: session.userId,
  scopes: normalizeScopes(session.scopes),
  expiresAt,
});

export const createExtensionSessionService = ({
  extensionSessionsRepository,
  now = () => Date.now(),
  secret = 'local-dev-extension-secret',
} = {}) => {
  const signingSecret = `${secret}:extension-access-token`;

  const issueTokenBundle = async (session) => {
    const nowMs = now();
    const accessExpiresAt = new Date(nowMs + ACCESS_TTL_MS).toISOString();
    const refreshExpiresAt = new Date(nowMs + REFRESH_TTL_MS).toISOString();
    const refreshToken = createOpaqueToken('refresh');
    const refreshTokenHash = hashOpaqueToken(refreshToken);

    const persistedSession = await extensionSessionsRepository.updateSession(session.sessionId, {
      accessExpiresAt,
      refreshExpiresAt,
      refreshTokenHash,
      lastSeenAt: new Date(nowMs).toISOString(),
      lastRefreshedAt: new Date(nowMs).toISOString(),
    });

    return {
      session: persistedSession,
      accessToken: createSignedToken(
        buildAccessTokenPayload({ session: persistedSession, expiresAt: accessExpiresAt }),
        signingSecret,
      ),
      accessExpiresAt,
      refreshToken,
      refreshExpiresAt,
    };
  };

  const assertSessionActive = (session, nowMs) => {
    if (!session || session.revokedAt) {
      throw createServiceError(401, 'The extension session is not active.');
    }

    requireUnexpired(
      session.refreshExpiresAt,
      'The extension session has expired and must be paired again.',
      nowMs,
    );
  };

  return Object.freeze({
    pairingTtlSeconds: Math.floor(PAIRING_TTL_MS / 1000),
    accessTtlSeconds: Math.floor(ACCESS_TTL_MS / 1000),
    refreshTtlSeconds: Math.floor(REFRESH_TTL_MS / 1000),
    async startPairing({ userId, label = null } = {}) {
      const numericUserId = Number(userId);

      if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
        throw createServiceError(400, 'A valid user id is required to start pairing.');
      }

      await extensionSessionsRepository.cancelPendingPairingsForUser(numericUserId, {
        revokedAt: new Date(now()).toISOString(),
      });

      const pairingCode = createOpaqueToken('pair');
      const createdAt = new Date(now()).toISOString();
      const expiresAt = new Date(now() + PAIRING_TTL_MS).toISOString();
      const pairingId = `pairing-${crypto.randomUUID()}`;

      await extensionSessionsRepository.createPairingArtifact({
        pairingId,
        userId: numericUserId,
        label: normalizeText(label),
        pairingCodeHash: hashOpaqueToken(pairingCode),
        scopes: [...EXTENSION_SESSION_SCOPES],
        createdAt,
        expiresAt,
        consumedAt: null,
        consumedBySessionId: null,
        revokedAt: null,
      });

      return Object.freeze({
        pairingId,
        pairingCode,
        label: normalizeText(label),
        scopes: [...EXTENSION_SESSION_SCOPES],
        createdAt,
        expiresAt,
      });
    },

    async exchangePairing({ pairingCode, clientName, browserName, browserVersion, extensionVersion } = {}) {
      const normalizedPairingCode = requireOpaqueToken(pairingCode, 'pairingCode');
      const pairing = await extensionSessionsRepository.findActivePairingByCodeHash(
        hashOpaqueToken(normalizedPairingCode),
      );

      if (!pairing) {
        throw createServiceError(401, 'The pairing code is invalid or has already been used.');
      }

      requireUnexpired(
        pairing.expiresAt,
        'The pairing code has expired. Generate a new pairing code from the main application.',
        now(),
      );

      const sessionId = `extsess-${crypto.randomUUID()}`;
      const pairedAt = new Date(now()).toISOString();
      const refreshToken = createOpaqueToken('refresh');
      const refreshTokenHash = hashOpaqueToken(refreshToken);
      const accessExpiresAt = new Date(now() + ACCESS_TTL_MS).toISOString();
      const refreshExpiresAt = new Date(now() + REFRESH_TTL_MS).toISOString();

      const consumed = await extensionSessionsRepository.consumePairingArtifact(pairing.pairingId, {
        consumedAt: pairedAt,
        consumedBySessionId: sessionId,
      });

      if (!consumed) {
        throw createServiceError(409, 'The pairing code is no longer available.');
      }

      const session = await extensionSessionsRepository.createSession({
        sessionId,
        userId: pairing.userId,
        pairingId: pairing.pairingId,
        clientName: normalizeText(clientName) ?? 'Browser capture client',
        browserName: normalizeText(browserName),
        browserVersion: normalizeText(browserVersion),
        extensionVersion: normalizeText(extensionVersion),
        scopes: pairing.scopes,
        pairedAt,
        lastSeenAt: pairedAt,
        lastRefreshedAt: pairedAt,
        accessExpiresAt,
        refreshExpiresAt,
        refreshTokenHash,
        revokedAt: null,
        revokedByUserId: null,
        revokeReason: '',
      });

      return {
        session,
        accessToken: createSignedToken(
          buildAccessTokenPayload({ session, expiresAt: accessExpiresAt }),
          signingSecret,
        ),
        accessExpiresAt,
        refreshToken,
        refreshExpiresAt,
      };
    },

    async authenticateAccessToken(accessToken) {
      const normalizedToken = requireOpaqueToken(accessToken, 'accessToken');
      const payload = verifySignedToken(normalizedToken, signingSecret);

      if (!payload || payload.type !== 'extension_access') {
        throw createServiceError(401, 'The extension access token is invalid.');
      }

      requireUnexpired(payload.expiresAt, 'The extension access token has expired.', now());

      const session = await extensionSessionsRepository.getById(payload.sessionId);
      assertSessionActive(session, now());

      if (Number(session.userId) !== Number(payload.userId)) {
        throw createServiceError(401, 'The extension access token no longer matches the paired session.');
      }

      return {
        session,
        token: {
          expiresAt: payload.expiresAt,
          scopes: normalizeScopes(payload.scopes),
        },
      };
    },

    async refreshSession({ refreshToken } = {}) {
      const normalizedRefreshToken = requireOpaqueToken(refreshToken, 'refreshToken');
      const session = await extensionSessionsRepository.findActiveByRefreshTokenHash(
        hashOpaqueToken(normalizedRefreshToken),
      );

      if (!session) {
        throw createServiceError(401, 'The refresh token is invalid.');
      }

      assertSessionActive(session, now());
      return issueTokenBundle(session);
    },

    async touchSession(sessionId) {
      const session = await extensionSessionsRepository.getById(sessionId);

      if (!session) {
        return null;
      }

      return extensionSessionsRepository.updateSession(sessionId, {
        lastSeenAt: new Date(now()).toISOString(),
      });
    },

    async listUserSessions(userId) {
      const sessions = await extensionSessionsRepository.listByUserId(userId);
      const nowMs = now();

      return sessions.filter((session) => {
        if (session.revokedAt) {
          return false;
        }

        const refreshExpiresAtMs = Date.parse(session.refreshExpiresAt ?? '');
        return Number.isFinite(refreshExpiresAtMs) && refreshExpiresAtMs > nowMs;
      });
    },

    async revokeSession({ sessionId, actorUserId = null, revokeReason = '' } = {}) {
      const normalizedSessionId = requireOpaqueToken(sessionId, 'sessionId');
      const session = await extensionSessionsRepository.getById(normalizedSessionId);

      if (!session) {
        throw createServiceError(404, 'Extension session not found.');
      }

      return extensionSessionsRepository.revokeSession(normalizedSessionId, {
        revokedAt: new Date(now()).toISOString(),
        revokedByUserId: actorUserId,
        revokeReason,
      });
    },

    async revokeCurrentSession({ accessToken, revokeReason = 'extension_session_closed' } = {}) {
      const principal = await this.authenticateAccessToken(accessToken);
      const revoked = await this.revokeSession({
        sessionId: principal.session.sessionId,
        actorUserId: principal.session.userId,
        revokeReason,
      });

      return {
        principal,
        session: revoked,
      };
    },
  });
};
