CREATE TABLE IF NOT EXISTS test_sets (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  purpose TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'team',
  status TEXT NOT NULL DEFAULT 'draft',
  owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  latest_draft_revision_id BIGINT,
  latest_published_revision_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CHECK (visibility IN ('private', 'team')),
  CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE IF NOT EXISTS test_set_revisions (
  id BIGSERIAL PRIMARY KEY,
  test_set_id BIGINT NOT NULL REFERENCES test_sets(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  schema_version TEXT NOT NULL DEFAULT '1',
  title_snapshot TEXT NOT NULL DEFAULT '',
  description_snapshot TEXT NOT NULL DEFAULT '',
  purpose_snapshot TEXT NOT NULL DEFAULT '',
  visibility_snapshot TEXT NOT NULL DEFAULT 'team',
  change_summary TEXT NOT NULL DEFAULT '',
  cases_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  derived_from_revision_id BIGINT REFERENCES test_set_revisions(id) ON DELETE SET NULL,
  CHECK (version_number > 0),
  CHECK (status IN ('draft', 'published')),
  CHECK (visibility_snapshot IN ('private', 'team'))
);

CREATE UNIQUE INDEX IF NOT EXISTS test_set_revisions_unique_version_idx
  ON test_set_revisions (test_set_id, version_number);

CREATE UNIQUE INDEX IF NOT EXISTS test_set_revisions_one_draft_idx
  ON test_set_revisions (test_set_id)
  WHERE status = 'draft';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'test_sets_latest_draft_revision_fk'
  ) THEN
    ALTER TABLE test_sets
      ADD CONSTRAINT test_sets_latest_draft_revision_fk
      FOREIGN KEY (latest_draft_revision_id) REFERENCES test_set_revisions(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'test_sets_latest_published_revision_fk'
  ) THEN
    ALTER TABLE test_sets
      ADD CONSTRAINT test_sets_latest_published_revision_fk
      FOREIGN KEY (latest_published_revision_id) REFERENCES test_set_revisions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS test_sets_owner_idx
  ON test_sets (owner_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS review_test_plans (
  id BIGSERIAL PRIMARY KEY,
  evaluation_id BIGINT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  test_set_id BIGINT NOT NULL REFERENCES test_sets(id) ON DELETE CASCADE,
  test_set_revision_id BIGINT NOT NULL REFERENCES test_set_revisions(id) ON DELETE RESTRICT,
  role TEXT NOT NULL DEFAULT 'baseline',
  linked_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (role IN ('baseline', 'comparison', 'ad_hoc', 'regression'))
);

CREATE UNIQUE INDEX IF NOT EXISTS review_test_plans_unique_revision_role_idx
  ON review_test_plans (evaluation_id, test_set_revision_id, role);

CREATE INDEX IF NOT EXISTS review_test_plans_evaluation_idx
  ON review_test_plans (evaluation_id, linked_at DESC);

CREATE TABLE IF NOT EXISTS review_test_runs (
  id BIGSERIAL PRIMARY KEY,
  evaluation_id BIGINT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  review_test_plan_id BIGINT NOT NULL REFERENCES review_test_plans(id) ON DELETE CASCADE,
  test_set_id BIGINT NOT NULL REFERENCES test_sets(id) ON DELETE RESTRICT,
  test_set_revision_id BIGINT NOT NULL REFERENCES test_set_revisions(id) ON DELETE RESTRICT,
  case_ordinal INTEGER NOT NULL,
  case_title_snapshot TEXT NOT NULL DEFAULT '',
  criterion_code TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  result_summary TEXT NOT NULL DEFAULT '',
  result_notes TEXT NOT NULL DEFAULT '',
  linked_evidence_link_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  executed_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (case_ordinal > 0),
  CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped', 'blocked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS review_test_runs_unique_plan_case_idx
  ON review_test_runs (review_test_plan_id, case_ordinal);

CREATE INDEX IF NOT EXISTS review_test_runs_evaluation_idx
  ON review_test_runs (evaluation_id, review_test_plan_id, case_ordinal);
