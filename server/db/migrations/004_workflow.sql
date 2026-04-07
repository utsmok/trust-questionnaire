CREATE TABLE IF NOT EXISTS evaluation_assignments (
  id BIGSERIAL PRIMARY KEY,
  evaluation_id BIGINT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  CHECK (role IN ('primary_evaluator', 'second_reviewer', 'decision_participant', 'observer'))
);

CREATE UNIQUE INDEX IF NOT EXISTS evaluation_assignments_active_role_idx
  ON evaluation_assignments (evaluation_id, role)
  WHERE unassigned_at IS NULL;

CREATE INDEX IF NOT EXISTS evaluation_assignments_user_idx
  ON evaluation_assignments (user_id, assigned_at DESC)
  WHERE unassigned_at IS NULL;

CREATE TABLE IF NOT EXISTS workflow_transitions (
  id BIGSERIAL PRIMARY KEY,
  evaluation_id BIGINT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  transition_id TEXT NOT NULL,
  from_lifecycle_state TEXT NOT NULL,
  to_lifecycle_state TEXT NOT NULL,
  resulting_workflow_mode TEXT NOT NULL,
  resulting_revision_number INTEGER NOT NULL,
  actor_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workflow_transitions_evaluation_idx
  ON workflow_transitions (evaluation_id, created_at DESC);
