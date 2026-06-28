const express = require('express');
const router = express.Router();
const { submitSupport } = require('../controllers/supportController');
const { protect } = require('../middleware/authMiddleware');

// Require authentication for submitting support (uses logged in user's email when available)
router.post('/submit', protect, submitSupport);

module.exports = router;
