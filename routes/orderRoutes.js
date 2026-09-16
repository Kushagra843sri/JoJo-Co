import express from 'express';
import { getAllOrders, getMyOrders, updateOrderStatus } from '../controllers/orderController.js';
import { protectRoute, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/my', protectRoute, getMyOrders);
router.get('/', protectRoute, isAdmin, getAllOrders);
router.patch('/:id/status', protectRoute, isAdmin, updateOrderStatus);

export default router;
