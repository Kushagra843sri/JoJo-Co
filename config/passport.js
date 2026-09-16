import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AUTH_COOKIE_OPTIONS } from '../utils/generateToken.js';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/v1/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.findOne({ email });

          if (user) {
            user.googleId = profile.id;
            // Google itself just confirmed ownership of this inbox — no need
            // to also make them click an emailed link for the same proof.
            user.emailVerified = true;
            await user.save();
          } else {
            user = await User.create({
              name: profile.displayName,
              email,
              googleId: profile.id,
              role: 'customer',
              emailVerified: true,
            });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export const generateGoogleAuthToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });

  res.cookie('jwt', token, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return token;
};

export default passport;
