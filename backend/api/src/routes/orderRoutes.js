const express = require('express');
const router = express.Router();
const { addOrder, editOrder, deleteAllOrders, deleteOrderById, fetchOrders, setVehiclePlacement, getVehiclePlacementByOrderId, addBulkOrders } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// All order APIs are protected
router.use(protect);

router.post('/add', addOrder);
router.put('/edit', editOrder);
router.delete('/delete/all', deleteAllOrders);
router.delete('/delete', deleteOrderById);
router.get('/fetch', fetchOrders);
router.post('/vehicleplace', setVehiclePlacement);
router.get('/vehicleplace', getVehiclePlacementByOrderId);
router.post('/add/bulk', addBulkOrders);

module.exports = router;