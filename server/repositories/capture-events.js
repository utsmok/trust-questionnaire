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

const normalizeCaptureEventRecord = (record) => ({
  captureId: record.capture_id ?? record.captureId,
  extensionSessionId: record.extension_session_id ?? record.extensionSessionId,
  userId: Number(record.user_id ?? record.userId),
  evaluationId: Number(record.evaluation_id ?? record.evaluationId),
  scopeType: record.scope_type ?? record.scopeType,
  sectionId: normalizeText(record.section_id ?? record.sectionId),
  criterionCode: normalizeText(record.criterion_code ?? record.criterionCode),
  evidenceType: normalizeText(record.evidence_type ?? record.evidenceType),
  note: record.note ?? '',
  assetKind: record.asset_kind ?? record.assetKind,
  sourceType: record.source_type ?? record.sourceType,
  originalName: normalizeText(record.original_name ?? record.originalName),
  mimeType: normalizeText(record.mime_type ?? record.mimeType),
  sizeBytes: normalizeInteger(record.size_bytes ?? record.sizeBytes),
  contentHash: normalizeText(record.content_hash ?? record.contentHash),
  capturedAtClient: record.captured_at_client ?? record.capturedAtClient ?? null,
  originUrl: normalizeText(record.origin_url ?? record.originUrl),
  originTitle: normalizeText(record.origin_title ?? record.originTitle),
  selectionText: normalizeText(record.selection_text ?? record.selectionText),
  browserName: normalizeText(record.browser_name ?? record.browserName),
  browserVersion: normalizeText(record.browser_version ?? record.browserVersion),
  extensionVersion: normalizeText(record.extension_version ?? record.extensionVersion),
  pageLanguage: normalizeText(record.page_language ?? record.pageLanguage),
  uploadToken: normalizeText(record.upload_token ?? record.uploadToken),
  uploadExpiresAt: record.upload_expires_at ?? record.uploadExpiresAt ?? null,
  status: record.status ?? 'initialized',
  assetId: normalizeText(record.asset_id ?? record.assetId),
  linkId: normalizeText(record.link_id ?? record.linkId),
  createdAt: record.created_at ?? record.createdAt ?? null,
  uploadedAt: record.uploaded_at ?? record.uploadedAt ?? null,
  finalizedAt: record.finalized_at ?? record.finalizedAt ?? null,
  revokedAt: record.revoked_at ?? record.revokedAt ?? null,
});

const createInMemoryCaptureEventsRepository = () => {
  const capturesById = new Map();

  return {
    async create(capture) {
      const normalized = normalizeCaptureEventRecord(capture);
      const created = {
        ...normalized,
        createdAt: normalized.createdAt ?? new Date().toISOString(),
        uploadedAt: normalized.uploadedAt ?? null,
        finalizedAt: normalized.finalizedAt ?? null,
        revokedAt: normalized.revokedAt ?? null,
      };

      capturesById.set(created.captureId, created);
      return cloneValue(created);
    },
    async getById(captureId) {
      const capture = capturesById.get(String(captureId)) ?? null;
      return capture ? cloneValue(capture) : null;
    },
    async listByEvaluationId(evaluationId) {
      return [...capturesById.values()]
        .filter((capture) => capture.evaluationId === Number(evaluationId))
        .slice()
        .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)))
        .map((capture) => cloneValue(capture));
    },
    async update(captureId, patch = {}) {
      const existing = capturesById.get(String(captureId)) ?? null;

      if (!existing) {
        return null;
      }

      const updated = normalizeCaptureEventRecord({
        ...existing,
        ...patch,
        captureId: existing.captureId,
      });

      capturesById.set(existing.captureId, updated);
      return cloneValue(updated);
    },
    async close() {},
  };
};

const createPostgresCaptureEventsRepository = ({ env }) => {
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
    async create(capture, { client } = {}) {
      const normalized = normalizeCaptureEventRecord(capture);

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            INSERT INTO capture_events (
              capture_id,
              extension_session_id,
              user_id,
              evaluation_id,
              scope_type,
              section_id,
              criterion_code,
              evidence_type,
              note,
              asset_kind,
              source_type,
              original_name,
              mime_type,
              size_bytes,
              content_hash,
              captured_at_client,
              origin_url,
              origin_title,
              selection_text,
              browser_name,
              browser_version,
              extension_version,
              page_language,
              upload_token,
              upload_expires_at,
              status,
              asset_id,
              link_id,
              created_at,
              uploaded_at,
              finalized_at,
              revoked_at
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
              $12, $13, $14, $15, $16, $17, $18, $19, $20,
              $21, $22, $23, $24, $25, $26, $27, $28, COALESCE($29, NOW()),
              $30, $31, $32
            )
            RETURNING *
          `,
          [
            normalized.captureId,
            normalized.extensionSessionId,
            normalized.userId,
            normalized.evaluationId,
            normalized.scopeType,
            normalized.sectionId,
            normalized.criterionCode,
            normalized.evidenceType,
            normalized.note,
            normalized.assetKind,
            normalized.sourceType,
            normalized.originalName,
            normalized.mimeType,
            normalized.sizeBytes,
            normalized.contentHash,
            normalized.capturedAtClient,
            normalized.originUrl,
            normalized.originTitle,
            normalized.selectionText,
            normalized.browserName,
            normalized.browserVersion,
            normalized.extensionVersion,
            normalized.pageLanguage,
            normalized.uploadToken,
            normalized.uploadExpiresAt,
            normalized.status,
            normalized.assetId,
            normalized.linkId,
            normalized.createdAt,
            normalized.uploadedAt,
            normalized.finalizedAt,
            normalized.revokedAt,
          ],
        );

        return normalizeCaptureEventRecord(result.rows[0]);
      }, client);
    },
    async getById(captureId, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            SELECT *
            FROM capture_events
            WHERE capture_id = $1
            LIMIT 1
          `,
          [String(captureId)],
        );

        return result.rows[0] ? normalizeCaptureEventRecord(result.rows[0]) : null;
      }, client);
    },
    async listByEvaluationId(evaluationId, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            SELECT *
            FROM capture_events
            WHERE evaluation_id = $1
            ORDER BY created_at ASC, capture_id ASC
          `,
          [Number(evaluationId)],
        );

        return result.rows.map((row) => normalizeCaptureEventRecord(row));
      }, client);
    },
    async update(captureId, patch = {}, { client } = {}) {
      return withClient(async (dbClient) => {
        const existing = await this.getById(captureId, { client: dbClient });

        if (!existing) {
          return null;
        }

        const merged = normalizeCaptureEventRecord({
          ...existing,
          ...patch,
          captureId: existing.captureId,
        });

        const result = await dbClient.query(
          `
            UPDATE capture_events
            SET extension_session_id = $2,
                user_id = $3,
                evaluation_id = $4,
                scope_type = $5,
                section_id = $6,
                criterion_code = $7,
                evidence_type = $8,
                note = $9,
                asset_kind = $10,
                source_type = $11,
                original_name = $12,
                mime_type = $13,
                size_bytes = $14,
                content_hash = $15,
                captured_at_client = $16,
                origin_url = $17,
                origin_title = $18,
                selection_text = $19,
                browser_name = $20,
                browser_version = $21,
                extension_version = $22,
                page_language = $23,
                upload_token = $24,
                upload_expires_at = $25,
                status = $26,
                asset_id = $27,
                link_id = $28,
                created_at = $29,
                uploaded_at = $30,
                finalized_at = $31,
                revoked_at = $32
            WHERE capture_id = $1
            RETURNING *
          `,
          [
            existing.captureId,
            merged.extensionSessionId,
            merged.userId,
            merged.evaluationId,
            merged.scopeType,
            merged.sectionId,
            merged.criterionCode,
            merged.evidenceType,
            merged.note,
            merged.assetKind,
            merged.sourceType,
            merged.originalName,
            merged.mimeType,
            merged.sizeBytes,
            merged.contentHash,
            merged.capturedAtClient,
            merged.originUrl,
            merged.originTitle,
            merged.selectionText,
            merged.browserName,
            merged.browserVersion,
            merged.extensionVersion,
            merged.pageLanguage,
            merged.uploadToken,
            merged.uploadExpiresAt,
            merged.status,
            merged.assetId,
            merged.linkId,
            merged.createdAt,
            merged.uploadedAt,
            merged.finalizedAt,
            merged.revokedAt,
          ],
        );

        return normalizeCaptureEventRecord(result.rows[0]);
      }, client);
    },
    async close() {},
  };
};

export const createCaptureEventsRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresCaptureEventsRepository({ env })
    : createInMemoryCaptureEventsRepository();
