const jwt = require('jsonwebtoken');
const { runQuery } = require('../config/db');
const { JWT_ACCESS_SECRET } = require('../config/env');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      if (!JWT_ACCESS_SECRET) {
        console.error('JWT access secret is not configured.');
        return res.status(503).json({ message: 'Authentication is temporarily unavailable.' });
      }

      const decoded = jwt.verify(token, JWT_ACCESS_SECRET);

      // Get user from the token with subscription_type from config_model
      const userResult = await runQuery(
        `SELECT u.user_id, u.name, u.phone_no, u.email, u.role, u.status, u.created_at,
                COALESCE(cm.subscription_type, 'trial') AS subscription_type,
                EXISTS (
                  SELECT 1
                  FROM organization_memberships om
                  JOIN drivers d ON d.membership_id = om.membership_id
                  WHERE om.user_id = u.user_id
                    AND om.role = 'driver'
                    AND om.status = 'active'
                    AND d.is_active = TRUE
                    AND d.removed_at IS NULL
                ) AS has_active_fleet_access
         FROM users u
         LEFT JOIN config_model cm ON cm.user_id = u.user_id
         WHERE u.user_id = $1`,
        [decoded.id]
      );
      const user = userResult.rows[0];

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      if (String(user.status || '').toLowerCase() !== 'active') {
        return res.status(403).json({ message: 'This account is inactive.' });
      }

      if (String(user.role || '').toUpperCase() === 'FLEET_DRIVER' && !user.has_active_fleet_access) {
        return res.status(403).json({ message: 'This driver account is inactive.' });
      }

      req.user = user; // Attach user object to the request
      next();
    } catch (error) {

      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
