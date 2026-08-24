const test = require('node:test');
const assert = require('node:assert/strict');

const { createRateLimiter } = require('../api/src/middleware/rateLimitMiddleware');

test('invitation-style rate limiter blocks attempts after the configured limit', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2, keyGenerator: () => 'tenant:user' });
  const headers = {};
  const req = { ip: '127.0.0.1' };
  const res = { setHeader: (name, value) => { headers[name] = value; } };
  const errors = [];
  limiter(req, res, (error) => errors.push(error || null));
  limiter(req, res, (error) => errors.push(error || null));
  limiter(req, res, (error) => errors.push(error || null));
  assert.equal(errors[0], null);
  assert.equal(errors[1], null);
  assert.equal(errors[2].statusCode, 429);
  assert.equal(errors[2].code, 'RATE_LIMITED');
  assert.equal(headers['RateLimit-Remaining'], '0');
});
