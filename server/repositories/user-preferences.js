import { createDbClient } from '../db/client.js';

export const DEFAULT_USER_PREFERENCES = Object.freeze({
  defaultAffiliationText: '',
  defaultReviewerSignature: '',
  preferredDensity: 'compact',
  preferredTimeZone: 'UTC',
  defaultSidebarTab: 'guidance',
  keyboardShortcutsCollapsed: false,
});

const PREFERENCE_KEYS = new Set(Object.keys(DEFAULT_USER_PREFERENCES));
const DENSITY_OPTIONS = new Set(['compact', 'comfortable']);
const SIDEBAR_TAB_OPTIONS = new Set(['guidance', 'reference', 'about', 'activity']);

const normalizePreferenceRecord = (record) => ({
  defaultAffiliationText:
    record.default_affiliation_text ?? record.defaultAffiliationText ?? DEFAULT_USER_PREFERENCES.defaultAffiliationText,
  defaultReviewerSignature:
    record.default_reviewer_signature ??
    record.defaultReviewerSignature ??
    DEFAULT_USER_PREFERENCES.defaultReviewerSignature,
  preferredDensity:
    record.preferred_density ?? record.preferredDensity ?? DEFAULT_USER_PREFERENCES.preferredDensity,
  preferredTimeZone:
    record.preferred_time_zone ??
    record.preferredTimeZone ??
    DEFAULT_USER_PREFERENCES.preferredTimeZone,
  defaultSidebarTab:
    record.default_sidebar_tab ??
    record.defaultSidebarTab ??
    DEFAULT_USER_PREFERENCES.defaultSidebarTab,
  keyboardShortcutsCollapsed:
    record.keyboard_shortcuts_collapsed ??
    record.keyboardShortcutsCollapsed ??
    DEFAULT_USER_PREFERENCES.keyboardShortcutsCollapsed,
});

export const sanitizePreferencesPatch = (input = {}) => {
  const patch = {};

  for (const [key, value] of Object.entries(input)) {
    if (!PREFERENCE_KEYS.has(key)) {
      continue;
    }

    if (key === 'keyboardShortcutsCollapsed') {
      if (typeof value === 'boolean') {
        patch[key] = value;
      }

      continue;
    }

    if (typeof value !== 'string') {
      continue;
    }

    const trimmed = value.trim();

    if (key === 'preferredDensity') {
      if (DENSITY_OPTIONS.has(trimmed)) {
        patch[key] = trimmed;
      }

      continue;
    }

    if (key === 'defaultSidebarTab') {
      if (SIDEBAR_TAB_OPTIONS.has(trimmed)) {
        patch[key] = trimmed;
      }

      continue;
    }

    patch[key] = trimmed;
  }

  return patch;
};

const createInMemoryUserPreferencesRepository = () => {
  const preferencesByUserId = new Map();

  return {
    async ensureForUser(userId, defaults = {}) {
      const existing = preferencesByUserId.get(Number(userId));

      if (existing) {
        return existing;
      }

      const created = normalizePreferenceRecord({
        ...DEFAULT_USER_PREFERENCES,
        ...sanitizePreferencesPatch(defaults),
      });

      preferencesByUserId.set(Number(userId), created);
      return created;
    },
    async update(userId, patch = {}) {
      const current = await this.ensureForUser(userId);
      const updated = normalizePreferenceRecord({
        ...current,
        ...sanitizePreferencesPatch(patch),
      });

      preferencesByUserId.set(Number(userId), updated);
      return updated;
    },
  };
};

const createPostgresUserPreferencesRepository = ({ env }) => {
  const withClient = async (callback) => {
    const client = createDbClient(env);

    await client.connect();

    try {
      return await callback(client);
    } finally {
      await client.end();
    }
  };

  const insertDefaults = async (client, userId, defaults = {}) => {
    const mergedDefaults = normalizePreferenceRecord({
      ...DEFAULT_USER_PREFERENCES,
      ...sanitizePreferencesPatch(defaults),
    });

    const result = await client.query(
      `
        INSERT INTO user_preferences (
          user_id,
          default_affiliation_text,
          default_reviewer_signature,
          preferred_density,
          preferred_time_zone,
          default_sidebar_tab,
          keyboard_shortcuts_collapsed
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id) DO NOTHING
        RETURNING *
      `,
      [
        Number(userId),
        mergedDefaults.defaultAffiliationText,
        mergedDefaults.defaultReviewerSignature,
        mergedDefaults.preferredDensity,
        mergedDefaults.preferredTimeZone,
        mergedDefaults.defaultSidebarTab,
        mergedDefaults.keyboardShortcutsCollapsed,
      ],
    );

    if (result.rows[0]) {
      return normalizePreferenceRecord(result.rows[0]);
    }

    const existing = await client.query(
      'SELECT * FROM user_preferences WHERE user_id = $1 LIMIT 1',
      [Number(userId)],
    );

    return normalizePreferenceRecord(existing.rows[0]);
  };

  return {
    async ensureForUser(userId, defaults = {}) {
      return withClient(async (client) => {
        const existing = await client.query(
          'SELECT * FROM user_preferences WHERE user_id = $1 LIMIT 1',
          [Number(userId)],
        );

        if (existing.rows[0]) {
          return normalizePreferenceRecord(existing.rows[0]);
        }

        return insertDefaults(client, userId, defaults);
      });
    },
    async update(userId, patch = {}) {
      const sanitizedPatch = sanitizePreferencesPatch(patch);

      return withClient(async (client) => {
        const current = await insertDefaults(client, userId);
        const merged = normalizePreferenceRecord({
          ...current,
          ...sanitizedPatch,
        });

        const result = await client.query(
          `
            UPDATE user_preferences
            SET
              default_affiliation_text = $2,
              default_reviewer_signature = $3,
              preferred_density = $4,
              preferred_time_zone = $5,
              default_sidebar_tab = $6,
              keyboard_shortcuts_collapsed = $7,
              updated_at = NOW()
            WHERE user_id = $1
            RETURNING *
          `,
          [
            Number(userId),
            merged.defaultAffiliationText,
            merged.defaultReviewerSignature,
            merged.preferredDensity,
            merged.preferredTimeZone,
            merged.defaultSidebarTab,
            merged.keyboardShortcutsCollapsed,
          ],
        );

        return normalizePreferenceRecord(result.rows[0]);
      });
    },
  };
};

export const createUserPreferencesRepository = ({ env } = {}) =>
  env?.userStorageDriver === 'pg'
    ? createPostgresUserPreferencesRepository({ env })
    : createInMemoryUserPreferencesRepository();
