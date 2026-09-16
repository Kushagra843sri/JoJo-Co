import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import generateToken, { AUTH_COOKIE_OPTIONS } from '../utils/generateToken.js';
import { sendVerificationEmail } from '../utils/sendEmail.js';

// Format only — confirms the string is shaped like an email, not that the
// mailbox actually exists or belongs to the registrant. See email verification
// discussion: catching "not even an email" is cheap, catching "not a real,
// owned inbox" needs an actual send-a-link verification flow.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Explicit presence check matters here beyond just UX: Mongoose drops
    // `undefined` query fields entirely, so User.findOne({ email: undefined })
    // silently becomes findOne({}) and would match an arbitrary existing user.
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (!EMAIL_FORMAT.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    generateToken(user._id, res);

    // Fire-and-forget — sendVerificationEmail already catches its own errors
    // (a Resend hiccup must never fail registration; the user can always hit
    // "resend" later), so the response doesn't wait on an email round-trip.
    sendVerificationEmail(user);

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    });
  } catch (err) {
    console.error(`registerUser error: ${err.message}`);

    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 11000) {
      return res.status(400).json({ message: 'User already exists' });
    }

    return res.status(500).json({ message: 'Server error during registration' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    generateToken(user._id, res);

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    });
  } catch (err) {
    console.error(`loginUser error: ${err.message}`);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

export const getProfile = async (req, res) => {
  return res.status(200).json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    shippingAddress: req.user.shippingAddress,
    emailVerified: req.user.emailVerified,
  });
};

export const updateProfile = async (req, res) => {
  try {
    const { name, shippingAddress } = req.body;

    if (name !== undefined) req.user.name = name;
    if (shippingAddress !== undefined) req.user.shippingAddress = shippingAddress;

    await req.user.save();

    return res.status(200).json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      shippingAddress: req.user.shippingAddress,
      emailVerified: req.user.emailVerified,
    });
  } catch (err) {
    console.error(`updateProfile error: ${err.message}`);

    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({ message: 'Server error while updating profile' });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: 'This verification link is invalid or has expired' });
    }
    if (decoded.purpose !== 'verify-email') {
      return res.status(400).json({ message: 'This verification link is invalid or has expired' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    return res.status(200).json({ message: 'Email verified', emailVerified: true });
  } catch (err) {
    console.error(`verifyEmail error: ${err.message}`);
    return res.status(500).json({ message: 'Server error while verifying email' });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    if (req.user.emailVerified) {
      return res.status(200).json({ message: 'Your email is already verified' });
    }

    await sendVerificationEmail(req.user);
    return res.status(200).json({ message: 'Verification email sent — check your inbox' });
  } catch (err) {
    console.error(`resendVerificationEmail error: ${err.message}`);
    return res.status(500).json({ message: 'Server error while sending verification email' });
  }
};

export const logoutUser = async (req, res) => {
  try {
    res.clearCookie('jwt', AUTH_COOKIE_OPTIONS);

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error(`logoutUser error: ${err.message}`);
    return res.status(500).json({ message: 'Server error during logout' });
  }
};
