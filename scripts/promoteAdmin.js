// Promotes an existing registered user to the 'admin' role.
//
// There is no separate "sign up as admin" flow by design — every /auth/register
// call always creates a 'customer' (see authController.js / User model default).
// An account must be registered through the site first, then flipped to admin
// here, so the very first admin still went through the same password-hashing
// path as everyone else.
//
// Usage: node backend/scripts/promoteAdmin.js someone@example.com

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node backend/scripts/promoteAdmin.js <email>');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set — check backend/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    console.error(`No user found with email "${email}". Register the account on the site first, then re-run this.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  if (user.role === 'admin') {
    console.log(`${user.email} is already an admin. Nothing to do.`);
  } else {
    user.role = 'admin';
    await user.save();
    console.log(`Promoted ${user.email} to admin.`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Promotion failed:', err);
  process.exit(1);
});
