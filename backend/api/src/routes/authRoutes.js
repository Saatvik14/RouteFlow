const express = require('express');
const { signup, identify, login, refresh, checkHealth, sendOtpEmail, verifyOtp, adminDeleteUser, adminChangeUserRole } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { requirePlatformAdmin } = require('../middleware/rbacMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

const authLookupLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  code: 'AUTH_RATE_LIMITED',
  keyGenerator: (req) => `${req.ip}:${String(req.body?.identifier || '').trim().toLowerCase()}:lookup`,
});
const authAttemptLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  code: 'AUTH_RATE_LIMITED',
  keyGenerator: (req) => `${req.ip}:${String(req.body?.identifier || req.body?.email || '').trim().toLowerCase()}:attempt`,
});

router.get('/health', checkHealth);
router.post('/signup', authAttemptLimit, signup);
router.post('/send-otp', authAttemptLimit, sendOtpEmail);
router.post('/verify-otp', authAttemptLimit, verifyOtp);
router.post('/identify', authLookupLimit, identify);
router.post('/login', authAttemptLimit, login);
router.post('/refresh', refresh);

// Admin Helper Utility APIs
router.delete('/admin/delete-user', protect, requirePlatformAdmin, adminDeleteUser);
router.put('/admin/change-role', protect, requirePlatformAdmin, adminChangeUserRole);

// Example of a protected route
router.get('/profile', protect, (req, res) => res.json({ message: `Welcome ${req.user.name}, you are authorized!`, user: req.user }));

module.exports = router;
