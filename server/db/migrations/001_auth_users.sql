CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  external_subject_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  given_name TEXT,
  family_name TEXT,
  affiliation TEXT,
  department TEXT,
  job_title TEXT,
  role TEXT NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_affiliation_text TEXT NOT NULL DEFAULT '',
  default_reviewer_signature TEXT NOT NULL DEFAULT '',
  preferred_density TEXT NOT NULL DEFAULT 'compact',
  preferred_time_zone TEXT NOT NULL DEFAULT 'UTC',
  default_sidebar_tab TEXT NOT NULL DEFAULT 'guidance',
  keyboard_shortcuts_collapsed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
