const { HttpError } = require('../utils/httpError');

const stores = new Set();

const createRateLimiter = ({ windowMs, max, keyGenerator, code = 'RATE_LIMITED' }) => {
  const attempts = new Map();
  stores.add(attempts);

  return (req, res, next) => {
    const now = Date.now();
    const key = String(keyGenerator?.(req) || req.ip || 'unknown');
    const existing = attempts.get(key);
    const entry = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : existing;

    entry.count += 1;
    attempts.set(key, entry);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
      return next(new HttpError(429, code, 'Too many attempts. Please wait and try again.'));
    }

    return next();
  };
};

// Prevent dormant keys from accumulating in a long-running process.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const store of stores) {
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }
}, 10 * 60 * 1000);
cleanupTimer.unref?.();

module.exports = { createRateLimiter };
