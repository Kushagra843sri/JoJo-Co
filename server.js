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

// Vercel assigns a fresh, randomly-hashed URL to every deployment of the
// frontend (e.g. jo-jo-co-frontend-<hash>.vercel.app) in addition to the
// stable CLIENT_URL alias below — a plain string match against CLIENT_URL
// alone means CORS (and therefore login/register) breaks every time someone
// opens a specific deployment's own URL instead of hunting down the current
// stable one. Scoped narrowly to this exact project's Vercel subdomain
// prefix, not all of *.vercel.app, so this doesn't open the API up to every
// other Vercel-hosted site.
const staticAllowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
const vercelPreviewPattern = /^https:\/\/jo-jo-co-frontend(-[a-z0-9]+)*\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === staticAllowedOrigin || vercelPreviewPattern.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
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
// Same tight quota as resend-verification — this also burns a Resend send.
app.use('/api/v1/auth/forgot-password', resendVerificationLimiter);
app.use('/api/v1/auth/reset-password', authLimiter);
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
