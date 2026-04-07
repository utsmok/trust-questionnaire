import crypto from 'node:crypto';

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

const normalizeExportJobRecord = (record) => ({
  id: Number(record.id ?? 0),
  jobId: record.job_id ?? record.jobId ?? `export-${crypto.randomUUID()}`,
  evaluationId: Number(record.evaluation_id ?? record.evaluationId),
  requestedByUserId: Number(record.requested_by_user_id ?? record.requestedByUserId),
  format: record.format,
  includeEvidenceFiles: Boolean(record.include_evidence_files ?? record.includeEvidenceFiles),
  includeReportingCsv: Boolean(record.include_reporting_csv ?? record.includeReportingCsv),
  status: record.status ?? 'completed',
  fileName: record.file_name ?? record.fileName ?? null,
  byteSize: Number(record.byte_size ?? record.byteSize ?? 0),
  packageVersion: Number(record.package_version ?? record.packageVersion ?? 1),
  createdAt: record.created_at ?? record.createdAt ?? null,
  completedAt: record.completed_at ?? record.completedAt ?? null,
});

const createInMemoryExportJobsRepository = () => {
  let nextId = 1;
  const jobsByEvaluationId = new Map();

  return {
    async create(job) {
      const created = normalizeExportJobRecord({
        id: nextId++,
        created_at: job.createdAt ?? new Date().toISOString(),
        completed_at: job.completedAt ?? new Date().toISOString(),
        ...job,
      });
      const existing = jobsByEvaluationId.get(created.evaluationId) ?? [];
      jobsByEvaluationId.set(created.evaluationId, [created, ...existing]);
      return cloneValue(created);
    },
    async listByEvaluationId(evaluationId) {
      return (jobsByEvaluationId.get(Number(evaluationId)) ?? []).map((job) => cloneValue(job));
    },
    async getByJobId(evaluationId, jobId) {
      const matched = (jobsByEvaluationId.get(Number(evaluationId)) ?? []).find(
        (job) => job.jobId === String(jobId),
      );
      return matched ? cloneValue(matched) : null;
    },
    async updateCompletion({ evaluationId, jobId, byteSize, status = 'completed', fileName }) {
      const existing = jobsByEvaluationId.get(Number(evaluationId)) ?? [];
      const next = existing.map((job) =>
        job.jobId === String(jobId)
          ? {
              ...job,
              status,
              byteSize: Number(byteSize ?? job.byteSize ?? 0),
              fileName: fileName ?? job.fileName,
              completedAt: new Date().toISOString(),
            }
          : job,
      );
      jobsByEvaluationId.set(Number(evaluationId), next);
      return cloneValue(next.find((job) => job.jobId === String(jobId)) ?? null);
    },
    async close() {},
  };
};

const createPostgresExportJobsRepository = ({ env }) => {
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
    async create(job, { client } = {}) {
      const normalized = normalizeExportJobRecord(job);

      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            INSERT INTO export_jobs (
              job_id,
              evaluation_id,
              requested_by_user_id,
              format,
              include_evidence_files,
              include_reporting_csv,
              status,
              file_name,
              byte_size,
              package_version,
              created_at,
              completed_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, NOW()), $12)
            RETURNING *
          `,
          [
            normalized.jobId,
            normalized.evaluationId,
            normalized.requestedByUserId,
            normalized.format,
            normalized.includeEvidenceFiles,
            normalized.includeReportingCsv,
            normalized.status,
            normalized.fileName,
            normalized.byteSize,
            normalized.packageVersion,
            normalized.createdAt,
            normalized.completedAt,
          ],
        );

        return normalizeExportJobRecord(result.rows[0]);
      }, client);
    },
    async listByEvaluationId(evaluationId) {
      return withClient(async (client) => {
        const result = await client.query(
          `
            SELECT *
            FROM export_jobs
            WHERE evaluation_id = $1
            ORDER BY created_at DESC, id DESC
          `,
          [Number(evaluationId)],
        );

        return result.rows.map((row) => normalizeExportJobRecord(row));
      });
    },
    async getByJobId(evaluationId, jobId) {
      return withClient(async (client) => {
        const result = await client.query(
          `
            SELECT *
            FROM export_jobs
            WHERE evaluation_id = $1 AND job_id = $2
            LIMIT 1
          `,
          [Number(evaluationId), String(jobId)],
        );

        return result.rows[0] ? normalizeExportJobRecord(result.rows[0]) : null;
      });
    },
    async updateCompletion({ evaluationId, jobId, byteSize, status = 'completed', fileName }, { client } = {}) {
      return withClient(async (dbClient) => {
        const result = await dbClient.query(
          `
            UPDATE export_jobs
            SET status = $3,
                byte_size = $4,
                file_name = COALESCE($5, file_name),
                completed_at = NOW()
            WHERE evaluation_id = $1 AND job_id = $2
            RETURNING *
          `,
          [Number(evaluationId), String(jobId), status, Number(byteSize ?? 0), fileName ?? null],
        );

        return result.rows[0] ? normalizeExportJobRecord(result.rows[0]) : null;
      }, client);
    },
    async close() {},
  };
};

export const createExportJobsRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresExportJobsRepository({ env })
    : createInMemoryExportJobsRepository();
