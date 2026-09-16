import express from 'express';
import { getWishlist, addToWishlist, removeFromWishlist } from '../controllers/userController.js';
import { protectRoute } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/wishlist', protectRoute, getWishlist);
router.post('/wishlist/:productId', protectRoute, addToWishlist);
router.delete('/wishlist/:productId', protectRoute, removeFromWishlist);

export default router;
