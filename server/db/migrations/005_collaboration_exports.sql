CREATE TABLE IF NOT EXISTS review_comments (
  id BIGSERIAL PRIMARY KEY,
  evaluation_id BIGINT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL,
  section_id TEXT,
  criterion_code TEXT,
  body TEXT NOT NULL,
  created_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (scope_type IN ('review', 'section', 'criterion'))
);

CREATE INDEX IF NOT EXISTS review_comments_evaluation_idx
  ON review_comments (evaluation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGSERIAL PRIMARY KEY,
  evaluation_id BIGINT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  scope_type TEXT,
  section_id TEXT,
  criterion_code TEXT,
  related_comment_id BIGINT,
  related_asset_id TEXT,
  related_link_id TEXT,
  related_revision_number INTEGER,
  related_export_job_id TEXT,
  related_import_record_id TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_events_evaluation_idx
  ON audit_events (evaluation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS export_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE,
  evaluation_id BIGINT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  requested_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  format TEXT NOT NULL,
  include_evidence_files BOOLEAN NOT NULL DEFAULT FALSE,
  include_reporting_csv BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'completed',
  file_name TEXT,
  byte_size BIGINT NOT NULL DEFAULT 0,
  package_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS export_jobs_evaluation_idx
  ON export_jobs (evaluation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS import_records (
  id BIGSERIAL PRIMARY KEY,
  import_id TEXT NOT NULL UNIQUE,
  evaluation_id BIGINT REFERENCES evaluations(id) ON DELETE SET NULL,
  imported_evaluation_id BIGINT REFERENCES evaluations(id) ON DELETE SET NULL,
  import_class TEXT NOT NULL,
  source_format TEXT NOT NULL,
  source_name TEXT,
  imported_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS import_records_evaluation_idx
  ON import_records (evaluation_id, imported_evaluation_id, created_at DESC);
