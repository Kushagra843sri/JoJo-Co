// Changes an existing user's email and/or password directly in the database.
//
// There is no "change email" or "change password" feature in the app itself —
// PATCH /auth/profile only touches name and shippingAddress (see
// authController.js). This exists for the admin account specifically: when the
// client wants their admin login's email/password changed, this is how, without
// hand-typing a bcrypt hash into Atlas (which would just fail to log in).
//
// Usage:
//   node backend/scripts/updateCredentials.js <current-email> --email new@example.com
//   node backend/scripts/updateCredentials.js <current-email> --password NewPassword123
//   node backend/scripts/updateCredentials.js <current-email> --email new@example.com --password NewPassword123

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

function parseArgs(argv) {
  const [currentEmail, ...rest] = argv;
  const result = { currentEmail, newEmail: null, newPassword: null };

  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i] === '--email') {
      result.newEmail = rest[i + 1];
      i += 1;
    } else if (rest[i] === '--password') {
      result.newPassword = rest[i + 1];
      i += 1;
    }
  }
  return result;
}

async function run() {
  const { currentEmail, newEmail, newPassword } = parseArgs(process.argv.slice(2));

  if (!currentEmail || (!newEmail && !newPassword)) {
    console.error(
      'Usage: node backend/scripts/updateCredentials.js <current-email> [--email new@example.com] [--password NewPassword]'
    );
    process.exit(1);
  }
  if (newPassword && newPassword.length < 8) {
    console.error('New password must be at least 8 characters (same rule the register form enforces).');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set — check backend/.env');
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  const user = await User.findOne({ email: currentEmail.toLowerCase().trim() });
  if (!user) {
    console.error(`No user found with email "${currentEmail}".`);
    await mongoose.disconnect();
    process.exit(1);
  }

  if (newEmail) {
    const normalizedNewEmail = newEmail.toLowerCase().trim();
    const clash = await User.findOne({ email: normalizedNewEmail, _id: { $ne: user._id } });
    if (clash) {
      console.error(`"${normalizedNewEmail}" is already in use by another account.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    user.email = normalizedNewEmail;
  }

  if (newPassword) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
  }

  await user.save();

  console.log(`Updated ${currentEmail}:`);
  if (newEmail) console.log(`  email -> ${user.email}`);
  if (newPassword) console.log('  password -> (changed)');
  console.log('\nNote: this account stays logged in wherever it already has a valid session cookie.');
  console.log('If the credentials were compromised, also log out everywhere by rotating JWT_SECRET.');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Update failed:', err);
  process.exit(1);
});
