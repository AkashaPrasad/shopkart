import { Router } from 'express';
import { z } from 'zod';
import * as cart from '../controllers/cart.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { objectId } from '../schemas/common.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const color = z.string().trim().min(1).max(40).optional();
const couponCode = z.string().trim().min(1, 'Enter a coupon code').max(32, 'That code is too long');
// Guest carts may hold more than the cap; merge and quote clamp/flag instead of rejecting.
const guestItem = z.object({ productId: objectId, qty: z.coerce.number().int().min(1).max(999), color });

// The per-item cap (MAX_QTY_PER_ITEM) is enforced in the controller so every
// violation surfaces as the same MAX_QTY_EXCEEDED error.
const addBody = z.object({
  productId: objectId,
  qty: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(999).default(1),
  color,
});
const updateBody = z.object({ qty: z.coerce.number().int().min(0, 'Quantity cannot be negative').max(999), color });
const productParams = z.object({ productId: objectId });
const mergeBody = z.object({ items: z.array(guestItem).max(100) });
const couponBody = z.object({ code: couponCode });
const quoteBody = z.object({ items: z.array(guestItem).max(100), coupon: couponCode.optional().or(z.literal('')) });

export const cartRouter = Router();

cartRouter.post('/quote', validate({ body: quoteBody }), asyncHandler(cart.quote));

cartRouter.use(requireAuth);
cartRouter.get('/', asyncHandler(cart.getCart));
cartRouter.delete('/', asyncHandler(cart.clearCart));
cartRouter.post('/items', validate({ body: addBody }), asyncHandler(cart.addItem));
cartRouter.patch('/items/:productId', validate({ params: productParams, body: updateBody }), asyncHandler(cart.updateItem));
cartRouter.delete('/items/:productId', validate({ params: productParams }), asyncHandler(cart.removeItem));
cartRouter.post('/merge', validate({ body: mergeBody }), asyncHandler(cart.mergeCart));
cartRouter.post('/coupon', validate({ body: couponBody }), asyncHandler(cart.applyCoupon));
cartRouter.delete('/coupon', asyncHandler(cart.removeCoupon));
