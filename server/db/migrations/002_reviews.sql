CREATE TABLE IF NOT EXISTS evaluations (
  id BIGSERIAL PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  tool_id TEXT,
  title_snapshot TEXT NOT NULL DEFAULT '',
  workflow_mode TEXT NOT NULL,
  lifecycle_state TEXT NOT NULL,
  state_schema_version TEXT NOT NULL,
  framework_version TEXT NOT NULL,
  current_state_json JSONB NOT NULL,
  current_revision_number INTEGER NOT NULL DEFAULT 1,
  current_etag TEXT NOT NULL,
  primary_evaluator_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  second_reviewer_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  decision_owner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS evaluations_created_by_idx
  ON evaluations (created_by_user_id);

CREATE INDEX IF NOT EXISTS evaluations_workflow_lifecycle_idx
  ON evaluations (workflow_mode, lifecycle_state);

CREATE INDEX IF NOT EXISTS evaluations_updated_at_idx
  ON evaluations (updated_at DESC);

CREATE TABLE IF NOT EXISTS evaluation_revisions (
  evaluation_id BIGINT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  workflow_mode TEXT NOT NULL,
  lifecycle_state TEXT NOT NULL,
  state_schema_version TEXT NOT NULL,
  framework_version TEXT NOT NULL,
  state_json JSONB NOT NULL,
  saved_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  save_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (evaluation_id, revision_number)
);

CREATE INDEX IF NOT EXISTS evaluation_revisions_created_at_idx
  ON evaluation_revisions (evaluation_id, created_at DESC);
