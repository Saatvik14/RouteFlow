-- Creates organizations and organization_memberships.
-- Extends drivers so accounts and permissions belong to an organization.
-- Depends on the existing users, drivers and routes tables.

BEGIN;

CREATE TABLE IF NOT EXISTS organizations (
  organization_id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  legacy_owner_user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE SET NULL,
  settings JSONB NOT NULL DEFAULT '{"locationStaleAfterSeconds":120,"locationUpdateIntervalSeconds":15}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_memberships (
  membership_id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  role VARCHAR(24) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organization_memberships_unique_user UNIQUE (organization_id, user_id),
  CONSTRAINT organization_memberships_role_check
    CHECK (role IN ('owner', 'admin', 'dispatcher', 'driver', 'viewer')),
  CONSTRAINT organization_memberships_status_check
    CHECK (status IN ('active', 'inactive', 'removed'))
);

INSERT INTO organizations (name, legacy_owner_user_id)
SELECT
  COALESCE(NULLIF(BTRIM(u.name), ''), 'RouteFloww business'),
  u.user_id
FROM users u
WHERE
  UPPER(COALESCE(u.role, '')) IN ('BUSINESS_OWNER', 'INDEPENDENT_DRIVER')
  OR EXISTS (SELECT 1 FROM routes r WHERE r.user_id = u.user_id)
  OR EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = u.user_id)
ON CONFLICT (legacy_owner_user_id) DO NOTHING;

INSERT INTO organization_memberships (organization_id, user_id, role, status)
SELECT o.organization_id, o.legacy_owner_user_id, 'owner', 'active'
FROM organizations o
WHERE o.legacy_owner_user_id IS NOT NULL
ON CONFLICT (organization_id, user_id) DO UPDATE
SET role = 'owner', status = 'active', removed_at = NULL, updated_at = NOW();

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS organization_id BIGINT REFERENCES organizations(organization_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS account_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS membership_id BIGINT REFERENCES organization_memberships(membership_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{"reorderStops":false,"skipStops":false,"addStops":false,"editStopDetails":false,"requestRouteChange":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;

UPDATE drivers d
SET organization_id = o.organization_id
FROM organizations o
WHERE d.organization_id IS NULL
  AND o.legacy_owner_user_id = d.user_id;

UPDATE drivers d
SET account_user_id = u.user_id
FROM users u
WHERE d.account_user_id IS NULL
  AND d.email IS NOT NULL
  AND LOWER(u.email) = LOWER(d.email);

INSERT INTO organization_memberships (organization_id, user_id, role, status)
SELECT DISTINCT d.organization_id, d.account_user_id, 'driver',
  CASE WHEN d.is_active THEN 'active' ELSE 'inactive' END
FROM drivers d
WHERE d.organization_id IS NOT NULL AND d.account_user_id IS NOT NULL
ON CONFLICT (organization_id, user_id) DO UPDATE
SET role = CASE
      WHEN organization_memberships.role = 'owner' THEN 'owner'
      ELSE 'driver'
    END,
    status = EXCLUDED.status,
    updated_at = NOW();

UPDATE drivers d
SET membership_id = om.membership_id
FROM organization_memberships om
WHERE d.membership_id IS NULL
  AND om.organization_id = d.organization_id
  AND om.user_id = d.account_user_id;

CREATE INDEX IF NOT EXISTS organization_memberships_user_active_idx
  ON organization_memberships (user_id, organization_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS drivers_organization_active_idx
  ON drivers (organization_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS drivers_organization_account_unique
  ON drivers (organization_id, account_user_id)
  WHERE account_user_id IS NOT NULL AND removed_at IS NULL;

CREATE OR REPLACE FUNCTION routefloww_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'organizations_touch_updated_at') THEN
    CREATE TRIGGER organizations_touch_updated_at
      BEFORE UPDATE ON organizations
      FOR EACH ROW EXECUTE FUNCTION routefloww_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'memberships_touch_updated_at') THEN
    CREATE TRIGGER memberships_touch_updated_at
      BEFORE UPDATE ON organization_memberships
      FOR EACH ROW EXECUTE FUNCTION routefloww_touch_updated_at();
  END IF;
END $$;

COMMIT;
