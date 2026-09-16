import jwt from 'jsonwebtoken';

// Shared across generateToken, the Google OAuth callback, and logout's clearCookie —
// all three must set/clear the exact same attributes or the browser won't treat them
// as the same cookie. Secure defaults to false so local dev (plain http://localhost)
// still receives the cookie; hosts like Render/Vercel set NODE_ENV=production
// automatically, which is what flips this to true for real deployments.
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
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
