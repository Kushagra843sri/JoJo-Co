import Product from '../models/Product.js';
import { cleanupProductMedia } from '../utils/cloudinaryCleanup.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getAllProducts = async (req, res) => {
  try {
    const { category, size, search, sort, page, limit } = req.query;

    const filter = {};
    // Case-insensitive exact match — admin-entered category casing has drifted from
    // the storefront's filter labels before, silently zeroing out catalog results.
    if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    if (size) filter['variants.size'] = size;
    if (search) filter.title = { $regex: escapeRegex(search), $options: 'i' };

    const sortOption = {};
    if (sort === 'asc') sortOption.basePrice = 1;
    if (sort === 'desc') sortOption.basePrice = -1;
    if (sort === 'newest') sortOption.createdAt = -1;

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageLimit = Math.min(parseInt(limit, 10) || 12, 50);
    const skip = (currentPage - 1) * pageLimit;

    const [products, totalProducts] = await Promise.all([
      Product.find(filter).sort(sortOption).skip(skip).limit(pageLimit),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      products,
      page: currentPage,
      totalPages: Math.ceil(totalProducts / pageLimit),
      totalProducts,
    });
  } catch (err) {
    console.error(`getAllProducts error: ${err.message}`);
    return res.status(500).json({ message: 'Server error while fetching products' });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (err) {
    console.error(`getProductById error: ${err.message}`);

    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(500).json({ message: 'Server error while fetching product' });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { title, description, basePrice, salePrice, images, lookbookVideo, category, subcategory, tags, variants } =
      req.body;

    const product = await Product.create({
      title,
      description,
      basePrice,
      salePrice,
      images,
      lookbookVideo,
      category,
      subcategory,
      tags,
      variants,
    });

    return res.status(201).json(product);
  } catch (err) {
    console.error(`createProduct error: ${err.message}`);

    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Server error while creating product' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (err) {
    console.error(`updateProduct error: ${err.message}`);

    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Server error while updating product' });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await cleanupProductMedia(product);

    return res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(`deleteProduct error: ${err.message}`);

    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(500).json({ message: 'Server error while deleting product' });
  }
};
