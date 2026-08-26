-- Adds the minimal credential and onboarding fields used by role-aware auth.
-- Fleet access codes are stored as bcrypt hashes and are never recoverable.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS fleet_access_code_hash TEXT,
  ADD COLUMN IF NOT EXISTS fleet_access_code_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(24);

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_vehicle_type_check;

ALTER TABLE users
  ADD CONSTRAINT users_vehicle_type_check
  CHECK (
    vehicle_type IS NULL
    OR vehicle_type IN ('car', 'van', 'truck', 'motorbike')
  );

CREATE INDEX IF NOT EXISTS users_role_access_code_idx
  ON users (role)
  WHERE fleet_access_code_hash IS NOT NULL;

COMMIT;
