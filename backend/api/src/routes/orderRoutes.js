const express = require('express');
const router = express.Router();
const { addOrder, 
        editOrder, 
        deleteAllOrders, 
        deleteOrderById, 
        fetchOrders, 
        setVehiclePlacement, 
        getVehiclePlacementByOrderId, 
        addBulkOrders, 
        fetchOrdersByRoute,
        reorderOrders
 } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const { loadOrganizationContext } = require('../middleware/rbacMiddleware');

// All order APIs are protected
router.use(protect, loadOrganizationContext);

router.post('/add', addOrder);
router.put('/edit', editOrder);
router.delete('/delete/all', deleteAllOrders);
router.delete('/delete', deleteOrderById);
router.get('/fetch/all', fetchOrders);
router.get('/fetch', fetchOrdersByRoute);
router.post('/vehicleplace', setVehiclePlacement);
router.get('/vehicleplace', getVehiclePlacementByOrderId);
router.post('/add/bulk', addBulkOrders);
router.put('/reorder', reorderOrders);


module.exports = router;
