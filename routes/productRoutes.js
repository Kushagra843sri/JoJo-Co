import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { protectRoute, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAllProducts);
router.get('/:id', getProductById);

router.post('/', protectRoute, isAdmin, createProduct);
router.put('/:id', protectRoute, isAdmin, updateProduct);
router.delete('/:id', protectRoute, isAdmin, deleteProduct);

export default router;
