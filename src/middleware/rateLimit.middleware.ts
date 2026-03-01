import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs:       15 * 60 * 1000, // 15 min
  max:            100,
  standardHeaders: true,
  legacyHeaders:  false,
  message: { status: 'fail', message: 'Too many requests. Please try again later.' },
});

export const authLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            10,
  standardHeaders: true,
  legacyHeaders:  false,
  message: { status: 'fail', message: 'Too many login attempts. Please try again in 15 minutes.' },
});
