import Category from '../models/Category.js';

export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: 1 });
    return res.status(200).json(categories);
  } catch (err) {
    console.error(`getAllCategories error: ${err.message}`);
    return res.status(500).json({ message: 'Server error while fetching categories' });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, subcategories } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const category = await Category.create({
      name: name.trim(),
      subcategories: Array.isArray(subcategories)
        ? subcategories.map((s) => s.trim()).filter(Boolean)
        : [],
    });

    return res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A category with that name already exists' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    console.error(`createCategory error: ${err.message}`);
    return res.status(500).json({ message: 'Server error while creating category' });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { name, subcategories } = req.body;
    const update = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: 'Category name cannot be empty' });
      }
      update.name = name.trim();
    }
    if (subcategories !== undefined) {
      if (!Array.isArray(subcategories)) {
        return res.status(400).json({ message: 'subcategories must be an array' });
      }
      update.subcategories = subcategories.map((s) => s.trim()).filter(Boolean);
    }

    const category = await Category.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.status(200).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A category with that name already exists' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    console.error(`updateCategory error: ${err.message}`);
    return res.status(500).json({ message: 'Server error while updating category' });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    return res.status(200).json({ message: 'Category deleted' });
  } catch (err) {
    console.error(`deleteCategory error: ${err.message}`);
    return res.status(500).json({ message: 'Server error while deleting category' });
  }
};
