const { HttpError } = require('./httpError');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const requireString = (value, field, { min = 1, max = 500 } = {}) => {
  const normalized = String(value ?? '').trim();
  if (normalized.length < min || normalized.length > max) {
    throw new HttpError(400, 'VALIDATION_ERROR', `${field} must be between ${min} and ${max} characters.`, { field });
  }
  return normalized;
};

const normalizeEmail = (value) => {
  const email = String(value ?? '').trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Please enter a valid email address.', { field: 'email' });
  }
  return email;
};

const positiveInteger = (value, field) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new HttpError(400, 'VALIDATION_ERROR', `${field} must be a positive integer.`, { field });
  }
  return parsed;
};

const optionalCoordinate = (value, field, minimum, maximum) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new HttpError(400, 'VALIDATION_ERROR', `${field} is invalid.`, { field });
  }
  return parsed;
};

const optionalIsoDate = (value, field) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, 'VALIDATION_ERROR', `${field} must be an ISO-8601 timestamp.`, { field });
  }
  return date;
};

module.exports = {
  EMAIL_PATTERN,
  normalizeEmail,
  optionalCoordinate,
  optionalIsoDate,
  positiveInteger,
  requireString,
};
