import { Router } from 'express';
import { z } from 'zod';
import * as orders from '../controllers/orders.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { PAYMENT_METHODS, RETURN_REASONS } from '../models/Order.js';
import { objectId, pagination } from '../schemas/common.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const orderParams = z.object({ id: objectId });
// Detail lookups also accept the human-friendly order number (SK-XXXXXX).
const orderLookupParams = z.object({ id: z.union([objectId, z.string().regex(/^SK-[A-Z0-9]{6}$/i, 'Invalid id')]) });

const shortNote = (label) =>
  z
    .string()
    .trim()
    .max(200, `${label} must be at most 200 characters`)
    .nullish()
    .transform((value) => value || undefined);

const checkoutBody = z.object({
  addressId: objectId,
  coupon: z.string().trim().max(32).nullable().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).default('razorpay'),
  deliveryNote: shortNote('Delivery instructions'),
  giftMessage: shortNote('Gift message'),
});
const returnBody = z.object({
  reason: z.enum(RETURN_REASONS, 'Pick a reason for the return'),
  note: z.string().trim().max(500).optional(),
});
const verifyBody = z.object({
  razorpay_order_id: z.string().trim().min(1).max(64),
  razorpay_payment_id: z.string().trim().min(1).max(64),
  razorpay_signature: z.string().trim().min(1).max(256),
});
const failedBody = z.object({ reason: z.string().trim().max(300).optional() });
const listQuery = z.object({ page: pagination.page, limit: pagination.limit(50, 10) });

export const ordersRouter = Router();

ordersRouter.use(requireAuth);
ordersRouter.get('/', validate({ query: listQuery }), asyncHandler(orders.listOrders));
ordersRouter.post('/checkout', validate({ body: checkoutBody }), asyncHandler(orders.checkout));
ordersRouter.get('/:id', validate({ params: orderLookupParams }), asyncHandler(orders.getOrder));
ordersRouter.post('/:id/verify', validate({ params: orderParams, body: verifyBody }), asyncHandler(orders.verifyPayment));
ordersRouter.post(
  '/:id/payment-failed',
  validate({ params: orderParams, body: failedBody }),
  asyncHandler(orders.reportPaymentFailed),
);
ordersRouter.post('/:id/retry-payment', validate({ params: orderParams }), asyncHandler(orders.retryPayment));
ordersRouter.post('/:id/cancel', validate({ params: orderParams }), asyncHandler(orders.cancelOrder));
ordersRouter.post('/:id/return', validate({ params: orderParams, body: returnBody }), asyncHandler(orders.requestReturn));
ordersRouter.post('/:id/reorder', validate({ params: orderParams }), asyncHandler(orders.reorder));
ordersRouter.get('/:id/invoice', validate({ params: orderLookupParams }), asyncHandler(orders.invoice));
