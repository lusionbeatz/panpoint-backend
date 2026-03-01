import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';

import { generalLimiter } from './middleware/rateLimit.middleware';
import { globalErrorHandler } from './middleware/error.middleware';
import { AppError } from './utils/AppError';

import authRoutes from './routes/auth.routes';
import shopsRoutes from './routes/shops.routes';
import itemsRoutes from './routes/items.routes';
import ordersRoutes from './routes/orders.routes';
import reviewsRoutes from './routes/reviews.routes';
import subscriptionsRoutes from './routes/subscriptions.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

// Security
app.use(helmet());
// Support multiple origins: production Hostinger domain + localhost for dev
const _allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',').map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow server-to-server / mobile
    if (_allowedOrigins.some((o) => origin === o || origin.endsWith(o)))
      return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(generalLimiter);

// Images hosted on Cloudinary — no local static serving needed

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// API Routes — all under /api/*
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopsRoutes);
app.use('/api', itemsRoutes);          // /api/shops/:shopId/items  and  /api/items
app.use('/api/orders', ordersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/admin', adminRoutes);

// 404
app.all('*', (req, _res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found.`, 404));
});

// Global error handler
app.use(globalErrorHandler);

export default app;
