const express = require('express');
const router = express.Router();
const { addOrder, editOrder, deleteAllOrders, deleteOrderById, fetchOrders } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// All order APIs are protected
router.use(protect);

router.post('/add', addOrder);
router.put('/edit', editOrder);
router.delete('/delete/all', deleteAllOrders);
router.delete('/delete', deleteOrderById);
router.get('/fetch', fetchOrders);

module.exports = router;