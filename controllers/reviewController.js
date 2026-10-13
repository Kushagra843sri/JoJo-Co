import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import { destroyCloudinaryAssets } from '../utils/cloudinaryCleanup.js';

const MAX_PHOTOS = 3;

// Photos are uploaded straight to Cloudinary from the browser (unsigned preset),
// so only accept image URLs that really live on our Cloudinary account.
const isOwnCloudinaryImage = (url) => {
  if (typeof url !== 'string' || url.length > 500) return false;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  // Without the env var (local dev) fall back to any Cloudinary image URL.
  return cloud
    ? url.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`)
    : /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url);
};

// "Ananya Raj Sharma" -> "Ananya S."
const displayName = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Customer';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
};

const refreshProductRating = async (productId) => {
  const [stats] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, avg: { $avg: '$rating' } } },
  ]);
  await Product.findByIdAndUpdate(productId, { averageRating: stats ? Math.round(stats.avg * 10) / 10 : 0 });
};

export const getProductReviews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: 'Product not found' });

    const reviews = await Review.find({ product: id }).sort({ createdAt: -1 }).limit(100).lean();
    const count = reviews.length;
    const averageRating = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;

    return res.status(200).json({
      reviews: reviews.map(({ _id, authorName, rating, text, photos, createdAt, user }) => ({
        _id,
        authorName,
        rating,
        text,
        photos,
        createdAt,
        // Lets the client show Edit/Delete on the viewer's own review without exposing user ids' meaning.
        user,
      })),
      count,
      averageRating,
    });
  } catch (err) {
    console.error(`getProductReviews error: ${err.message}`);
    return res.status(500).json({ message: 'Server error while fetching reviews' });
  }
};

export const upsertReview = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ message: 'Product not found' });

    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Please choose a star rating from 1 to 5.' });
    }

    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (text.length > 1000) {
      return res.status(400).json({ message: 'Review is too long (max 1000 characters).' });
    }

    const photos = Array.isArray(req.body.photos) ? [...new Set(req.body.photos)] : [];
    if (photos.length > MAX_PHOTOS) {
      return res.status(400).json({ message: `You can add up to ${MAX_PHOTOS} photos.` });
    }
    if (!photos.every(isOwnCloudinaryImage)) {
      return res.status(400).json({ message: 'Invalid photo upload.' });
    }

    const product = await Product.findById(id).select('_id');
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const existing = await Review.findOne({ product: id, user: req.user._id });
    const review = await Review.findOneAndUpdate(
      { product: id, user: req.user._id },
      { rating, text, photos, authorName: displayName(req.user.name) },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    // Photos the customer dropped while editing should not linger on Cloudinary.
    if (existing) {
      const removed = existing.photos.filter((url) => !photos.includes(url));
      if (removed.length) destroyCloudinaryAssets(removed);
    }

    await refreshProductRating(id);
    return res.status(existing ? 200 : 201).json(review);
  } catch (err) {
    console.error(`upsertReview error: ${err.message}`);
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    return res.status(500).json({ message: 'Server error while saving review' });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { id, reviewId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(reviewId)) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const review = await Review.findOne({ _id: reviewId, product: id });
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const isOwner = review.user.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own review' });
    }

    await review.deleteOne();
    if (review.photos.length) destroyCloudinaryAssets(review.photos);
    await refreshProductRating(id);
    return res.status(200).json({ message: 'Review deleted' });
  } catch (err) {
    console.error(`deleteReview error: ${err.message}`);
    return res.status(500).json({ message: 'Server error while deleting review' });
  }
};
