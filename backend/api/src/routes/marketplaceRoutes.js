const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');
const { asyncHandler } = require('../utils/httpError');
const marketplace = require('../controllers/marketplaceController');

const router = express.Router();
const bidLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  code: 'MARKETPLACE_BID_RATE_LIMITED',
  keyGenerator: (req) => `${req.user?.user_id || req.ip}:marketplace-bid`,
});

router.use(protect);
router.get('/summary', asyncHandler(marketplace.getSummary));
router.get('/routes', asyncHandler(marketplace.listAvailableRoutes));
router.get('/bids/mine', asyncHandler(marketplace.listMyBids));
router.post('/routes/:routeId/bids', bidLimit, asyncHandler(marketplace.placeBid));
router.patch('/bids/:bidId/withdraw', asyncHandler(marketplace.withdrawBid));
router.get('/business/routes', asyncHandler(marketplace.listBusinessListings));
router.get('/business/routes/:routeId/bids', asyncHandler(marketplace.listRouteBids));
router.post('/business/bids/:bidId/accept', asyncHandler(marketplace.acceptBid));
router.post('/business/routes/:routeId/close', asyncHandler(marketplace.closeListing));

// Fleet Driver Pool & Opt-In Routes
router.get('/fleet/routes', asyncHandler(marketplace.listFleetPoolRoutes));
router.post('/fleet/routes/:routeId/respond', asyncHandler(marketplace.respondToFleetRoute));
router.get('/fleet/business/routes', asyncHandler(marketplace.listBusinessFleetListings));
router.get('/fleet/business/routes/:routeId/opt-ins', asyncHandler(marketplace.listRouteOptIns));
router.post('/fleet/business/routes/:routeId/select-driver', asyncHandler(marketplace.selectDriverForRoute));
router.post('/fleet/business/routes/:routeId/close', asyncHandler(marketplace.closeListing));

module.exports = router;
