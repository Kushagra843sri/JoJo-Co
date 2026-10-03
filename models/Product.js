import mongoose from 'mongoose';

const imageGroupSchema = new mongoose.Schema(
  {
    // Legacy per-shade grouping. The storefront no longer has shades — every
    // group's photos are shown together — so new products use one 'Base' group.
    color: { type: String, trim: true, default: 'Base' },
    urls: [{ type: String, required: true }],
  },
  { _id: false }
);

// Optional short (~10s) lookbook clip, kept apart from `images` because every
// consumer of `images[].urls` renders an <img> — a video URL there would show
// as a broken image on cards, the cart, checkout, and order history.
const lookbookVideoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    posterUrl: { type: String, trim: true },
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    // The size label shoppers see and orders/stock match on: a letter size ("M"), a numeric
    // size ("30"), or both ("M / 30") — the admin form composes it from two columns.
    size: { type: String, required: true, trim: true },
    // Shades were removed from the storefront and admin; a variant is now just
    // size + SKU + stock. Kept optional (defaults to '') only so variants saved
    // before that change keep matching their existing orders and stock.
    color: { type: String, trim: true, default: '' },
    // Unused now (was the shade-card swatch); retained so old documents validate.
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
    // URLs (a subset of `images`) that are size charts rather than photos of the
    // clothes. Still shown in the product-page gallery, but kept off the home
    // page strip and used never as a cover photo.
    sizeChartUrls: [{ type: String, trim: true }],
    lookbookVideo: lookbookVideoSchema,
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
