import rateLimit from 'express-rate-limit';

// General API rate limit — 60 requests per minute per IP
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for AI endpoints — 20 per minute per IP
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'AI rate limit reached. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});
