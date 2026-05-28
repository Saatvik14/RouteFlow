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
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET);

      // Get user from the token
      const userResult = await runQuery(
        'SELECT user_id, name, phone_no, email, role, status FROM users WHERE user_id = $1',
        [decoded.id]
      );

      const user = userResult.rows[0];

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      req.user = user; // Attach user object to the request
      next();
    } catch (error) {
      console.error('JWT Verification Error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };