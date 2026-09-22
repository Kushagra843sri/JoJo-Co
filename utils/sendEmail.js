import { Resend } from 'resend';
import jwt from 'jsonwebtoken';

// Lazily constructed — RESEND_API_KEY may be a placeholder/unset in local dev,
// and `new Resend(undefined)` shouldn't crash server boot; it should just fail
// (loudly, once) the first time something actually tries to send.
let resendClient = null;
const getResendClient = () => {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
};

// Without a verified sending domain in the Resend dashboard, the default
// onboarding@resend.dev sender can only deliver to the email address the
// Resend account itself was signed up with — fine for local testing, NOT
// sufficient to email real customers. See PRODUCTION_DEPLOYMENT.md.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'JOJO&CO <onboarding@resend.dev>';

export const generateEmailVerificationToken = (userId) =>
  jwt.sign({ userId, purpose: 'verify-email' }, process.env.JWT_SECRET, { expiresIn: '1d' });

// Stateless reset tokens (no DB column, no extra query to invalidate one) —
// the trick is signing in a fragment of the CURRENT password hash. Once the
// password actually changes (via this reset or any other path), that
// fragment no longer matches, so the token silently stops working on its
// own — closing the usual "old reset link still works after you already
// used it" replay gap without a passwordResetUsed/expiresAt schema field.
export const generatePasswordResetToken = (user) =>
  jwt.sign(
    { userId: user._id, purpose: 'reset-password', pwFingerprint: user.password ? user.password.slice(-12) : null },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

export const sendVerificationEmail = async (user) => {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('temp-placeholder')) {
    console.warn(
      `RESEND_API_KEY not configured — skipping verification email for ${user.email}. ` +
        'Set a real key in backend/.env to send it for real.'
    );
    return;
  }

  const token = generateEmailVerificationToken(user._id);
  const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

  try {
    await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: 'Verify your email — JOJO&CO',
      html: `
        <p>Hi ${user.name},</p>
        <p>Welcome to JOJO&CO. Please confirm this is your email address to finish setting up your account:</p>
        <p><a href="${verifyUrl}">Verify my email</a></p>
        <p>This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
      `,
    });
  } catch (err) {
    // A failed send should never block registration itself — the account still
    // works, they just stay unverified until they use the "resend" option.
    console.error(`Failed to send verification email to ${user.email}: ${err.message}`);
  }
};

// order must already have items.product populated with at least `title`.
export const sendNewOrderNotificationEmail = async (order) => {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

  if (!adminEmail) {
    console.warn('ADMIN_NOTIFICATION_EMAIL not configured — skipping new-order notification email.');
    return;
  }

  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('temp-placeholder')) {
    console.warn(
      `RESEND_API_KEY not configured — skipping new-order notification email for order ${order.razorpayOrderId}.`
    );
    return;
  }

  const itemsHtml = order.items
    .map(
      (item) =>
        `<li>${item.quantity} × ${item.product?.title || 'Unknown product'} (${item.variant.size} / ${item.variant.color})</li>`
    )
    .join('');

  const addr = order.shippingAddress;

  try {
    await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: `New paid order — ${order.razorpayOrderId}`,
      html: `
        <p>A new order has been paid and needs fulfillment.</p>
        <p><strong>Order ID:</strong> ${order.razorpayOrderId}<br/>
        <strong>Total:</strong> ₹${order.financialSummary.totalAmount}</p>
        <p><strong>Items:</strong></p>
        <ul>${itemsHtml}</ul>
        <p><strong>Deliver to:</strong><br/>
        ${addr.fullName}<br/>
        ${addr.phone}<br/>
        ${addr.street || ''}<br/>
        ${addr.city || ''}, ${addr.state || ''} ${addr.zip || ''}<br/>
        ${addr.country || ''}</p>
      `,
    });
  } catch (err) {
    console.error(`Failed to send new-order notification email for ${order.razorpayOrderId}: ${err.message}`);
  }
};

export const sendPasswordResetEmail = async (user) => {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.startsWith('temp-placeholder')) {
    console.warn(
      `RESEND_API_KEY not configured — skipping password reset email for ${user.email}. ` +
        'Set a real key in backend/.env to send it for real.'
    );
    return;
  }

  const token = generatePasswordResetToken(user);
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  try {
    await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: 'Reset your password — JOJO&CO',
      html: `
        <p>Hi ${user.name},</p>
        <p>We received a request to reset your JOJO&CO password. Click below to choose a new one:</p>
        <p><a href="${resetUrl}">Reset my password</a></p>
        <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>
      `,
    });
  } catch (err) {
    console.error(`Failed to send password reset email to ${user.email}: ${err.message}`);
  }
};
