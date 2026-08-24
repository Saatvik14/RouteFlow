-- Ensures every independent driver owns a private tenant workspace.
-- This keeps legacy route, order and driver operations available after tenant scoping.

BEGIN;

INSERT INTO organizations (name, legacy_owner_user_id)
SELECT
  CONCAT(COALESCE(NULLIF(BTRIM(u.name), ''), 'RouteFloww'), '''s workspace'),
  u.user_id
FROM users u
WHERE UPPER(COALESCE(u.role, '')) IN ('INDEPENDENT_DRIVER', 'BUSINESS_OWNER')
ON CONFLICT (legacy_owner_user_id) DO NOTHING;

INSERT INTO organization_memberships (organization_id, user_id, role, status)
SELECT o.organization_id, o.legacy_owner_user_id, 'owner', 'active'
FROM organizations o
JOIN users u ON u.user_id = o.legacy_owner_user_id
WHERE UPPER(COALESCE(u.role, '')) IN ('INDEPENDENT_DRIVER', 'BUSINESS_OWNER')
ON CONFLICT (organization_id, user_id) DO UPDATE
SET role = 'owner',
    status = 'active',
    deactivated_at = NULL,
    removed_at = NULL,
    updated_at = NOW();

COMMIT;
