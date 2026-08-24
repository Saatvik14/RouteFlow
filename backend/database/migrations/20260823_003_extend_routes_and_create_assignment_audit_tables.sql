-- Extends routes with tenant, lifecycle and assignment fields.
-- Creates route_assignments, route_audit_events and route_change_requests.
-- Depends on 20260823_001_create_organizations_and_organization_memberships.sql.

BEGIN;

ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS organization_id BIGINT REFERENCES organizations(organization_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS route_policy JSONB NOT NULL DEFAULT '{"driverCanReorderStops":false,"driverCanSkipStops":false,"driverCanAddStops":false,"driverCanEditStopDetails":false,"driverCanRequestChange":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS assignment_version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS planned_duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS actual_duration_seconds INTEGER;

UPDATE routes r
SET organization_id = o.organization_id
FROM organizations o
WHERE r.organization_id IS NULL
  AND o.legacy_owner_user_id = r.user_id;

UPDATE routes
SET status = CASE
  WHEN LOWER(COALESCE(status, '')) IN ('pending', 'pnding', 'new', 'scheduled', 'draft') THEN 'draft'
  WHEN LOWER(status) IN ('optimized', 'ready') THEN CASE WHEN driver_id IS NULL THEN 'draft' ELSE 'assigned' END
  WHEN LOWER(status) = 'assigned' THEN 'assigned'
  WHEN LOWER(status) = 'accepted' THEN 'accepted'
  WHEN LOWER(status) IN ('active', 'in_transit', 'in-transit', 'started', 'running', 'in progress', 'in_progress') THEN 'in_progress'
  WHEN LOWER(status) IN ('completed', 'complete', 'done', 'delivered', 'closed', 'archived') THEN 'completed'
  WHEN LOWER(status) = 'failed' THEN 'failed'
  WHEN LOWER(status) IN ('cancelled', 'canceled') THEN 'cancelled'
  ELSE 'draft'
END;

UPDATE routes
SET
  assigned_at = COALESCE(assigned_at, CASE WHEN driver_id IS NOT NULL THEN updated_at END),
  started_at = COALESCE(started_at, CASE WHEN status IN ('in_progress', 'completed') THEN start_datetime END),
  completed_at = COALESCE(completed_at, CASE WHEN status = 'completed' THEN end_datetime END),
  cancelled_at = COALESCE(cancelled_at, CASE WHEN status = 'cancelled' THEN updated_at END),
  planned_duration_seconds = COALESCE(
    planned_duration_seconds,
    GREATEST(0, EXTRACT(EPOCH FROM (end_datetime - start_datetime))::INTEGER)
  );

CREATE TABLE IF NOT EXISTS route_assignments (
  assignment_id BIGSERIAL PRIMARY KEY,
  route_id INTEGER NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
  organization_id BIGINT NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  driver_id INTEGER REFERENCES drivers(driver_id) ON DELETE SET NULL,
  assigned_by_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  assignment_version INTEGER NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  rejection_reason TEXT,
  CONSTRAINT route_assignments_status_check
    CHECK (status IN ('assigned', 'accepted', 'rejected', 'reassigned', 'cancelled', 'completed')),
  CONSTRAINT route_assignments_unique_version UNIQUE (route_id, assignment_version)
);

INSERT INTO route_assignments (
  route_id, organization_id, driver_id, assigned_by_user_id,
  assignment_version, status, assigned_at, responded_at, ended_at
)
SELECT
  r.route_id,
  r.organization_id,
  r.driver_id,
  r.user_id,
  GREATEST(r.assignment_version, 1),
  CASE
    WHEN r.status = 'completed' THEN 'completed'
    WHEN r.status IN ('accepted', 'in_progress') THEN 'accepted'
    WHEN r.status = 'cancelled' THEN 'cancelled'
    ELSE 'assigned'
  END,
  COALESCE(r.assigned_at, r.created_at),
  r.accepted_at,
  COALESCE(r.completed_at, r.cancelled_at)
FROM routes r
WHERE r.driver_id IS NOT NULL AND r.organization_id IS NOT NULL
ON CONFLICT (route_id, assignment_version) DO NOTHING;

UPDATE routes SET assignment_version = 1
WHERE driver_id IS NOT NULL AND assignment_version = 0;

CREATE TABLE IF NOT EXISTS route_audit_events (
  event_id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  route_id INTEGER REFERENCES routes(route_id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
  actor_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  event_type VARCHAR(64) NOT NULL,
  from_state VARCHAR(32),
  to_state VARCHAR(32),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_change_requests (
  request_id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  route_id INTEGER NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
  requested_by_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  request_type VARCHAR(48) NOT NULL,
  details TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  resolved_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT route_change_requests_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS routes_organization_status_start_idx
  ON routes (organization_id, status, start_datetime DESC);
CREATE INDEX IF NOT EXISTS routes_organization_driver_idx
  ON routes (organization_id, driver_id, start_datetime DESC);
CREATE INDEX IF NOT EXISTS route_assignments_route_history_idx
  ON route_assignments (route_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS route_audit_timeline_idx
  ON route_audit_events (organization_id, route_id, created_at DESC);

COMMIT;
