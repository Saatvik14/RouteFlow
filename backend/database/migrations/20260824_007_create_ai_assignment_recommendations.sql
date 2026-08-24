-- Adds driver assignment profiles and expiring, dispatcher-confirmed AI recommendation drafts.
-- Depends on 20260823_003_extend_routes_and_create_assignment_audit_tables.sql.

BEGIN;

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS assignment_profile JSONB NOT NULL DEFAULT '{"skills":[],"licenseCategories":[],"maxHoursPerDay":10,"homeBase":null}'::jsonb;

CREATE TABLE IF NOT EXISTS assignment_recommendation_runs (
  recommendation_run_id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  requested_by_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  criteria_text TEXT,
  criteria JSONB NOT NULL,
  interpretation TEXT NOT NULL,
  summary TEXT,
  llm_used BOOLEAN NOT NULL DEFAULT FALSE,
  model_name VARCHAR(120),
  status VARCHAR(16) NOT NULL DEFAULT 'draft',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assignment_recommendation_runs_status_check
    CHECK (status IN ('draft', 'confirmed', 'expired', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS assignment_recommendation_items (
  recommendation_item_id BIGSERIAL PRIMARY KEY,
  recommendation_run_id BIGINT NOT NULL REFERENCES assignment_recommendation_runs(recommendation_run_id) ON DELETE CASCADE,
  route_id INTEGER NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
  driver_id INTEGER REFERENCES drivers(driver_id) ON DELETE SET NULL,
  route_assignment_version INTEGER NOT NULL,
  candidate_rank INTEGER NOT NULL,
  score NUMERIC(5, 1),
  explanation TEXT,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  no_match_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assignment_recommendation_items_rank_check CHECK (candidate_rank >= 1),
  CONSTRAINT assignment_recommendation_items_route_rank_unique
    UNIQUE (recommendation_run_id, route_id, candidate_rank)
);

CREATE INDEX IF NOT EXISTS assignment_recommendation_runs_org_created_idx
  ON assignment_recommendation_runs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assignment_recommendation_items_run_route_idx
  ON assignment_recommendation_items (recommendation_run_id, route_id, candidate_rank);

COMMIT;
