import express from 'express';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { protectRoute, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getAllCategories);

router.post('/', protectRoute, isAdmin, createCategory);
router.patch('/:id', protectRoute, isAdmin, updateCategory);
router.delete('/:id', protectRoute, isAdmin, deleteCategory);

export default router;
