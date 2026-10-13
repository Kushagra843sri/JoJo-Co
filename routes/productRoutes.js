import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { getProductReviews, upsertReview, deleteReview } from '../controllers/reviewController.js';
import { protectRoute, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.get('/:id/reviews', getProductReviews);
router.post('/:id/reviews', protectRoute, upsertReview);
router.delete('/:id/reviews/:reviewId', protectRoute, deleteReview);

router.post('/', protectRoute, isAdmin, createProduct);
router.put('/:id', protectRoute, isAdmin, updateProduct);
router.delete('/:id', protectRoute, isAdmin, deleteProduct);

export default router;
