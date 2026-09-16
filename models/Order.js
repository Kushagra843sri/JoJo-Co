import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: {
      size: { type: String, required: true },
      color: { type: String, required: true },
      sku: { type: String, required: true },
    },
    quantity: { type: Number, required: true, min: 1 },
    priceAtPurchase: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: String },
    country: { type: String, default: 'India' },
  },
  { _id: false }
);

const webhookLogSchema = new mongoose.Schema(
  {
    event: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now },
    payload: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },
    shippingAddress: shippingAddressSchema,
    financialSummary: {
      subtotal: { type: Number, required: true, min: 0 },
      shipping: { type: Number, required: true, min: 0, default: 0 },
      tax: { type: Number, required: true, min: 0, default: 0 },
      totalAmount: { type: Number, required: true, min: 0 },
    },
    cashfreeOrderId: { type: String, unique: true, sparse: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    fulfillmentStatus: {
      type: String,
      enum: ['processing', 'shipped', 'delivered', 'cancelled'],
      default: 'processing',
    },
    webhookLogs: [webhookLogSchema],
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

orderSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Order', orderSchema);
