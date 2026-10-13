import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Snapshot of the display name ("Ananya R.") so the review never exposes the full name/email.
    authorName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, trim: true, maxlength: 1000, default: '' },
    // Optional customer photos (Cloudinary image URLs, validated in the controller).
    photos: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

// One review per customer per product — resubmitting edits it.
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
