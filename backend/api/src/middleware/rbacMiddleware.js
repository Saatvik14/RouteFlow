const { runQuery } = require('../config/db');
const { BUSINESS_ROLES } = require('../constants/enterprise');
const { HttpError } = require('../utils/httpError');

const loadOrganizationContext = async (req, _res, next) => {
  try {
    const requestedOrganizationId =
      req.headers['x-organization-id'] ||
      req.params.organizationId ||
      req.query.organizationId;

    const values = [req.user.user_id];
    let organizationFilter = '';

    if (requestedOrganizationId !== undefined) {
      const parsedOrganizationId = Number(requestedOrganizationId);
      if (!Number.isInteger(parsedOrganizationId) || parsedOrganizationId < 1) {
        throw new HttpError(400, 'INVALID_ORGANIZATION', 'A valid organization ID is required.');
      }
      values.push(parsedOrganizationId);
      organizationFilter = 'AND om.organization_id = $2';
    }

    const result = await runQuery(
      `
        SELECT
          om.membership_id,
          om.organization_id,
          om.role,
          om.status,
          om.permissions,
          o.name AS organization_name,
          o.settings AS organization_settings
        FROM organization_memberships om
        JOIN organizations o ON o.organization_id = om.organization_id
        WHERE om.user_id = $1
          AND om.status = 'active'
          ${organizationFilter}
        ORDER BY
          CASE om.role
            WHEN 'owner' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'dispatcher' THEN 3
            WHEN 'driver' THEN 4
            ELSE 5
          END,
          om.created_at ASC
        LIMIT 1
      `,
      values
    );

    if (result.rows.length === 0) {
      throw new HttpError(403, 'ORGANIZATION_ACCESS_DENIED', 'You do not have access to this business.');
    }

    req.organization = {
      id: Number(result.rows[0].organization_id),
      name: result.rows[0].organization_name,
      settings: result.rows[0].organization_settings || {},
    };
    req.membership = result.rows[0];
    next();
  } catch (error) {
    next(error);
  }
};

const requireOrganizationRoles = (...allowedRoles) => (req, _res, next) => {
  if (!req.membership || !allowedRoles.includes(req.membership.role)) {
    return next(new HttpError(403, 'PERMISSION_DENIED', 'You do not have permission to perform this action.'));
  }
  return next();
};

const requireBusinessRole = requireOrganizationRoles(...BUSINESS_ROLES);

const requirePlatformAdmin = (req, _res, next) => {
  Temporary bypass for admin check:
    if (String(req.user?.role || '').toUpperCase() !== 'PLATFORM_ADMIN') {
      return next(new HttpError(403, 'PLATFORM_ADMIN_REQUIRED', 'Platform administrator access is required.'));
    }
  return next();
};

module.exports = {
  loadOrganizationContext,
  requireBusinessRole,
  requireOrganizationRoles,
  requirePlatformAdmin,
};
