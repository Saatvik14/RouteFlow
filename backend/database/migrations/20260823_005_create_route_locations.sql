-- Creates route_locations for throttled driver location updates.
-- Depends on the organizations, routes and drivers migrations.

BEGIN;

CREATE TABLE IF NOT EXISTS route_locations (
  location_update_id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  route_id INTEGER NOT NULL REFERENCES routes(route_id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES drivers(driver_id) ON DELETE RESTRICT,
  recorded_by_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy_meters DECIMAL(10, 2),
  heading_degrees DECIMAL(7, 2),
  speed_mps DECIMAL(10, 3),
  device_recorded_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT route_locations_latitude_check CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT route_locations_longitude_check CHECK (longitude BETWEEN -180 AND 180)
);

CREATE INDEX IF NOT EXISTS route_locations_latest_idx
  ON route_locations (organization_id, route_id, received_at DESC);

COMMIT;
