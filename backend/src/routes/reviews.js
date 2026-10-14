import { Router } from 'express';
import { z } from 'zod';
import * as reviews from '../controllers/reviews.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../schemas/common.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const reviewFields = {
  rating: z.number().int('Pick a whole number of stars').min(1, 'Pick at least 1 star').max(5, 'Pick at most 5 stars'),
  title: z.string().trim().min(1, 'Give your review a title').max(80, 'Keep the title under 80 characters'),
  body: z.string().trim().min(1, 'Tell us a bit more').max(1000, 'Keep it under 1000 characters'),
};

const updateBody = z
  .object(reviewFields)
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update' });

export const reviewsRouter = Router();

reviewsRouter.use(requireAuth);
reviewsRouter.patch('/:id', validate({ params: idParams, body: updateBody }), asyncHandler(reviews.updateReview));
reviewsRouter.delete('/:id', validate({ params: idParams }), asyncHandler(reviews.deleteReview));
