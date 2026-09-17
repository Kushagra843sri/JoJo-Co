import jwt from 'jsonwebtoken';

// Shared across generateToken, the Google OAuth callback, and logout's clearCookie —
// all three must set/clear the exact same attributes or the browser won't treat them
// as the same cookie. Secure defaults to false so local dev (plain http://localhost)
// still receives the cookie; hosts like Render/Vercel set NODE_ENV=production
// automatically, which is what flips this to true for real deployments.
//
// sameSite must be 'none' in production: this app's frontend (Vercel) and
// backend (Render) are on different domains, and browsers refuse to attach a
// 'strict' or 'lax' cookie to any cross-site request — only 'none' (which
// itself requires secure: true, already guaranteed by the same isProduction
// check) is ever sent cross-site. Without this, login/register appear to
// succeed but the session cookie never comes back on the next request.
const isProduction = process.env.NODE_ENV === 'production';

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
};

const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });

  res.cookie('jwt', token, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return token;
};

export default generateToken;
