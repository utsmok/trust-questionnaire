import { createDbClient } from '../db/client.js';

const cloneValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  }

  return value;
};

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const normalizeInteger = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isInteger(numeric) ? numeric : null;
};

const normalizeScopes = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((entry) => normalizeText(entry)).filter(Boolean))];
};

const normalizePairingArtifactRecord = (record) => ({
  pairingId: record.pairing_id ?? record.pairingId,
  userId: Number(record.user_id ?? record.userId),
  label: normalizeText(record.label),
  pairingCodeHash: normalizeText(record.pairing_code_hash ?? record.pairingCodeHash),
  scopes: normalizeScopes(record.scopes_json ?? record.scopes),
  createdAt: record.created_at ?? record.createdAt ?? null,
  expiresAt: record.expires_at ?? record.expiresAt ?? null,
  consumedAt: record.consumed_at ?? record.consumedAt ?? null,
  consumedBySessionId: normalizeText(record.consumed_by_session_id ?? record.consumedBySessionId),
  revokedAt: record.revoked_at ?? record.revokedAt ?? null,
});

const normalizeExtensionSessionRecord = (record) => ({
  sessionId: record.session_id ?? record.sessionId,
  userId: Number(record.user_id ?? record.userId),
  pairingId: normalizeText(record.pairing_id ?? record.pairingId),
  clientName: normalizeText(record.client_name ?? record.clientName),
  browserName: normalizeText(record.browser_name ?? record.browserName),
  browserVersion: normalizeText(record.browser_version ?? record.browserVersion),
  extensionVersion: normalizeText(record.extension_version ?? record.extensionVersion),
  scopes: normalizeScopes(record.scopes_json ?? record.scopes),
  pairedAt: record.paired_at ?? record.pairedAt ?? null,
  lastSeenAt: record.last_seen_at ?? record.lastSeenAt ?? null,
  lastRefreshedAt: record.last_refreshed_at ?? record.lastRefreshedAt ?? null,
  accessExpiresAt: record.access_expires_at ?? record.accessExpiresAt ?? null,
  refreshExpiresAt: record.refresh_expires_at ?? record.refreshExpiresAt ?? null,
  refreshTokenHash: normalizeText(record.refresh_token_hash ?? record.refreshTokenHash),
  revokedAt: record.revoked_at ?? record.revokedAt ?? null,
  revokedByUserId: normalizeInteger(record.revoked_by_user_id ?? record.revokedByUserId),
  revokeReason: normalizeText(record.revoke_reason ?? record.revokeReason) ?? '',
});

const sortSessions = (left, right) =>
  String(right.pairedAt).localeCompare(String(left.pairedAt)) ||
  String(right.sessionId).localeCompare(String(left.sessionId));

const createInMemoryExtensionSessionsRepository = () => {
  const pairingsById = new Map();
  const sessionsById = new Map();

  return {
    async createPairingArtifact(pairing) {
      const normalized = normalizePairingArtifactRecord(pairing);
      const created = {
        ...normalized,
        createdAt: normalized.createdAt ?? new Date().toISOString(),
        revokedAt: normalized.revokedAt ?? null,
        consumedAt: normalized.consumedAt ?? null,
        consumedBySessionId: normalized.consumedBySessionId ?? null,
      };

      pairingsById.set(created.pairingId, created);
      return cloneValue(created);
    },
    async cancelPendingPairingsForUser(userId, { revokedAt } = {}) {
      const nextRevokedAt = revokedAt ?? new Date().toISOString();
      let revokedCount = 0;

      [...pairingsById.values()].forEach((pairing) => {
        if (
          pairing.userId === Number(userId) &&
          !pairing.consumedAt &&
          !pairing.revokedAt
        ) {
          pairingsById.set(pairing.pairingId, {
            ...pairing,
            revokedAt: nextRevokedAt,
          });
          revokedCount += 1;
        }
      });

      return revokedCount;
    },
    async findActivePairingByCodeHash(pairingCodeHash) {
      const found = [...pairingsById.values()].find(
        (pairing) => pairing.pairingCodeHash === pairingCodeHash && !pairing.consumedAt && !pairing.revokedAt,
      );

      return found ? cloneValue(found) : null;
    },
    async consumePairingArtifact(pairingId, { consumedAt, consumedBySessionId } = {}) {
      const existing = pairingsById.get(String(pairingId)) ?? null;

      if (!existing || existing.consumedAt || existing.revokedAt) {
        return null;
      }

      const updated = {
        ...existing,
        consumedAt: consumedAt ?? new Date().toISOString(),
        consumedBySessionId: normalizeText(consumedBySessionId),
      };

      pairingsById.set(updated.pairingId, updated);
      return cloneValue(updated);
    },
    async createSession(session) {
      const normalized = normalizeExtensionSessionRecord(session);
      const created = {
        ...normalized,
        pairedAt: normalized.pairedAt ?? new Date().toISOString(),
        revokedAt: normalized.revokedAt ?? null,
        revokedByUserId: normalized.revokedByUserId ?? null,
        revokeReason: normalized.revokeReason ?? '',
      };

      sessionsById.set(created.sessionId, created);
      return cloneValue(created);
    },
    async getById(sessionId) {
      const session = sessionsById.get(String(sessionId)) ?? null;
      return session ? cloneValue(session) : null;
    },
    async listByUserId(userId, { includeRevoked = false } = {}) {
      return [...sessionsById.values()]
        .filter((session) => session.userId === Number(userId))
        .filter((session) => includeRevoked || !session.revokedAt)
        .sort(sortSessions)
        .map((session) => cloneValue(session));
    },
    async findActiveByRefreshTokenHash(refreshTokenHash) {
      const found = [...sessionsById.values()].find(
        (session) => session.refreshTokenHash === refreshTokenHash && !session.revokedAt,
      );

      return found ? cloneValue(found) : null;
    },
    async updateSession(sessionId, patch = {}) {
      const existing = sessionsById.get(String(sessionId)) ?? null;

      if (!existing) {
        return null;
      }

      const updated = normalizeExtensionSessionRecord({
        ...existing,
        ...patch,
        sessionId: existing.sessionId,
      });

      sessionsById.set(existing.sessionId, updated);
      return cloneValue(updated);
    },
    async revokeSession(sessionId, { revokedAt, revokedByUserId, revokeReason } = {}) {
      const existing = sessionsById.get(String(sessionId)) ?? null;

      if (!existing) {
        return null;
      }

      const updated = {
        ...existing,
        revokedAt: existing.revokedAt ?? revokedAt ?? new Date().toISOString(),
        revokedByUserId: existing.revokedByUserId ?? normalizeInteger(revokedByUserId),
        revokeReason: existing.revokeReason || normalizeText(revokeReason) || '',
      };

      sessionsById.set(existing.sessionId, updated);
      return cloneValue(updated);
    },
    async close() {},
  };
};

const createPostgresExtensionSessionsRepository = ({ env }) => {
  const withClient = async (callback, clientOverride) => {
    if (clientOverride) {
      return callback(clientOverride);
    }

    const client = createDbClient(env);
    await client.connect();

    try {
      return await callback(client);
    } finally {
      await client.end();
    }
  };

  return {
    async createPairingArtifact(pairing, { client } = {}) {
      const normalized = normalizePairingArtifactRecord(pairing);

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            INSERT INTO extension_pairing_artifacts (
              pairing_id,
              user_id,
              label,
              pairing_code_hash,
              scopes_json,
              created_at,
              expires_at,
              consumed_at,
              consumed_by_session_id,
              revoked_at
            )
            VALUES ($1, $2, $3, $4, $5::jsonb, COALESCE($6, NOW()), $7, $8, $9, $10)
            RETURNING *
          `,
          [
            normalized.pairingId,
            normalized.userId,
            normalized.label,
            normalized.pairingCodeHash,
            JSON.stringify(normalized.scopes),
            normalized.createdAt,
            normalized.expiresAt,
            normalized.consumedAt,
            normalized.consumedBySessionId,
            normalized.revokedAt,
          ],
        );

        return normalizePairingArtifactRecord(result.rows[0]);
      }, client);
    },
    async cancelPendingPairingsForUser(userId, { revokedAt } = {}, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            UPDATE extension_pairing_artifacts
            SET revoked_at = COALESCE(revoked_at, $2)
            WHERE user_id = $1
              AND consumed_at IS NULL
              AND revoked_at IS NULL
          `,
          [Number(userId), revokedAt ?? new Date().toISOString()],
        );

        return result.rowCount;
      }, client);
    },
    async findActivePairingByCodeHash(pairingCodeHash, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            SELECT *
            FROM extension_pairing_artifacts
            WHERE pairing_code_hash = $1
              AND consumed_at IS NULL
              AND revoked_at IS NULL
            LIMIT 1
          `,
          [pairingCodeHash],
        );

        return result.rows[0] ? normalizePairingArtifactRecord(result.rows[0]) : null;
      }, client);
    },
    async consumePairingArtifact(pairingId, { consumedAt, consumedBySessionId } = {}, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            UPDATE extension_pairing_artifacts
            SET consumed_at = COALESCE(consumed_at, $2),
                consumed_by_session_id = COALESCE(consumed_by_session_id, $3)
            WHERE pairing_id = $1
              AND consumed_at IS NULL
              AND revoked_at IS NULL
            RETURNING *
          `,
          [String(pairingId), consumedAt ?? new Date().toISOString(), consumedBySessionId ?? null],
        );

        return result.rows[0] ? normalizePairingArtifactRecord(result.rows[0]) : null;
      }, client);
    },
    async createSession(session, { client } = {}) {
      const normalized = normalizeExtensionSessionRecord(session);

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            INSERT INTO extension_sessions (
              session_id,
              user_id,
              pairing_id,
              client_name,
              browser_name,
              browser_version,
              extension_version,
              scopes_json,
              paired_at,
              last_seen_at,
              last_refreshed_at,
              access_expires_at,
              refresh_expires_at,
              refresh_token_hash,
              revoked_at,
              revoked_by_user_id,
              revoke_reason
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, COALESCE($9, NOW()), $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
          `,
          [
            normalized.sessionId,
            normalized.userId,
            normalized.pairingId,
            normalized.clientName,
            normalized.browserName,
            normalized.browserVersion,
            normalized.extensionVersion,
            JSON.stringify(normalized.scopes),
            normalized.pairedAt,
            normalized.lastSeenAt,
            normalized.lastRefreshedAt,
            normalized.accessExpiresAt,
            normalized.refreshExpiresAt,
            normalized.refreshTokenHash,
            normalized.revokedAt,
            normalized.revokedByUserId,
            normalized.revokeReason,
          ],
        );

        return normalizeExtensionSessionRecord(result.rows[0]);
      }, client);
    },
    async getById(sessionId, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            SELECT *
            FROM extension_sessions
            WHERE session_id = $1
            LIMIT 1
          `,
          [String(sessionId)],
        );

        return result.rows[0] ? normalizeExtensionSessionRecord(result.rows[0]) : null;
      }, client);
    },
    async listByUserId(userId, { includeRevoked = false } = {}, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            SELECT *
            FROM extension_sessions
            WHERE user_id = $1
              ${includeRevoked ? '' : 'AND revoked_at IS NULL'}
            ORDER BY paired_at DESC, session_id DESC
          `,
          [Number(userId)],
        );

        return result.rows.map((row) => normalizeExtensionSessionRecord(row));
      }, client);
    },
    async findActiveByRefreshTokenHash(refreshTokenHash, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            SELECT *
            FROM extension_sessions
            WHERE refresh_token_hash = $1
              AND revoked_at IS NULL
            LIMIT 1
          `,
          [refreshTokenHash],
        );

        return result.rows[0] ? normalizeExtensionSessionRecord(result.rows[0]) : null;
      }, client);
    },
    async updateSession(sessionId, patch = {}, { client } = {}) {
      return withClient(async (dbClient) => {
        const existing = await this.getById(sessionId, { client: dbClient });

        if (!existing) {
          return null;
        }

        const merged = normalizeExtensionSessionRecord({
          ...existing,
          ...patch,
          sessionId: existing.sessionId,
        });

        const result = await dbClient.query(
          `
            UPDATE extension_sessions
            SET pairing_id = $2,
                client_name = $3,
                browser_name = $4,
                browser_version = $5,
                extension_version = $6,
                scopes_json = $7::jsonb,
                paired_at = $8,
                last_seen_at = $9,
                last_refreshed_at = $10,
                access_expires_at = $11,
                refresh_expires_at = $12,
                refresh_token_hash = $13,
                revoked_at = $14,
                revoked_by_user_id = $15,
                revoke_reason = $16
            WHERE session_id = $1
            RETURNING *
          `,
          [
            existing.sessionId,
            merged.pairingId,
            merged.clientName,
            merged.browserName,
            merged.browserVersion,
            merged.extensionVersion,
            JSON.stringify(merged.scopes),
            merged.pairedAt,
            merged.lastSeenAt,
            merged.lastRefreshedAt,
            merged.accessExpiresAt,
            merged.refreshExpiresAt,
            merged.refreshTokenHash,
            merged.revokedAt,
            merged.revokedByUserId,
            merged.revokeReason,
          ],
        );

        return normalizeExtensionSessionRecord(result.rows[0]);
      }, client);
    },
    async revokeSession(sessionId, { revokedAt, revokedByUserId, revokeReason } = {}, { client } = {}) {
      return this.updateSession(
        sessionId,
        {
          revokedAt: revokedAt ?? new Date().toISOString(),
          revokedByUserId: normalizeInteger(revokedByUserId),
          revokeReason: normalizeText(revokeReason) ?? '',
        },
        { client },
      );
    },
    async close() {},
  };
};

export const createExtensionSessionsRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresExtensionSessionsRepository({ env })
    : createInMemoryExtensionSessionsRepository();
