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

const normalizeLinkRecord = (record) => ({
  linkId: record.link_id ?? record.linkId,
  evaluationId: Number(record.evaluation_id ?? record.evaluationId),
  assetId: record.asset_id ?? record.assetId,
  scopeType: record.scope_type ?? record.scopeType,
  sectionId: normalizeText(record.section_id ?? record.sectionId),
  criterionCode: normalizeText(record.criterion_code ?? record.criterionCode),
  evidenceType: record.evidence_type ?? record.evidenceType,
  note: record.note ?? '',
  linkedByUserId: Number(record.linked_by_user_id ?? record.linkedByUserId),
  linkedAt: record.linked_at ?? record.linkedAt ?? null,
  replacedFromLinkId: normalizeText(record.replaced_from_link_id ?? record.replacedFromLinkId),
  deletedAt: record.deleted_at ?? record.deletedAt ?? null,
});

const createInMemoryEvidenceLinksRepository = () => {
  const linksById = new Map();

  const listActiveLinks = () =>
    [...linksById.values()].filter((link) => link.deletedAt === null || link.deletedAt === undefined);

  return {
    async create(link) {
      const normalized = normalizeLinkRecord(link);
      const created = {
        ...normalized,
        linkedAt: normalized.linkedAt ?? new Date().toISOString(),
        deletedAt: normalized.deletedAt ?? null,
      };

      linksById.set(created.linkId, created);
      return cloneValue(created);
    },
    async getByIdForEvaluation({ evaluationId, linkId, includeDeleted = false } = {}) {
      const link = linksById.get(String(linkId)) ?? null;

      if (!link || link.evaluationId !== Number(evaluationId)) {
        return null;
      }

      if (!includeDeleted && link.deletedAt) {
        return null;
      }

      return cloneValue(link);
    },
    async listByEvaluationId(evaluationId, { includeDeleted = false } = {}) {
      return [...linksById.values()]
        .filter((link) => link.evaluationId === Number(evaluationId))
        .filter((link) => includeDeleted || !link.deletedAt)
        .slice()
        .sort((left, right) => {
          const timestampOrder = String(left.linkedAt).localeCompare(String(right.linkedAt));
          return timestampOrder !== 0 ? timestampOrder : String(left.linkId).localeCompare(String(right.linkId));
        })
        .map((link) => cloneValue(link));
    },
    async listByAssetId(assetId, { includeDeleted = false } = {}) {
      return [...linksById.values()]
        .filter((link) => link.assetId === String(assetId))
        .filter((link) => includeDeleted || !link.deletedAt)
        .slice()
        .sort((left, right) => {
          const timestampOrder = String(left.linkedAt).localeCompare(String(right.linkedAt));
          return timestampOrder !== 0 ? timestampOrder : String(left.linkId).localeCompare(String(right.linkId));
        })
        .map((link) => cloneValue(link));
    },
    async findActiveByScope({ evaluationId, assetId, scopeType, criterionCode = null } = {}) {
      return (
        listActiveLinks().find(
          (link) =>
            link.evaluationId === Number(evaluationId) &&
            link.assetId === String(assetId) &&
            link.scopeType === scopeType &&
            (link.criterionCode ?? null) === (criterionCode ?? null),
        ) ?? null
      );
    },
    async updateMetadata({ evaluationId, linkId, scopeType, sectionId, criterionCode, evidenceType, note } = {}) {
      const existing = linksById.get(String(linkId)) ?? null;

      if (!existing || existing.evaluationId !== Number(evaluationId) || existing.deletedAt) {
        return null;
      }

      const updated = {
        ...existing,
        scopeType,
        sectionId,
        criterionCode,
        evidenceType,
        note,
      };

      linksById.set(updated.linkId, updated);
      return cloneValue(updated);
    },
    async softDelete({ evaluationId, linkId, deletedAt } = {}) {
      const existing = linksById.get(String(linkId)) ?? null;

      if (!existing || existing.evaluationId !== Number(evaluationId) || existing.deletedAt) {
        return null;
      }

      const updated = {
        ...existing,
        deletedAt: deletedAt ?? new Date().toISOString(),
      };

      linksById.set(updated.linkId, updated);
      return cloneValue(updated);
    },
    async softDeleteByAssetId(assetId, { deletedAt } = {}) {
      const nextDeletedAt = deletedAt ?? new Date().toISOString();
      const updatedLinks = [];

      [...linksById.values()].forEach((link) => {
        if (link.assetId !== String(assetId) || link.deletedAt) {
          return;
        }

        const updated = {
          ...link,
          deletedAt: nextDeletedAt,
        };

        linksById.set(updated.linkId, updated);
        updatedLinks.push(cloneValue(updated));
      });

      return updatedLinks;
    },
    async close() {},
  };
};

const createPostgresEvidenceLinksRepository = ({ env }) => {
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
    async create(link, { client } = {}) {
      const normalized = normalizeLinkRecord(link);

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            INSERT INTO evidence_links (
              link_id,
              evaluation_id,
              asset_id,
              scope_type,
              section_id,
              criterion_code,
              evidence_type,
              note,
              linked_by_user_id,
              linked_at,
              replaced_from_link_id,
              deleted_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, NOW()), $11, $12)
            RETURNING *
          `,
          [
            normalized.linkId,
            normalized.evaluationId,
            normalized.assetId,
            normalized.scopeType,
            normalized.sectionId,
            normalized.criterionCode,
            normalized.evidenceType,
            normalized.note,
            normalized.linkedByUserId,
            normalized.linkedAt,
            normalized.replacedFromLinkId,
            normalized.deletedAt,
          ],
        );

        return normalizeLinkRecord(result.rows[0]);
      }, client);
    },
    async getByIdForEvaluation({ evaluationId, linkId, includeDeleted = false } = {}) {
      return withClient(async (client) => {
        const deletedClause = includeDeleted ? '' : 'AND deleted_at IS NULL';
        const result = await client.query(
          `
            SELECT *
            FROM evidence_links
            WHERE evaluation_id = $1 AND link_id = $2 ${deletedClause}
            LIMIT 1
          `,
          [Number(evaluationId), String(linkId)],
        );

        return result.rows[0] ? normalizeLinkRecord(result.rows[0]) : null;
      });
    },
    async listByEvaluationId(evaluationId, { includeDeleted = false } = {}) {
      return withClient(async (client) => {
        const deletedClause = includeDeleted ? '' : 'AND deleted_at IS NULL';
        const result = await client.query(
          `
            SELECT *
            FROM evidence_links
            WHERE evaluation_id = $1 ${deletedClause}
            ORDER BY linked_at ASC, link_id ASC
          `,
          [Number(evaluationId)],
        );

        return result.rows.map((row) => normalizeLinkRecord(row));
      });
    },
    async listByAssetId(assetId, { includeDeleted = false } = {}) {
      return withClient(async (client) => {
        const deletedClause = includeDeleted ? '' : 'AND deleted_at IS NULL';
        const result = await client.query(
          `
            SELECT *
            FROM evidence_links
            WHERE asset_id = $1 ${deletedClause}
            ORDER BY linked_at ASC, link_id ASC
          `,
          [String(assetId)],
        );

        return result.rows.map((row) => normalizeLinkRecord(row));
      });
    },
    async findActiveByScope({ evaluationId, assetId, scopeType, criterionCode = null } = {}) {
      return withClient(async (client) => {
        const result = await client.query(
          `
            SELECT *
            FROM evidence_links
            WHERE evaluation_id = $1
              AND asset_id = $2
              AND scope_type = $3
              AND (
                ($4::text IS NULL AND criterion_code IS NULL)
                OR criterion_code = $4
              )
              AND deleted_at IS NULL
            LIMIT 1
          `,
          [Number(evaluationId), String(assetId), scopeType, criterionCode],
        );

        return result.rows[0] ? normalizeLinkRecord(result.rows[0]) : null;
      });
    },
    async updateMetadata({ evaluationId, linkId, scopeType, sectionId, criterionCode, evidenceType, note } = {}) {
      return withClient(async (client) => {
        const result = await client.query(
          `
            UPDATE evidence_links
            SET scope_type = $3,
                section_id = $4,
                criterion_code = $5,
                evidence_type = $6,
                note = $7
            WHERE evaluation_id = $1
              AND link_id = $2
              AND deleted_at IS NULL
            RETURNING *
          `,
          [
            Number(evaluationId),
            String(linkId),
            scopeType,
            sectionId,
            criterionCode,
            evidenceType,
            note,
          ],
        );

        return result.rows[0] ? normalizeLinkRecord(result.rows[0]) : null;
      });
    },
    async softDelete({ evaluationId, linkId, deletedAt } = {}) {
      return withClient(async (client) => {
        const result = await client.query(
          `
            UPDATE evidence_links
            SET deleted_at = COALESCE($3, NOW())
            WHERE evaluation_id = $1
              AND link_id = $2
              AND deleted_at IS NULL
            RETURNING *
          `,
          [Number(evaluationId), String(linkId), deletedAt ?? null],
        );

        return result.rows[0] ? normalizeLinkRecord(result.rows[0]) : null;
      });
    },
    async softDeleteByAssetId(assetId, { deletedAt } = {}) {
      return withClient(async (client) => {
        const result = await client.query(
          `
            UPDATE evidence_links
            SET deleted_at = COALESCE($2, NOW())
            WHERE asset_id = $1
              AND deleted_at IS NULL
            RETURNING *
          `,
          [String(assetId), deletedAt ?? null],
        );

        return result.rows.map((row) => normalizeLinkRecord(row));
      });
    },
    async close() {},
  };
};

export const createEvidenceLinksRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresEvidenceLinksRepository({ env })
    : createInMemoryEvidenceLinksRepository();
