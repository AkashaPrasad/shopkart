import { ContactMessage } from '../models/ContactMessage.js';
import { Coupon } from '../models/Coupon.js';
import { ORDER_STATUSES, Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { Subscriber } from '../models/Subscriber.js';
import { User } from '../models/User.js';
import { notifyBackInStock } from '../services/emails.js';
import { transitionOrder } from '../services/orders.js';
import { recomputeProductRating } from '../services/reviews.js';
import { ApiError } from '../utils/ApiError.js';

const REVENUE_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];
const LOW_STOCK_THRESHOLD = 5;
const SALES_DAYS = 14;
const STORE_TIMEZONE = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const searchRegex = (q) => new RegExp(escapeRegex(q), 'i');
const pageMeta = (total, page, limit) => ({ total, page, pages: Math.ceil(total / limit) });
const storeDate = new Intl.DateTimeFormat('en-CA', { timeZone: STORE_TIMEZONE });

/** Order JSON with `user` reduced to { _id, name, email } (works for populated or bare refs). */
function withUser(order) {
  const json = order.toJSON();
  const { user } = order;
  json.user = user?.email ? { _id: user._id, name: user.name, email: user.email } : { _id: user?._id ?? user, name: null, email: null };
  return json;
}

async function findOrderOrThrow(id) {
  const filter = /^SK-/i.test(id) ? { orderNumber: id.toUpperCase() } : { _id: id };
  const order = await Order.findOne(filter).populate('user', 'name email');
  if (!order) throw ApiError.notFound('ORDER_NOT_FOUND', "We couldn't find that order.");
  return order;
}

async function salesByDay() {
  const now = Date.now();
  const days = Array.from({ length: SALES_DAYS }, (_, i) => storeDate.format(new Date(now - (SALES_DAYS - 1 - i) * DAY_MS)));
  const rows = await Order.aggregate([
    { $match: { status: { $in: REVENUE_STATUSES } } },
    { $addFields: { soldAt: { $ifNull: ['$payment.paidAt', '$createdAt'] } } },
    { $match: { soldAt: { $gte: new Date(now - (SALES_DAYS + 1) * DAY_MS) } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$soldAt', timezone: STORE_TIMEZONE } },
        total: { $sum: '$total' },
        count: { $sum: 1 },
      },
    },
  ]);
  const byDay = new Map(rows.map((row) => [row._id, row]));
  return days.map((date) => ({ date, total: byDay.get(date)?.total ?? 0, count: byDay.get(date)?.count ?? 0 }));
}

export async function stats(_req, res) {
  const [revenueRows, statusRows, customersCount, productsCount, lowStock, recentOrders, sales, codOrders] = await Promise.all([
    Order.aggregate([{ $match: { status: { $in: REVENUE_STATUSES } } }, { $group: { _id: null, revenue: { $sum: '$total' } } }]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.countDocuments({ role: 'user' }),
    Product.countDocuments(),
    Product.find({ isActive: true, stock: { $lte: LOW_STOCK_THRESHOLD } })
      .sort({ stock: 1, name: 1 })
      .select('name slug stock images'),
    Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email'),
    salesByDay(),
    Order.countDocuments({ 'payment.provider': 'cod' }),
  ]);

  const counts = new Map(statusRows.map((row) => [row._id, row.count]));
  res.json({
    revenue: revenueRows[0]?.revenue ?? 0,
    ordersCount: statusRows.reduce((sum, row) => sum + row.count, 0),
    ordersByStatus: Object.fromEntries(ORDER_STATUSES.map((status) => [status, counts.get(status) ?? 0])),
    customersCount,
    productsCount,
    lowStock: lowStock.map((p) => ({ _id: p._id, name: p.name, slug: p.slug, stock: p.stock, image: p.images[0] ?? null })),
    recentOrders: recentOrders.map(withUser),
    salesByDay: sales,
    returnsPending: counts.get('return_requested') ?? 0,
    codOrders,
  });
}

export async function listOrders(req, res) {
  const { status, paymentMethod, q, page, limit } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (paymentMethod) filter['payment.provider'] = paymentMethod;
  if (q) {
    const pattern = searchRegex(q);
    const users = await User.find({ $or: [{ email: pattern }, { name: pattern }] }).select('_id');
    filter.$or = [{ orderNumber: pattern }, { user: { $in: users.map((u) => u._id) } }];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email'),
    Order.countDocuments(filter),
  ]);
  res.json({ items: orders.map(withUser), ...pageMeta(total, page, limit) });
}

export async function getOrder(req, res) {
  res.json({ order: withUser(await findOrderOrThrow(req.params.id)) });
}

export async function updateOrderStatus(req, res) {
  const { status, note } = req.body;
  const updated = await transitionOrder(req.params.id, status, note);
  await updated.populate('user', 'name email');
  res.json({ order: withUser(updated) });
}

export async function listProducts(req, res) {
  const { q, category, includeInactive, page, limit } = req.query;
  const filter = {};
  if (!includeInactive) filter.isActive = true;
  if (category) filter.category = category;
  if (q) {
    const pattern = searchRegex(q);
    filter.$or = [{ name: pattern }, { slug: pattern }, { tags: pattern }];
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ category: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);
  res.json({ items, ...pageMeta(total, page, limit) });
}

export async function updateProduct(req, res) {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('PRODUCT_NOT_FOUND', "That product doesn't exist.");

  const { compareAtPrice, ...fields } = req.body;
  const wasSoldOut = product.stock === 0;
  product.set(fields);
  if (compareAtPrice !== undefined) product.compareAtPrice = compareAtPrice ?? undefined;
  if (product.compareAtPrice !== undefined && product.compareAtPrice <= product.price) {
    const message = 'Compare-at price must be higher than the price.';
    throw ApiError.badRequest('VALIDATION_ERROR', message, { fields: { compareAtPrice: message } });
  }
  await product.save();
  if (wasSoldOut && product.stock > 0) await notifyBackInStock(product);
  res.json({ product });
}

export async function listCustomers(req, res) {
  const { q, page, limit } = req.query;
  const match = q ? { $or: [{ name: searchRegex(q) }, { email: searchRegex(q) }] } : {};

  const [items, total] = await Promise.all([
    User.aggregate([
      { $match: match },
      { $sort: { createdAt: -1, _id: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: Order.collection.name,
          localField: '_id',
          foreignField: 'user',
          pipeline: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                spent: { $sum: { $cond: [{ $in: ['$status', REVENUE_STATUSES] }, '$total', 0] } },
              },
            },
          ],
          as: 'orderStats',
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          createdAt: 1,
          ordersCount: { $ifNull: [{ $first: '$orderStats.count' }, 0] },
          totalSpent: { $ifNull: [{ $first: '$orderStats.spent' }, 0] },
        },
      },
    ]),
    User.countDocuments(match),
  ]);
  res.json({ items, ...pageMeta(total, page, limit) });
}

export async function listCoupons(_req, res) {
  res.json({ items: await Coupon.find().sort({ code: 1 }) });
}

export async function updateCoupon(req, res) {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('COUPON_NOT_FOUND', "That coupon doesn't exist.");
  coupon.set(req.body);
  await coupon.save();
  res.json({ coupon });
}

/** Paginated plain list for simple admin tables. */
async function paginate(Model, { page, limit }, { filter = {}, populate } = {}) {
  let query = Model.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  if (populate) query = query.populate(...populate);
  const [items, total] = await Promise.all([query, Model.countDocuments(filter)]);
  return { items, ...pageMeta(total, page, limit) };
}

export async function listReviews(req, res) {
  const result = await paginate(Review, req.query);
  await Review.populate(result.items, [
    { path: 'user', select: 'name email' },
    { path: 'product', select: 'name slug' },
  ]);
  const items = result.items.map((review) => ({
    ...review.toJSON(),
    user: review.user ? { _id: review.user._id, name: review.user.name, email: review.user.email } : null,
    product: review.product ? { _id: review.product._id, name: review.product.name, slug: review.product.slug } : null,
  }));
  res.json({ ...result, items });
}

export async function deleteReview(req, res) {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw ApiError.notFound('REVIEW_NOT_FOUND', "We couldn't find that review.");
  await recomputeProductRating(review.product);
  res.json({ ok: true });
}

export async function listSubscribers(req, res) {
  res.json(await paginate(Subscriber, req.query));
}

export async function listMessages(req, res) {
  res.json(await paginate(ContactMessage, req.query));
}
