// Populates the catalog with demo products so the storefront (New Arrivals grid,
// catalog filters, product detail variant selectors) has real data to render
// instead of an empty "No products published yet" state.
//
// Images are placeholder stock photography (picsum.photos, seeded so each product
// gets a stable, repeatable picture) — NOT real product photography. Swap these
// out via the admin Product Publishing Terminal (Cloudinary upload) before this
// goes in front of the client's own customers.
//
// Run with: node backend/scripts/seedProducts.js
// Idempotent — re-running upserts by title rather than creating duplicates.

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from '../models/Product.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const placeholderImage = (seed, n) => `https://picsum.photos/seed/${seed}-${n}/900/1125`;

const products = [
  {
    title: 'Wool Overcoat',
    description:
      'A full-length overcoat cut from heavyweight virgin wool. Structured shoulders, a clean notch lapel, and a lining built to see out a full winter.',
    basePrice: 8900,
    category: 'Outerwear',
    subcategory: 'jackets',
    tags: ['new-arrival', 'winter', 'wool'],
    images: [
      { color: 'Charcoal', urls: [placeholderImage('wool-overcoat-charcoal', 1), placeholderImage('wool-overcoat-charcoal', 2)] },
      { color: 'Camel', urls: [placeholderImage('wool-overcoat-camel', 1), placeholderImage('wool-overcoat-camel', 2)] },
    ],
    variants: [
      { size: 'S', color: 'Charcoal', colorHex: '#36454f', sku: 'OC-WOOL-CHR-S', stock: 6 },
      { size: 'M', color: 'Charcoal', colorHex: '#36454f', sku: 'OC-WOOL-CHR-M', stock: 10 },
      { size: 'L', color: 'Charcoal', colorHex: '#36454f', sku: 'OC-WOOL-CHR-L', stock: 8 },
      { size: 'XL', color: 'Charcoal', colorHex: '#36454f', sku: 'OC-WOOL-CHR-XL', stock: 3 },
      { size: 'S', color: 'Camel', colorHex: '#c19a6b', sku: 'OC-WOOL-CAM-S', stock: 4 },
      { size: 'M', color: 'Camel', colorHex: '#c19a6b', sku: 'OC-WOOL-CAM-M', stock: 7 },
      { size: 'L', color: 'Camel', colorHex: '#c19a6b', sku: 'OC-WOOL-CAM-L', stock: 0 },
      { size: 'XL', color: 'Camel', colorHex: '#c19a6b', sku: 'OC-WOOL-CAM-XL', stock: 2 },
    ],
    isFeatured: true,
  },
  {
    title: 'Quilted Field Jacket',
    description:
      'A diamond-quilted field jacket with a brushed-cotton shell and corduroy collar. Built for cold mornings, light enough to layer under.',
    basePrice: 6400,
    salePrice: 5200,
    category: 'Outerwear',
    subcategory: 'jackets',
    tags: ['new-arrival', 'quilted'],
    images: [
      { color: 'Forest', urls: [placeholderImage('quilted-field-forest', 1), placeholderImage('quilted-field-forest', 2)] },
      { color: 'Black', urls: [placeholderImage('quilted-field-black', 1), placeholderImage('quilted-field-black', 2)] },
    ],
    variants: [
      { size: 'S', color: 'Forest', colorHex: '#2e4a35', sku: 'JK-QLT-FOR-S', stock: 5 },
      { size: 'M', color: 'Forest', colorHex: '#2e4a35', sku: 'JK-QLT-FOR-M', stock: 9 },
      { size: 'L', color: 'Forest', colorHex: '#2e4a35', sku: 'JK-QLT-FOR-L', stock: 6 },
      { size: 'M', color: 'Black', colorHex: '#14141a', sku: 'JK-QLT-BLK-M', stock: 12 },
      { size: 'L', color: 'Black', colorHex: '#14141a', sku: 'JK-QLT-BLK-L', stock: 4 },
      { size: 'XL', color: 'Black', colorHex: '#14141a', sku: 'JK-QLT-BLK-XL', stock: 1 },
    ],
    isFeatured: true,
  },
  {
    title: 'Merino Crew Sweater',
    description:
      'Full-grain merino crewneck, garment-dyed for depth of colour and pre-shrunk so the fit holds after washing.',
    basePrice: 3100,
    category: 'Knitwear',
    subcategory: 'crewnecks',
    tags: ['new-arrival', 'merino', 'essentials'],
    images: [
      { color: 'Oatmeal', urls: [placeholderImage('merino-crew-oatmeal', 1), placeholderImage('merino-crew-oatmeal', 2)] },
      { color: 'Navy', urls: [placeholderImage('merino-crew-navy', 1), placeholderImage('merino-crew-navy', 2)] },
    ],
    variants: [
      { size: 'S', color: 'Oatmeal', colorHex: '#d8cdb9', sku: 'KN-MER-OAT-S', stock: 14 },
      { size: 'M', color: 'Oatmeal', colorHex: '#d8cdb9', sku: 'KN-MER-OAT-M', stock: 20 },
      { size: 'L', color: 'Oatmeal', colorHex: '#d8cdb9', sku: 'KN-MER-OAT-L', stock: 15 },
      { size: 'XL', color: 'Oatmeal', colorHex: '#d8cdb9', sku: 'KN-MER-OAT-XL', stock: 6 },
      { size: 'S', color: 'Navy', colorHex: '#1b2a4a', sku: 'KN-MER-NVY-S', stock: 11 },
      { size: 'M', color: 'Navy', colorHex: '#1b2a4a', sku: 'KN-MER-NVY-M', stock: 18 },
      { size: 'L', color: 'Navy', colorHex: '#1b2a4a', sku: 'KN-MER-NVY-L', stock: 9 },
      { size: 'XL', color: 'Navy', colorHex: '#1b2a4a', sku: 'KN-MER-NVY-XL', stock: 0 },
    ],
    isFeatured: true,
  },
  {
    title: 'Cable Knit Cardigan',
    description:
      'A heavyweight cable-knit cardigan with horn buttons and patch pockets. Substantial enough to wear as outerwear on mild days.',
    basePrice: 4600,
    category: 'Knitwear',
    subcategory: 'cardigans',
    tags: ['new-arrival', 'cable-knit'],
    images: [{ color: 'Ivory', urls: [placeholderImage('cable-cardigan-ivory', 1), placeholderImage('cable-cardigan-ivory', 2)] }],
    variants: [
      { size: 'S', color: 'Ivory', colorHex: '#f2ede1', sku: 'KN-CBL-IVY-S', stock: 7 },
      { size: 'M', color: 'Ivory', colorHex: '#f2ede1', sku: 'KN-CBL-IVY-M', stock: 10 },
      { size: 'L', color: 'Ivory', colorHex: '#f2ede1', sku: 'KN-CBL-IVY-L', stock: 5 },
      { size: 'XL', color: 'Ivory', colorHex: '#f2ede1', sku: 'KN-CBL-IVY-XL', stock: 2 },
    ],
    isFeatured: true,
  },
  {
    title: 'Straight Leg Selvedge Jeans',
    description:
      'Japanese selvedge denim in a straight leg cut. Rigid on day one, breaks in to the wearer over the first month.',
    basePrice: 5200,
    category: 'Denim',
    tags: ['new-arrival', 'selvedge', 'denim'],
    images: [
      { color: 'Indigo', urls: [placeholderImage('selvedge-jeans-indigo', 1), placeholderImage('selvedge-jeans-indigo', 2)] },
      { color: 'Black', urls: [placeholderImage('selvedge-jeans-black', 1), placeholderImage('selvedge-jeans-black', 2)] },
    ],
    variants: [
      { size: 'S', color: 'Indigo', colorHex: '#2f3b73', sku: 'DN-SEL-IND-S', stock: 9 },
      { size: 'M', color: 'Indigo', colorHex: '#2f3b73', sku: 'DN-SEL-IND-M', stock: 16 },
      { size: 'L', color: 'Indigo', colorHex: '#2f3b73', sku: 'DN-SEL-IND-L', stock: 10 },
      { size: 'XL', color: 'Indigo', colorHex: '#2f3b73', sku: 'DN-SEL-IND-XL', stock: 3 },
      { size: 'M', color: 'Black', colorHex: '#14141a', sku: 'DN-SEL-BLK-M', stock: 8 },
      { size: 'L', color: 'Black', colorHex: '#14141a', sku: 'DN-SEL-BLK-L', stock: 5 },
    ],
    isFeatured: true,
  },
  {
    title: 'Oxford Cotton Shirt',
    description:
      'A button-down Oxford shirt in brushed cotton with a soft, structured collar roll. Equally at home under a blazer or on its own.',
    basePrice: 2400,
    category: 'Shirting',
    tags: ['new-arrival', 'oxford', 'essentials'],
    images: [
      { color: 'White', urls: [placeholderImage('oxford-shirt-white', 1), placeholderImage('oxford-shirt-white', 2)] },
      { color: 'Sky Blue', urls: [placeholderImage('oxford-shirt-sky', 1), placeholderImage('oxford-shirt-sky', 2)] },
    ],
    variants: [
      { size: 'S', color: 'White', colorHex: '#f5f5f2', sku: 'SH-OXF-WHT-S', stock: 18 },
      { size: 'M', color: 'White', colorHex: '#f5f5f2', sku: 'SH-OXF-WHT-M', stock: 24 },
      { size: 'L', color: 'White', colorHex: '#f5f5f2', sku: 'SH-OXF-WHT-L', stock: 16 },
      { size: 'XL', color: 'White', colorHex: '#f5f5f2', sku: 'SH-OXF-WHT-XL', stock: 7 },
      { size: 'S', color: 'Sky Blue', colorHex: '#a8c8e0', sku: 'SH-OXF-SKY-S', stock: 12 },
      { size: 'M', color: 'Sky Blue', colorHex: '#a8c8e0', sku: 'SH-OXF-SKY-M', stock: 19 },
      { size: 'L', color: 'Sky Blue', colorHex: '#a8c8e0', sku: 'SH-OXF-SKY-L', stock: 4 },
    ],
    isFeatured: true,
  },
  {
    title: 'Linen Resort Shirt',
    description:
      'An open-weave linen shirt with a camp collar, cut for warm weather. Garment-washed for a relaxed, lived-in drape.',
    basePrice: 2800,
    salePrice: 2100,
    category: 'Shirting',
    tags: ['new-arrival', 'linen', 'summer'],
    images: [{ color: 'Sage', urls: [placeholderImage('linen-resort-sage', 1), placeholderImage('linen-resort-sage', 2)] }],
    variants: [
      { size: 'S', color: 'Sage', colorHex: '#9caf88', sku: 'SH-LIN-SAG-S', stock: 10 },
      { size: 'M', color: 'Sage', colorHex: '#9caf88', sku: 'SH-LIN-SAG-M', stock: 14 },
      { size: 'L', color: 'Sage', colorHex: '#9caf88', sku: 'SH-LIN-SAG-L', stock: 8 },
      { size: 'XL', color: 'Sage', colorHex: '#9caf88', sku: 'SH-LIN-SAG-XL', stock: 0 },
    ],
    isFeatured: true,
  },
  {
    title: 'Full-Grain Leather Belt',
    description:
      'A 35mm belt in full-grain leather with a solid brass buckle. Cut long and trimmable to size by any cobbler.',
    basePrice: 1600,
    category: 'Accessories',
    tags: ['new-arrival', 'leather'],
    images: [
      { color: 'Brown', urls: [placeholderImage('leather-belt-brown', 1)] },
      { color: 'Black', urls: [placeholderImage('leather-belt-black', 1)] },
    ],
    variants: [
      { size: 'One Size', color: 'Brown', colorHex: '#6b4423', sku: 'AC-BLT-BRN-OS', stock: 22 },
      { size: 'One Size', color: 'Black', colorHex: '#14141a', sku: 'AC-BLT-BLK-OS', stock: 25 },
    ],
    isFeatured: true,
  },
  {
    // Deliberately ONE shared photo across every shade — this is the demo
    // product for the shade-card feature: `images` has a single group, so
    // ProductDetail can't find a dedicated photo for any of these colors and
    // falls back to live-tinting the base photo with each shade's colorHex
    // instead of requiring a reshoot per color.
    title: 'Oversized Grunge Tee',
    description:
      'Heavyweight oversized tee with a boxy drop-shoulder cut. One shirt, four shades — pick yours on the shade card and the preview updates instantly.',
    basePrice: 1400,
    category: 'Shirting',
    tags: ['new-arrival', 'oversized', 'alt-grunge'],
    images: [{ color: 'Base', urls: [placeholderImage('grunge-tee-base', 1), placeholderImage('grunge-tee-base', 2)] }],
    variants: [
      { size: 'S', color: 'Jet Black', colorHex: '#111114', sku: 'TS-GRG-BLK-S', stock: 20 },
      { size: 'M', color: 'Jet Black', colorHex: '#111114', sku: 'TS-GRG-BLK-M', stock: 26 },
      { size: 'L', color: 'Jet Black', colorHex: '#111114', sku: 'TS-GRG-BLK-L', stock: 18 },
      { size: 'XL', color: 'Jet Black', colorHex: '#111114', sku: 'TS-GRG-BLK-XL', stock: 9 },
      { size: 'S', color: 'Bone', colorHex: '#e8e2d6', sku: 'TS-GRG-BON-S', stock: 15 },
      { size: 'M', color: 'Bone', colorHex: '#e8e2d6', sku: 'TS-GRG-BON-M', stock: 21 },
      { size: 'L', color: 'Bone', colorHex: '#e8e2d6', sku: 'TS-GRG-BON-L', stock: 12 },
      { size: 'XL', color: 'Bone', colorHex: '#e8e2d6', sku: 'TS-GRG-BON-XL', stock: 5 },
      { size: 'S', color: 'Dust Pink', colorHex: '#c99a9a', sku: 'TS-GRG-DPK-S', stock: 10 },
      { size: 'M', color: 'Dust Pink', colorHex: '#c99a9a', sku: 'TS-GRG-DPK-M', stock: 14 },
      { size: 'L', color: 'Dust Pink', colorHex: '#c99a9a', sku: 'TS-GRG-DPK-L', stock: 7 },
      { size: 'S', color: 'Moss', colorHex: '#5c6b4f', sku: 'TS-GRG-MOS-S', stock: 8 },
      { size: 'M', color: 'Moss', colorHex: '#5c6b4f', sku: 'TS-GRG-MOS-M', stock: 13 },
      { size: 'L', color: 'Moss', colorHex: '#5c6b4f', sku: 'TS-GRG-MOS-L', stock: 6 },
      { size: 'XL', color: 'Moss', colorHex: '#5c6b4f', sku: 'TS-GRG-MOS-XL', stock: 0 },
    ],
    isFeatured: true,
  },
];

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set — check backend/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected to database: ${mongoose.connection.name}`);

  for (const product of products) {
    const result = await Product.findOneAndUpdate(
      { title: product.title },
      { $set: product },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    console.log(`Upserted: ${result.title} (${result._id})`);
  }

  console.log(`\nDone — ${products.length} products seeded.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
