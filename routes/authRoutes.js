import express from 'express';
import passport from 'passport';
import {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
  updateProfile,
  verifyEmail,
  resendVerificationEmail,
} from '../controllers/authController.js';
import { generateGoogleAuthToken } from '../config/passport.js';
import { protectRoute } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/profile', protectRoute, getProfile);
router.patch('/profile', protectRoute, updateProfile);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', protectRoute, resendVerificationEmail);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// This callback is hit by a full-page browser redirect from Google, not an
// AJAX call — so the response must itself be a redirect back into the React
// app, never JSON (a JSON response here would just render as raw text in the
// browser, with the user stranded on the backend's own origin).
// failureRedirect must be an absolute URL: passport passes it straight to
// res.redirect(), and a bare '/login' would redirect within THIS backend
// (which has no such route) rather than back to the frontend.
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`,
  }),
  (req, res) => {
    generateGoogleAuthToken(req.user._id, res);
    res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
  }
);

export default router;
