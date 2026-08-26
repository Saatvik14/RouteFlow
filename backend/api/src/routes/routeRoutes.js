const express = require('express');
const router = express.Router();
const { createRoute, fetchAllRoutes, fetchRouteById, editRoute, geocodeAddress, autocompleteAddress, getPlaceDetails, optimizeRoute, cancelRoute, reverseGeocode } = require('../controllers/routeController');
const { protect } = require('../middleware/authMiddleware'); // Assuming this exists to verify JWT
const { loadOrganizationContext } = require('../middleware/rbacMiddleware');

// All route APIs are protected by authentication
router.use(protect, loadOrganizationContext);

router.post('/create', createRoute);
router.get('/fetch/all', fetchAllRoutes);
router.get('/fetch', fetchRouteById);
router.put('/edit', editRoute);
router.post('/geocode', geocodeAddress);
router.get('/autocomplete', autocompleteAddress);
router.get('/place-details', getPlaceDetails);
router.post('/optimize', optimizeRoute);
router.patch('/cancel', cancelRoute);
router.get('/reverse-geocode', reverseGeocode);

module.exports = router;
