CREATE TABLE IF NOT EXISTS evidence_assets (
  asset_id TEXT PRIMARY KEY,
  asset_kind TEXT NOT NULL,
  source_type TEXT NOT NULL,
  storage_provider TEXT,
  storage_key TEXT,
  content_hash TEXT,
  created_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  original_name TEXT,
  sanitized_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  image_width INTEGER,
  image_height INTEGER,
  preview_storage_key TEXT,
  captured_at_client TIMESTAMPTZ,
  received_at_server TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  origin_url TEXT,
  origin_title TEXT,
  capture_tool_version TEXT,
  browser_name TEXT,
  browser_version TEXT,
  page_language TEXT,
  redaction_status TEXT,
  import_source TEXT
);

CREATE INDEX IF NOT EXISTS evidence_assets_created_by_idx
  ON evidence_assets (created_by_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS evidence_assets_storage_key_idx
  ON evidence_assets (storage_key)
  WHERE storage_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS evidence_links (
  link_id TEXT PRIMARY KEY,
  evaluation_id BIGINT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES evidence_assets(asset_id) ON DELETE RESTRICT,
  scope_type TEXT NOT NULL,
  section_id TEXT,
  criterion_code TEXT,
  evidence_type TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  linked_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replaced_from_link_id TEXT REFERENCES evidence_links(link_id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT evidence_links_scope_allowed CHECK (
    scope_type IN ('evaluation', 'criterion', 'review_inbox')
  ),
  CONSTRAINT evidence_links_scope_requirements CHECK (
    (
      scope_type = 'criterion'
      AND criterion_code IS NOT NULL
      AND section_id IS NOT NULL
    )
    OR (
      scope_type IN ('evaluation', 'review_inbox')
      AND criterion_code IS NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS evidence_links_evaluation_idx
  ON evidence_links (evaluation_id, linked_at DESC);

CREATE INDEX IF NOT EXISTS evidence_links_asset_idx
  ON evidence_links (asset_id, linked_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS evidence_links_active_scope_idx
  ON evidence_links (evaluation_id, asset_id, scope_type, COALESCE(criterion_code, '__none__'))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS evidence_download_events (
  id BIGSERIAL PRIMARY KEY,
  evaluation_id BIGINT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES evidence_assets(asset_id) ON DELETE CASCADE,
  link_id TEXT REFERENCES evidence_links(link_id) ON DELETE SET NULL,
  actor_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS evidence_download_events_asset_idx
  ON evidence_download_events (asset_id, created_at DESC);

CREATE INDEX IF NOT EXISTS evidence_download_events_evaluation_idx
  ON evidence_download_events (evaluation_id, created_at DESC);
