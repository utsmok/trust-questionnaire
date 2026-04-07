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

const normalizeAuditEventRecord = (record) => ({
  id: Number(record.id),
  evaluationId: Number(record.evaluation_id ?? record.evaluationId),
  actorUserId: normalizeInteger(record.actor_user_id ?? record.actorUserId),
  eventType: record.event_type ?? record.eventType,
  summary: record.summary ?? '',
  scopeType: normalizeText(record.scope_type ?? record.scopeType),
  sectionId: normalizeText(record.section_id ?? record.sectionId),
  criterionCode: normalizeText(record.criterion_code ?? record.criterionCode),
  relatedCommentId: normalizeInteger(record.related_comment_id ?? record.relatedCommentId),
  relatedAssetId: normalizeText(record.related_asset_id ?? record.relatedAssetId),
  relatedLinkId: normalizeText(record.related_link_id ?? record.relatedLinkId),
  relatedRevisionNumber: normalizeInteger(
    record.related_revision_number ?? record.relatedRevisionNumber,
  ),
  relatedExportJobId: normalizeText(record.related_export_job_id ?? record.relatedExportJobId),
  relatedImportRecordId: normalizeText(
    record.related_import_record_id ?? record.relatedImportRecordId,
  ),
  metadataJson: cloneValue(record.metadata_json ?? record.metadataJson ?? {}),
  createdAt: record.created_at ?? record.createdAt ?? null,
});

const createInMemoryAuditEventsRepository = () => {
  let nextId = 1;
  const eventsByEvaluationId = new Map();

  return {
    async append(event) {
      const created = normalizeAuditEventRecord({
        id: nextId++,
        created_at: event.createdAt ?? new Date().toISOString(),
        ...event,
      });
      const existing = eventsByEvaluationId.get(created.evaluationId) ?? [];
      eventsByEvaluationId.set(created.evaluationId, [created, ...existing]);
      return cloneValue(created);
    },
    async listByEvaluationId(evaluationId) {
      return (eventsByEvaluationId.get(Number(evaluationId)) ?? []).map((event) => cloneValue(event));
    },
    async close() {},
  };
};

const createPostgresAuditEventsRepository = ({ env }) => {
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
    async append(event, { client } = {}) {
      const normalized = normalizeAuditEventRecord({ id: 0, ...event });

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            INSERT INTO audit_events (
              evaluation_id,
              actor_user_id,
              event_type,
              summary,
              scope_type,
              section_id,
              criterion_code,
              related_comment_id,
              related_asset_id,
              related_link_id,
              related_revision_number,
              related_export_job_id,
              related_import_record_id,
              metadata_json,
              created_at
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7,
              $8, $9, $10, $11, $12, $13,
              $14::jsonb, COALESCE($15, NOW())
            )
            RETURNING *
          `,
          [
            normalized.evaluationId,
            normalized.actorUserId,
            normalized.eventType,
            normalized.summary,
            normalized.scopeType,
            normalized.sectionId,
            normalized.criterionCode,
            normalized.relatedCommentId,
            normalized.relatedAssetId,
            normalized.relatedLinkId,
            normalized.relatedRevisionNumber,
            normalized.relatedExportJobId,
            normalized.relatedImportRecordId,
            JSON.stringify(normalized.metadataJson ?? {}),
            normalized.createdAt,
          ],
        );

        return normalizeAuditEventRecord(result.rows[0]);
      }, client);
    },
    async listByEvaluationId(evaluationId) {
      return withClient(async (client) => {
        const result = await client.query(
          `
            SELECT *
            FROM audit_events
            WHERE evaluation_id = $1
            ORDER BY created_at DESC, id DESC
          `,
          [Number(evaluationId)],
        );

        return result.rows.map((row) => normalizeAuditEventRecord(row));
      });
    },
    async close() {},
  };
};

export const createAuditEventsRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresAuditEventsRepository({ env })
    : createInMemoryAuditEventsRepository();
