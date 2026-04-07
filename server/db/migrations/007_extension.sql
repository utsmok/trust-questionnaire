CREATE TABLE IF NOT EXISTS extension_pairing_artifacts (
  pairing_id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT,
  pairing_code_hash TEXT NOT NULL UNIQUE,
  scopes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  consumed_by_session_id TEXT,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS extension_pairing_artifacts_user_idx
  ON extension_pairing_artifacts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS extension_pairing_artifacts_pending_idx
  ON extension_pairing_artifacts (user_id, expires_at DESC)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS extension_sessions (
  session_id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pairing_id TEXT REFERENCES extension_pairing_artifacts(pairing_id) ON DELETE SET NULL,
  client_name TEXT,
  browser_name TEXT,
  browser_version TEXT,
  extension_version TEXT,
  scopes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  paired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  last_refreshed_at TIMESTAMPTZ,
  access_expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  revoke_reason TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS extension_sessions_user_idx
  ON extension_sessions (user_id, paired_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS extension_sessions_refresh_token_hash_idx
  ON extension_sessions (refresh_token_hash)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS capture_events (
  capture_id TEXT PRIMARY KEY,
  extension_session_id TEXT NOT NULL REFERENCES extension_sessions(session_id) ON DELETE RESTRICT,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evaluation_id BIGINT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL,
  section_id TEXT,
  criterion_code TEXT,
  evidence_type TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  asset_kind TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'extension_capture',
  original_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  content_hash TEXT,
  captured_at_client TIMESTAMPTZ,
  origin_url TEXT,
  origin_title TEXT,
  selection_text TEXT,
  browser_name TEXT,
  browser_version TEXT,
  extension_version TEXT,
  page_language TEXT,
  upload_token TEXT NOT NULL,
  upload_expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  asset_id TEXT REFERENCES evidence_assets(asset_id) ON DELETE SET NULL,
  link_id TEXT REFERENCES evidence_links(link_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  CONSTRAINT capture_events_scope_allowed CHECK (scope_type IN ('evaluation', 'criterion', 'review_inbox')),
  CONSTRAINT capture_events_status_allowed CHECK (status IN ('initialized', 'uploaded', 'finalized', 'revoked'))
);

ALTER TABLE IF EXISTS capture_events
  ADD COLUMN IF NOT EXISTS selection_text TEXT;

ALTER TABLE IF EXISTS capture_events
  DROP CONSTRAINT IF EXISTS capture_events_scope_allowed;

ALTER TABLE IF EXISTS capture_events
  ADD CONSTRAINT capture_events_scope_allowed CHECK (scope_type IN ('evaluation', 'criterion', 'review_inbox'));

CREATE INDEX IF NOT EXISTS capture_events_session_idx
  ON capture_events (extension_session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS capture_events_evaluation_idx
  ON capture_events (evaluation_id, created_at DESC);
