import Product from '../models/Product.js';
import { cleanupProductMedia } from '../utils/cloudinaryCleanup.js';

// A sale price of 0 (or blank/invalid) means "no sale" — saving it as a real price
// made the storefront show ₹0. Returns undefined when there is no valid sale.
const cleanSalePrice = (value) => {
  const n = Number(value);
  return value != null && value !== '' && Number.isFinite(n) && n > 0 ? n : undefined;
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// variants.sku is unique across the whole catalog. On a clash, tell the admin which
// SKU and which product already owns it instead of a generic 500.
const skuConflictResponse = async (err, res, selfId) => {
  const sku = err.keyValue?.['variants.sku'];
  if (!sku) return false;
  const other = await Product.findOne({ 'variants.sku': sku, ...(selfId && { _id: { $ne: selfId } }) }, 'title');
  const owner = other ? ` It is already used by "${other.title}".` : '';
  res.status(409).json({ message: `SKU "${sku}" is already in use.${owner} Each SKU must be unique across all products.` });
  return true;
};

export const getAllProducts = async (req, res) => {
  try {
    const { category, subcategory, size, search, sort, page, limit, bestSeller } = req.query;

    const filter = {};
    // Case-insensitive exact match — admin-entered category casing has drifted from
    // the storefront's filter labels before, silently zeroing out catalog results.
    if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    if (subcategory) filter.subcategory = new RegExp(`^${escapeRegex(subcategory)}$`, 'i');
    if (size) filter['variants.size'] = new RegExp(`^${escapeRegex(size)}( / .*)?$`, 'i');
    if (bestSeller === 'true') filter.isBestSeller = true;
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
    const {
      title,
      description,
      basePrice,
      salePrice,
      images,
      sizeChartUrls,
      lookbookVideo,
      category,
      subcategory,
      tags,
      variants,
      isBestSeller,
    } = req.body;

    const product = await Product.create({
      title,
      description,
      basePrice,
      salePrice: cleanSalePrice(salePrice),
      images,
      sizeChartUrls,
      lookbookVideo,
      category,
      subcategory,
      tags,
      variants,
      isBestSeller: !!isBestSeller,
    });

    return res.status(201).json(product);
  } catch (err) {
    console.error(`createProduct error: ${err.message}`);

    if (err.code === 11000 && (await skuConflictResponse(err, res))) return;

    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Server error while creating product' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Whitelisted so an admin edit can only touch real product fields — never
    // _id/createdAt/etc. `salePrice`/`lookbookVideo`/`subcategory` may be null
    // to clear them (an edit that removes a sale or the video must be able to).
    const editable = [
      'title',
      'description',
      'basePrice',
      'salePrice',
      'images',
      'sizeChartUrls',
      'lookbookVideo',
      'category',
      'subcategory',
      'tags',
      'variants',
      'isBestSeller',
    ];
    const set = {};
    const unset = {};
    for (const key of editable) {
      if (!(key in req.body)) continue;
      if (key === 'salePrice') {
        const sale = cleanSalePrice(req.body.salePrice);
        if (sale === undefined) unset.salePrice = 1;
        else set.salePrice = sale;
      } else if (req.body[key] === null) unset[key] = 1;
      else set[key] = req.body[key];
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { ...(Object.keys(set).length && { $set: set }), ...(Object.keys(unset).length && { $unset: unset }) },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (err) {
    console.error(`updateProduct error: ${err.message}`);

    if (err.code === 11000 && (await skuConflictResponse(err, res, req.params.id))) return;

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
