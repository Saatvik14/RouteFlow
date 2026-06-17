const express = require('express');
const router = express.Router();
const { fetchConfigurations  } = require('../controllers/configController');
const { protect } = require('../middleware/authMiddleware');

// All order APIs are protected
router.use(protect);

router.get('/fetch-config', fetchConfigurations);

module.exports = router;