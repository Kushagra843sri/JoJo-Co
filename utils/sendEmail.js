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
