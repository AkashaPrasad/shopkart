import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';

export const PURCHASED_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];

/** The most recent qualifying order containing this product, if any. */
export const findPurchase = (userId, productId) =>
  Order.findOne({ user: userId, status: { $in: PURCHASED_STATUSES }, 'items.product': productId })
    .sort({ createdAt: -1 })
    .select('_id');

/** Keeps product.rating (1 decimal) and product.reviewCount in sync with its reviews. */
export async function recomputeProductRating(productId) {
  const [stats] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(String(productId)) } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const rating = stats ? Math.round(stats.average * 10) / 10 : 0;
  await Product.updateOne({ _id: productId }, { $set: { rating, reviewCount: stats?.count ?? 0 } });
}
