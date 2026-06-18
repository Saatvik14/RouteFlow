const express = require('express');
const { signup, login, refresh, checkHealth, sendOtpEmail, verifyOtp } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/health', checkHealth);
router.post('/signup', signup);
router.post('/send-otp', sendOtpEmail);
router.post('/verify-otp', verifyOtp);
router.post('/login', login);
router.post('/refresh', refresh);

// Example of a protected route
router.get('/profile', protect, (req, res) => res.json({ message: `Welcome ${req.user.name}, you are authorized!`, user: req.user }));

module.exports = router;