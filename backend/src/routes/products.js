import { Router } from 'express';
import { z } from 'zod';
import * as products from '../controllers/products.js';
import * as reviews from '../controllers/reviews.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { formLimiter, suggestLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { BADGES, CATEGORIES } from '../models/Product.js';
import { email, optionalQuery, pagination } from '../schemas/common.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { reviewFields } from './reviews.js';

const paise = z.coerce.number().int().min(0);
const flag = optionalQuery(z.enum(['1', '0', 'true', 'false'])).transform((v) => v === '1' || v === 'true');

const listQuery = z
  .object({
    q: optionalQuery(z.string().trim().max(100)),
    category: optionalQuery(z.enum(CATEGORIES)),
    sort: optionalQuery(z.enum(['popular', 'price_asc', 'price_desc', 'newest', 'rating'])).transform((v) => v ?? 'popular'),
    minPrice: optionalQuery(paise),
    maxPrice: optionalQuery(paise),
    tag: optionalQuery(z.string().trim().toLowerCase().max(40)),
    inStock: flag,
    onSale: flag,
    minRating: optionalQuery(z.coerce.number().min(0).max(5)),
    badge: optionalQuery(z.enum(BADGES)),
    page: pagination.page,
    limit: pagination.limit(48, 24),
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    message: 'minPrice must be less than or equal to maxPrice',
    path: ['minPrice'],
  });

const slugParams = z.object({ slug: z.string().trim().min(1).max(120) });
const suggestQuery = z.object({ q: z.string().trim().max(100).default('') });
const reviewsQuery = z.object({
  page: pagination.page,
  limit: pagination.limit(50, 10),
  sort: optionalQuery(z.enum(['newest', 'highest', 'lowest'])).transform((v) => v ?? 'newest'),
});
const notifyBody = z.object({ email: email.optional() });

export const productsRouter = Router();

productsRouter.get('/', validate({ query: listQuery }), asyncHandler(products.listProducts));
productsRouter.get('/featured', asyncHandler(products.featuredProducts));
productsRouter.get('/suggest', suggestLimiter, validate({ query: suggestQuery }), asyncHandler(products.suggest));
productsRouter.get('/:slug', validate({ params: slugParams }), asyncHandler(products.getProduct));
productsRouter.get('/:slug/reviews', validate({ params: slugParams, query: reviewsQuery }), asyncHandler(reviews.listReviews));
productsRouter.post(
  '/:slug/reviews',
  requireAuth,
  validate({ params: slugParams, body: z.object(reviewFields) }),
  asyncHandler(reviews.createReview),
);
productsRouter.post(
  '/:slug/notify',
  formLimiter,
  optionalAuth,
  validate({ params: slugParams, body: notifyBody }),
  asyncHandler(products.notifyWhenInStock),
);
