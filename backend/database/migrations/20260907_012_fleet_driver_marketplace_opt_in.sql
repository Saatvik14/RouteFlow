-- Adds internal fleet driver pool and opt-in/opt-out support for business organizations.

BEGIN;

ALTER TABLE routes
  ADD COLUMN IF NOT EXISTS marketplace_scope VARCHAR(16) NOT NULL DEFAULT 'fleet',
  ADD COLUMN IF NOT EXISTS opt_in_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS awarded_driver_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'routes_marketplace_scope_check'
  ) THEN
    ALTER TABLE routes ADD CONSTRAINT routes_marketplace_scope_check
      CHECK (marketplace_scope IN ('fleet', 'public'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS route_opt_ins (
  opt_in_id BIGSERIAL PRIMARY KEY,
  route_id INTEGER NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
  driver_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  response VARCHAR(16) NOT NULL DEFAULT 'opt_in',
  notes VARCHAR(500),
  is_selected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT route_opt_ins_response_check CHECK (response IN ('opt_in', 'opt_out')),
  CONSTRAINT route_opt_ins_unique_driver_route UNIQUE (route_id, driver_user_id)
);

CREATE INDEX IF NOT EXISTS route_opt_ins_route_id_idx ON route_opt_ins (route_id, response, created_at ASC);
CREATE INDEX IF NOT EXISTS route_opt_ins_driver_id_idx ON route_opt_ins (driver_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS routes_fleet_pool_idx ON routes (organization_id, start_datetime ASC, opt_in_deadline ASC)
  WHERE marketplace_status = 'open' AND driver_id IS NULL;

COMMIT;
