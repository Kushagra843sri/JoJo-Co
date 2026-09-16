import mongoose from 'mongoose';

const imageGroupSchema = new mongoose.Schema(
  {
    color: { type: String, required: true, trim: true },
    urls: [{ type: String, required: true }],
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    size: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    // Drives the shade-card swatch on the product page and (when no dedicated
    // photo exists for this color in `images`) a live CSS tint over the base
    // product photo — lets one photo stand in for every shade instead of
    // requiring a reshoot per color. Optional so older/seeded variants without
    // it just fall back to a plain gray swatch and no tint.
    colorHex: {
      type: String,
      trim: true,
      match: [/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'colorHex must be a valid hex color, e.g. #1a1a1a'],
    },
    sku: { type: String, required: true, trim: true, uppercase: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    basePrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    images: [imageGroupSchema],
    category: { type: String, required: true, trim: true },
    subcategory: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    variants: [variantSchema],
    isFeatured: { type: Boolean, default: false },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

productSchema.index({ 'variants.sku': 1 }, { unique: true, sparse: true });
productSchema.index({ category: 1 });
productSchema.index({ category: 1, subcategory: 1 });

export default mongoose.model('Product', productSchema);
