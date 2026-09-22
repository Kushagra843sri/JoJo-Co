import mongoose from 'mongoose';

// Deliberately independent of Product.category/subcategory (plain strings on
// that model, unchanged) — this exists so the admin can manage the taxonomy
// (add/rename/delete categories and their subcategories) without a code
// change, while products keep storing the category name as free text, same
// as before. Renaming a category here does NOT retroactively rename it on
// already-published products; that trade-off keeps writes here cheap and
// avoids a mass-update side effect on every rename.
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    subcategories: {
      type: [{ type: String, trim: true }],
      default: [],
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export default mongoose.model('Category', categorySchema);
