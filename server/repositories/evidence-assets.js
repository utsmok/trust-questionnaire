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
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeAssetRecord = (record) => ({
  assetId: record.asset_id ?? record.assetId,
  assetKind: record.asset_kind ?? record.assetKind,
  sourceType: record.source_type ?? record.sourceType,
  storageProvider: normalizeText(record.storage_provider ?? record.storageProvider),
  storageKey: normalizeText(record.storage_key ?? record.storageKey),
  contentHash: normalizeText(record.content_hash ?? record.contentHash),
  createdByUserId: Number(record.created_by_user_id ?? record.createdByUserId),
  createdAt: record.created_at ?? record.createdAt ?? null,
  deletedAt: record.deleted_at ?? record.deletedAt ?? null,
  originalName: normalizeText(record.original_name ?? record.originalName),
  sanitizedName: normalizeText(record.sanitized_name ?? record.sanitizedName),
  mimeType: normalizeText(record.mime_type ?? record.mimeType),
  sizeBytes: normalizeInteger(record.size_bytes ?? record.sizeBytes),
  imageWidth: normalizeInteger(record.image_width ?? record.imageWidth),
  imageHeight: normalizeInteger(record.image_height ?? record.imageHeight),
  previewStorageKey: normalizeText(record.preview_storage_key ?? record.previewStorageKey),
  capturedAtClient: record.captured_at_client ?? record.capturedAtClient ?? null,
  receivedAtServer: record.received_at_server ?? record.receivedAtServer ?? null,
  originUrl: normalizeText(record.origin_url ?? record.originUrl),
  originTitle: normalizeText(record.origin_title ?? record.originTitle),
  captureToolVersion: normalizeText(record.capture_tool_version ?? record.captureToolVersion),
  browserName: normalizeText(record.browser_name ?? record.browserName),
  browserVersion: normalizeText(record.browser_version ?? record.browserVersion),
  pageLanguage: normalizeText(record.page_language ?? record.pageLanguage),
  redactionStatus: normalizeText(record.redaction_status ?? record.redactionStatus),
  importSource: normalizeText(record.import_source ?? record.importSource),
});

const normalizeDownloadEventRecord = (record) => ({
  id: Number(record.id),
  evaluationId: Number(record.evaluation_id ?? record.evaluationId),
  assetId: record.asset_id ?? record.assetId,
  linkId: record.link_id ?? record.linkId ?? null,
  actorUserId: Number(record.actor_user_id ?? record.actorUserId),
  eventType: record.event_type ?? record.eventType,
  createdAt: record.created_at ?? record.createdAt ?? null,
});

const createInMemoryEvidenceAssetsRepository = () => {
  const assetsById = new Map();
  const downloadEvents = [];
  let nextDownloadEventId = 1;

  return {
    async create(asset) {
      const normalized = normalizeAssetRecord(asset);
      const created = {
        ...normalized,
        createdAt: normalized.createdAt ?? new Date().toISOString(),
        receivedAtServer: normalized.receivedAtServer ?? new Date().toISOString(),
      };

      assetsById.set(created.assetId, created);
      return cloneValue(created);
    },
    async getById(assetId) {
      const asset = assetsById.get(String(assetId)) ?? null;
      return asset ? cloneValue(asset) : null;
    },
    async getByIds(assetIds) {
      const normalizedIds = [...new Set((assetIds ?? []).map((assetId) => String(assetId)))];
      return normalizedIds
        .map((assetId) => assetsById.get(assetId) ?? null)
        .filter(Boolean)
        .map((asset) => cloneValue(asset));
    },
    async softDelete(assetId, { deletedAt } = {}) {
      const existing = assetsById.get(String(assetId)) ?? null;

      if (!existing) {
        return null;
      }

      const updated = {
        ...existing,
        deletedAt: deletedAt ?? new Date().toISOString(),
      };

      assetsById.set(updated.assetId, updated);
      return cloneValue(updated);
    },
    async appendDownloadEvent(event) {
      const normalized = normalizeDownloadEventRecord({
        id: nextDownloadEventId,
        ...event,
        created_at: event.createdAt ?? new Date().toISOString(),
      });

      downloadEvents.push(normalized);
      nextDownloadEventId += 1;
      return cloneValue(normalized);
    },
    async listDownloadEventsByAssetId(assetId) {
      return downloadEvents
        .filter((event) => event.assetId === String(assetId))
        .slice()
        .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)))
        .map((event) => cloneValue(event));
    },
    async close() {},
  };
};

const createPostgresEvidenceAssetsRepository = ({ env }) => {
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
    async create(asset, { client } = {}) {
      const normalized = normalizeAssetRecord(asset);

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            INSERT INTO evidence_assets (
              asset_id,
              asset_kind,
              source_type,
              storage_provider,
              storage_key,
              content_hash,
              created_by_user_id,
              original_name,
              sanitized_name,
              mime_type,
              size_bytes,
              image_width,
              image_height,
              preview_storage_key,
              captured_at_client,
              received_at_server,
              origin_url,
              origin_title,
              capture_tool_version,
              browser_name,
              browser_version,
              page_language,
              redaction_status,
              import_source
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7,
              $8, $9, $10, $11, $12, $13, $14,
              $15, COALESCE($16, NOW()), $17, $18, $19,
              $20, $21, $22, $23, $24
            )
            RETURNING *
          `,
          [
            normalized.assetId,
            normalized.assetKind,
            normalized.sourceType,
            normalized.storageProvider,
            normalized.storageKey,
            normalized.contentHash,
            normalized.createdByUserId,
            normalized.originalName,
            normalized.sanitizedName,
            normalized.mimeType,
            normalized.sizeBytes,
            normalized.imageWidth,
            normalized.imageHeight,
            normalized.previewStorageKey,
            normalized.capturedAtClient,
            normalized.receivedAtServer,
            normalized.originUrl,
            normalized.originTitle,
            normalized.captureToolVersion,
            normalized.browserName,
            normalized.browserVersion,
            normalized.pageLanguage,
            normalized.redactionStatus,
            normalized.importSource,
          ],
        );

        return normalizeAssetRecord(result.rows[0]);
      }, client);
    },
    async getById(assetId) {
      return withClient(async (client) => {
        const result = await client.query(
          `
            SELECT *
            FROM evidence_assets
            WHERE asset_id = $1
            LIMIT 1
          `,
          [String(assetId)],
        );

        return result.rows[0] ? normalizeAssetRecord(result.rows[0]) : null;
      });
    },
    async getByIds(assetIds) {
      const normalizedIds = [...new Set((assetIds ?? []).map((assetId) => String(assetId)))];

      if (normalizedIds.length === 0) {
        return [];
      }

      return withClient(async (client) => {
        const result = await client.query(
          `
            SELECT *
            FROM evidence_assets
            WHERE asset_id = ANY($1::text[])
          `,
          [normalizedIds],
        );

        const assetsById = new Map(
          result.rows.map((row) => {
            const normalized = normalizeAssetRecord(row);
            return [normalized.assetId, normalized];
          }),
        );

        return normalizedIds.map((assetId) => assetsById.get(assetId)).filter(Boolean);
      });
    },
    async softDelete(assetId, { deletedAt } = {}) {
      return withClient(async (client) => {
        const result = await client.query(
          `
            UPDATE evidence_assets
            SET deleted_at = COALESCE($2, NOW())
            WHERE asset_id = $1 AND deleted_at IS NULL
            RETURNING *
          `,
          [String(assetId), deletedAt ?? null],
        );

        return result.rows[0] ? normalizeAssetRecord(result.rows[0]) : null;
      });
    },
    async appendDownloadEvent(event, { client } = {}) {
      const normalized = normalizeDownloadEventRecord(event);

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            INSERT INTO evidence_download_events (
              evaluation_id,
              asset_id,
              link_id,
              actor_user_id,
              event_type
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `,
          [
            normalized.evaluationId,
            normalized.assetId,
            normalized.linkId,
            normalized.actorUserId,
            normalized.eventType,
          ],
        );

        return normalizeDownloadEventRecord(result.rows[0]);
      }, client);
    },
    async listDownloadEventsByAssetId(assetId) {
      return withClient(async (client) => {
        const result = await client.query(
          `
            SELECT *
            FROM evidence_download_events
            WHERE asset_id = $1
            ORDER BY created_at ASC, id ASC
          `,
          [String(assetId)],
        );

        return result.rows.map((row) => normalizeDownloadEventRecord(row));
      });
    },
    async close() {},
  };
};

export const createEvidenceAssetsRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresEvidenceAssetsRepository({ env })
    : createInMemoryEvidenceAssetsRepository();
