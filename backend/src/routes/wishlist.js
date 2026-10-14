import { Router } from 'express';
import { z } from 'zod';
import * as wishlist from '../controllers/wishlist.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { objectId } from '../schemas/common.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const productParams = z.object({ productId: objectId });
const mergeBody = z.object({ productIds: z.array(objectId).max(wishlist.MAX_WISHLIST_ITEMS) });

export const wishlistRouter = Router();

wishlistRouter.use(requireAuth);
wishlistRouter.get('/', asyncHandler(wishlist.getWishlist));
wishlistRouter.post('/merge', validate({ body: mergeBody }), asyncHandler(wishlist.mergeWishlist));
wishlistRouter.post('/:productId', validate({ params: productParams }), asyncHandler(wishlist.addToWishlist));
wishlistRouter.delete('/:productId', validate({ params: productParams }), asyncHandler(wishlist.removeFromWishlist));
