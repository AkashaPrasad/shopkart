import { rateLimit } from 'express-rate-limit';
import { config } from '../config.js';
import { ApiError } from '../utils/ApiError.js';

const limiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new ApiError(429, 'RATE_LIMITED', message)),
  });

export const authLimiter = limiter(60 * 1000, config.AUTH_RATE_LIMIT_MAX, 'Too many attempts. Take a breath and try again in a minute.');

// Search-as-you-type: 20 requests per 10 seconds per IP.
export const suggestLimiter = limiter(10 * 1000, 20, 'Searching a little too fast. Give it a second.');

// Public forms (newsletter, contact, back-in-stock alerts).
export const formLimiter = limiter(60 * 1000, 20, 'Too many submissions. Please try again in a minute.');
