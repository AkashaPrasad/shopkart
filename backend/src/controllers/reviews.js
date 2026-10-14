import { Review } from '../models/Review.js';
import { findPurchase, recomputeProductRating } from '../services/reviews.js';
import { ApiError } from '../utils/ApiError.js';
import { findActiveProduct } from './products.js';

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  highest: { rating: -1, createdAt: -1 },
  lowest: { rating: 1, createdAt: -1 },
};

/** Review JSON with the author reduced to { name, avatarUrl }. */
export function reviewJSON(review) {
  const json = review.toJSON();
  json.user = { name: review.user?.name ?? 'Deleted user', avatarUrl: review.user?.avatarUrl ?? null };
  return json;
}

export async function listReviews(req, res) {
  const product = await findActiveProduct(req.params.slug);
  const { page, limit, sort } = req.query;
  const filter = { product: product._id };

  const [items, total, stats] = await Promise.all([
    Review.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name avatarUrl'),
    Review.countDocuments(filter),
    Review.aggregate([{ $match: filter }, { $group: { _id: '$rating', count: { $sum: 1 } } }]),
  ]);

  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const row of stats) breakdown[row._id] = row.count;
  const sum = stats.reduce((acc, row) => acc + row._id * row.count, 0);
  res.json({
    items: items.map(reviewJSON),
    total,
    page,
    pages: Math.ceil(total / limit),
    breakdown,
    average: total ? Math.round((sum / total) * 10) / 10 : 0,
  });
}

const alreadyReviewed = () => ApiError.conflict('ALREADY_REVIEWED', "You've already reviewed this product. You can edit your review instead.");

export async function createReview(req, res) {
  const product = await findActiveProduct(req.params.slug);
  if (await Review.exists({ user: req.user._id, product: product._id })) throw alreadyReviewed();

  const purchase = await findPurchase(req.user._id, product._id);
  let review;
  try {
    review = await Review.create({
      ...req.body,
      user: req.user._id,
      product: product._id,
      order: purchase?._id,
      verified: Boolean(purchase),
    });
  } catch (err) {
    if (err?.code === 11000) throw alreadyReviewed();
    throw err;
  }
  await recomputeProductRating(product._id);
  await review.populate('user', 'name avatarUrl');
  res.status(201).json({ review: reviewJSON(review) });
}

async function findEditableReview(req) {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('REVIEW_NOT_FOUND', "We couldn't find that review.");
  const isOwner = review.user.equals(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw ApiError.forbidden('You can only change your own reviews.');
  return review;
}

export async function updateReview(req, res) {
  const review = await findEditableReview(req);
  review.set(req.body);
  await review.save();
  await recomputeProductRating(review.product);
  await review.populate('user', 'name avatarUrl');
  res.json({ review: reviewJSON(review) });
}

export async function deleteReview(req, res) {
  const review = await findEditableReview(req);
  await review.deleteOne();
  await recomputeProductRating(review.product);
  res.json({ ok: true });
}
