import express from 'express';
import { initializePayment, handleCashfreeWebhook } from '../controllers/paymentController.js';
import { protectRoute } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/checkout', protectRoute, initializePayment);
router.post('/webhook', handleCashfreeWebhook);

export default router;
