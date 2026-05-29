const express = require('express');
const router = express.Router();
const { createRoute, fetchAllRoutes, fetchRouteById, editRoute } = require('../controllers/routeController');
const { protect } = require('../middleware/authMiddleware'); // Assuming this exists to verify JWT

// All route APIs are protected by authentication
router.use(protect);

router.post('/create', createRoute);
router.get('/fetch/all', fetchAllRoutes);
router.get('/fetch', fetchRouteById);
router.put('/edit', editRoute);

module.exports = router;