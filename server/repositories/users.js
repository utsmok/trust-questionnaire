import { createDbClient } from '../db/client.js';

const DEFAULT_ROLE = 'member';

const normalizeUserRecord = (record) => ({
  id: Number(record.id),
  externalSubjectId: record.external_subject_id,
  email: record.email,
  displayName: record.display_name,
  givenName: record.given_name ?? '',
  familyName: record.family_name ?? '',
  affiliation: record.affiliation ?? '',
  department: record.department ?? '',
  jobTitle: record.job_title ?? '',
  role: record.role ?? DEFAULT_ROLE,
  isActive: record.is_active !== false,
  lastLoginAt: record.last_login_at ?? null,
  createdAt: record.created_at ?? null,
  updatedAt: record.updated_at ?? null,
});

const normalizeIdentity = (identity) => ({
  externalSubjectId: identity.externalSubjectId,
  email: identity.email,
  displayName: identity.displayName,
  givenName: identity.givenName ?? '',
  familyName: identity.familyName ?? '',
  affiliation: identity.affiliation ?? '',
  department: identity.department ?? '',
  jobTitle: identity.jobTitle ?? '',
  role: identity.role ?? DEFAULT_ROLE,
});

const createInMemoryUsersRepository = () => {
  const usersById = new Map();
  const usersBySubject = new Map();
  let nextId = 1;

  return {
    async upsertFromIdentity(identity) {
      const normalized = normalizeIdentity(identity);
      const existingId = usersBySubject.get(normalized.externalSubjectId);
      const now = new Date().toISOString();

      if (existingId) {
        const existing = usersById.get(existingId);
        const updated = {
          ...existing,
          ...normalized,
          isActive: true,
          lastLoginAt: now,
          updatedAt: now,
        };

        usersById.set(existingId, updated);
        return updated;
      }

      const created = {
        id: nextId,
        ...normalized,
        isActive: true,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
      };

      usersById.set(nextId, created);
      usersBySubject.set(normalized.externalSubjectId, nextId);
      nextId += 1;

      return created;
    },
    async getById(userId) {
      return usersById.get(Number(userId)) ?? null;
    },
  };
};

const createPostgresUsersRepository = ({ env }) => {
  const withClient = async (callback) => {
    const client = createDbClient(env);

    await client.connect();

    try {
      return await callback(client);
    } finally {
      await client.end();
    }
  };

  return {
    async upsertFromIdentity(identity) {
      const normalized = normalizeIdentity(identity);

      return withClient(async (client) => {
        const result = await client.query(
          `
            INSERT INTO users (
              external_subject_id,
              email,
              display_name,
              given_name,
              family_name,
              affiliation,
              department,
              job_title,
              role,
              is_active,
              last_login_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NOW())
            ON CONFLICT (external_subject_id)
            DO UPDATE SET
              email = EXCLUDED.email,
              display_name = EXCLUDED.display_name,
              given_name = EXCLUDED.given_name,
              family_name = EXCLUDED.family_name,
              affiliation = EXCLUDED.affiliation,
              department = EXCLUDED.department,
              job_title = EXCLUDED.job_title,
              role = EXCLUDED.role,
              is_active = TRUE,
              last_login_at = NOW(),
              updated_at = NOW()
            RETURNING *
          `,
          [
            normalized.externalSubjectId,
            normalized.email,
            normalized.displayName,
            normalized.givenName,
            normalized.familyName,
            normalized.affiliation,
            normalized.department,
            normalized.jobTitle,
            normalized.role,
          ],
        );

        return normalizeUserRecord(result.rows[0]);
      });
    },
    async getById(userId) {
      return withClient(async (client) => {
        const result = await client.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [
          Number(userId),
        ]);

        return result.rows[0] ? normalizeUserRecord(result.rows[0]) : null;
      });
    },
  };
};

export const createUsersRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresUsersRepository({ env })
    : createInMemoryUsersRepository();
