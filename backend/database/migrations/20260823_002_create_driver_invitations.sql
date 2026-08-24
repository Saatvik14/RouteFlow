-- Creates driver_invitations for secure, expiring, single-use team invitations.
-- Depends on 20260823_001_create_organizations_and_organization_memberships.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS driver_invitations (
  invitation_id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  invited_by_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  email VARCHAR(320) NOT NULL,
  name VARCHAR(160) NOT NULL,
  role VARCHAR(24) NOT NULL DEFAULT 'driver',
  token_hash CHAR(64) NOT NULL UNIQUE,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  resent_at TIMESTAMPTZ,
  resent_from_invitation_id BIGINT REFERENCES driver_invitations(invitation_id) ON DELETE SET NULL,
  email_delivery_status VARCHAR(16) NOT NULL DEFAULT 'pending',
  email_last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT driver_invitations_role_check
    CHECK (role IN ('admin', 'dispatcher', 'driver', 'viewer')),
  CONSTRAINT driver_invitations_status_check
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked', 'resent')),
  CONSTRAINT driver_invitations_email_delivery_check
    CHECK (email_delivery_status IN ('pending', 'sent', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS driver_invitations_one_pending_email
  ON driver_invitations (organization_id, LOWER(email))
  WHERE status = 'pending';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'invitations_touch_updated_at') THEN
    CREATE TRIGGER invitations_touch_updated_at
      BEFORE UPDATE ON driver_invitations
      FOR EACH ROW EXECUTE FUNCTION routefloww_touch_updated_at();
  END IF;
END $$;

COMMIT;
