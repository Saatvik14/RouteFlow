const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/httpError');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.use(protect);

router.get('/', asyncHandler(notificationController.listNotifications));
router.patch('/:id/read', asyncHandler(notificationController.markAsRead));
router.post('/read-all', asyncHandler(notificationController.markAllAsRead));
router.post('/push-token', asyncHandler(notificationController.registerPushToken));
router.delete('/push-token', asyncHandler(notificationController.unregisterPushToken));

module.exports = router;
