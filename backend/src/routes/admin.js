import { Router } from 'express';
import { z } from 'zod';
import * as admin from '../controllers/admin.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ORDER_STATUSES, PAYMENT_METHODS } from '../models/Order.js';
import { BADGES, CATEGORIES } from '../models/Product.js';
import { idParams, objectId, optionalQuery, pagination } from '../schemas/common.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const search = optionalQuery(z.string().trim().max(100));
const flag = optionalQuery(z.enum(['1', '0', 'true', 'false'])).transform((v) => v === '1' || v === 'true');
const atLeastOne = (body) => Object.keys(body).length > 0;

const ordersQuery = z.object({
  status: optionalQuery(z.enum(ORDER_STATUSES)),
  paymentMethod: optionalQuery(z.enum(PAYMENT_METHODS)),
  q: search,
  page: pagination.page,
  limit: pagination.limit(100, 20),
});
const orderLookupParams = z.object({ id: z.union([objectId, z.string().regex(/^SK-[A-Z0-9]{6}$/i, 'Invalid id')]) });
const statusBody = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(300).optional(),
});

const productsQuery = z.object({
  q: search,
  category: optionalQuery(z.enum(CATEGORIES)),
  includeInactive: flag,
  page: pagination.page,
  limit: pagination.limit(100, 24),
});
const paise = (label) => z.number().int(`${label} must be whole paise`).min(100, `${label} must be at least ₹1`).max(100000, `${label} must be at most ₹1000`);
const productBody = z
  .object({
    stock: z.number().int('Stock must be a whole number').min(0, 'Stock cannot be negative').max(100000),
    price: paise('Price'),
    compareAtPrice: paise('Compare-at price').nullable(),
    isActive: z.boolean(),
    badges: z.array(z.enum(BADGES)).max(BADGES.length).transform((badges) => [...new Set(badges)]),
  })
  .partial()
  .refine(atLeastOne, { message: 'Nothing to update' });

const customersQuery = z.object({ q: search, page: pagination.page, limit: pagination.limit(100, 20) });
const pageQuery = z.object({ page: pagination.page, limit: pagination.limit(100, 20) });
const couponBody = z.object({ isActive: z.boolean() }).partial().refine(atLeastOne, { message: 'Nothing to update' });

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/stats', asyncHandler(admin.stats));
adminRouter.get('/orders', validate({ query: ordersQuery }), asyncHandler(admin.listOrders));
adminRouter.get('/orders/:id', validate({ params: orderLookupParams }), asyncHandler(admin.getOrder));
adminRouter.patch('/orders/:id/status', validate({ params: idParams, body: statusBody }), asyncHandler(admin.updateOrderStatus));
adminRouter.get('/products', validate({ query: productsQuery }), asyncHandler(admin.listProducts));
adminRouter.patch('/products/:id', validate({ params: idParams, body: productBody }), asyncHandler(admin.updateProduct));
adminRouter.get('/customers', validate({ query: customersQuery }), asyncHandler(admin.listCustomers));
adminRouter.get('/reviews', validate({ query: pageQuery }), asyncHandler(admin.listReviews));
adminRouter.delete('/reviews/:id', validate({ params: idParams }), asyncHandler(admin.deleteReview));
adminRouter.get('/subscribers', validate({ query: pageQuery }), asyncHandler(admin.listSubscribers));
adminRouter.get('/messages', validate({ query: pageQuery }), asyncHandler(admin.listMessages));
adminRouter.get('/coupons', asyncHandler(admin.listCoupons));
adminRouter.patch('/coupons/:id', validate({ params: idParams, body: couponBody }), asyncHandler(admin.updateCoupon));
