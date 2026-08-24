const express = require('express');
const router = express.Router();
const { fetchAllDrivers, createDriver, editDriver, deleteDriver } = require('../controllers/driverController');
const { protect } = require('../middleware/authMiddleware');
const { loadOrganizationContext, requireBusinessRole, requireOrganizationRoles } = require('../middleware/rbacMiddleware');
const { asyncHandler } = require('../utils/httpError');

router.use(protect, loadOrganizationContext);

router.get('/fetch-all', requireOrganizationRoles('owner', 'admin', 'dispatcher', 'viewer'), asyncHandler(fetchAllDrivers));
router.post('/create', requireBusinessRole, asyncHandler(createDriver));
router.put('/edit', requireBusinessRole, asyncHandler(editDriver));
router.delete('/delete', requireOrganizationRoles('owner', 'admin'), asyncHandler(deleteDriver));

module.exports = router;
