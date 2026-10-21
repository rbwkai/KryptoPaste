import rateLimit from 'express-rate-limit';

const base = {
  standardHeaders: 'draft-7', // tells clients how many requests they have left
  legacyHeaders: false,
  message: { error: 'rate_limited' },
};

// Everything under /api: 120 requests per minute per visitor.
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 120,
});

// Creating pastes costs storage: 30 per hour per visitor.
export const createLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 30,
});
