// Migrates the taxonomy that used to live as a hardcoded constant
// (frontend/src/constants/taxonomy.js) into the database, now that
// categories/subcategories are admin-managed via the Category model instead
// of a fixed list. Run once when deploying the category-management feature.
//
// Idempotent — upserts by name, safe to re-run.
// Usage: node backend/scripts/seedCategories.js

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Category from '../models/Category.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const categories = [
  { name: 'Outerwear', subcategories: ['Jackets', 'Coats', 'Overcoats', 'Vests'] },
  { name: 'Knitwear', subcategories: ['Crewnecks', 'Cardigans', 'Sweaters', 'Turtlenecks'] },
  { name: 'Denim', subcategories: ['Jeans', 'Denim Jackets', 'Denim Shorts'] },
  { name: 'Shirting', subcategories: ['Shirts', 'Oxford Shirts', 'Resort Shirts'] },
  { name: 'Accessories', subcategories: ['Belts', 'Caps', 'Scarves', 'Bags'] },
  { name: 'Upperwear', subcategories: ['T-Shirt', 'Top', 'Shirt', 'Hoodie', 'Sweatshirt'] },
  { name: 'Bottomwear', subcategories: ['Jeans', 'Trousers', 'Shorts', 'Joggers', 'Cargo Pants'] },
  { name: 'Winter Collection', subcategories: ['Sweaters', 'Jackets', 'Thermals', 'Mufflers'] },
];

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set — check backend/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected to database: ${mongoose.connection.name}`);

  for (const category of categories) {
    const result = await Category.findOneAndUpdate(
      { name: category.name },
      { $set: category },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    console.log(`Upserted: ${result.name} (${result._id})`);
  }

  console.log(`\nDone — ${categories.length} categories seeded.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
