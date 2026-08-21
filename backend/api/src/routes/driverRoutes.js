const express = require('express');
const router = express.Router();
const { fetchAllDrivers, createDriver, editDriver, deleteDriver } = require('../controllers/driverController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/fetch-all', fetchAllDrivers);
router.post('/create', createDriver);
router.put('/edit', editDriver);
router.delete('/delete', deleteDriver);

module.exports = router;
