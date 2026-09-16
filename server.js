import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import './config/passport.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();

// Cashfree's webhook is a server-to-server call from Cashfree's IPs, never a
// browser — CSP/frame headers on it would be meaningless, so it's excluded below.
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Throttles brute-force login/register attempts without touching read-heavy
// browsing routes (catalog, product detail) that have no such risk.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

// Tighter limit — this one burns a Resend send (counts against the free-tier
// quota) and lands in someone else's inbox, so it's worth throttling harder
// than a login guess.
const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many verification emails requested. Please try again later.' },
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'clothing-brand-backend' });
});

app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/resend-verification', resendVerificationLimiter);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/users', userRoutes);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
