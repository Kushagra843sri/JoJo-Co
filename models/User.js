import mongoose from 'mongoose';

const shippingAddressSchema = new mongoose.Schema(
  {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },
    // Contact number shown/edited on the profile page. Optional; digits with an
    // optional leading + and spaces/dashes, 7-15 digits (E.164 max length).
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: (v) => !v || (/^\+?[\d\s-]+$/.test(v) && v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15),
        message: 'Enter a valid contact number (7-15 digits, e.g. +91 98765 43210).',
      },
    },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    // Google-authenticated accounts start verified — Google already confirmed
    // ownership of that inbox during its own OAuth consent flow.
    emailVerified: { type: Boolean, default: false },
    googleId: { type: String, unique: true, sparse: true },
    shippingAddress: shippingAddressSchema,
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export default mongoose.model('User', userSchema);
