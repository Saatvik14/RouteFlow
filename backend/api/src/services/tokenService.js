const jwt = require('jsonwebtoken');
const {
  JWT_ACCESS_EXPIRES_IN,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_EXPIRES_IN,
  JWT_REFRESH_SECRET,
} = require('../config/env');

const assertSecrets = () => {
  if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
    const error = new Error('JWT secrets are not configured.');
    error.code = 'AUTH_CONFIGURATION_ERROR';
    throw error;
  }
};

const generateAccessToken = ({ user_id, email, role, name }) => {
  assertSecrets();
  return jwt.sign(
    { id: user_id, email, role, name },
    JWT_ACCESS_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRES_IN }
  );
};

const generateRefreshToken = (userId) => {
  assertSecrets();
  return jwt.sign({ id: userId }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
};

module.exports = { generateAccessToken, generateRefreshToken };
