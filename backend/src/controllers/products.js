import { CATEGORIES, Product } from '../models/Product.js';
import { StockAlert } from '../models/StockAlert.js';
import { ApiError } from '../utils/ApiError.js';

const SORTS = {
  popular: { reviewCount: -1, rating: -1, _id: 1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
  newest: { createdAt: -1, _id: 1 },
  rating: { rating: -1, reviewCount: -1, _id: 1 },
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function searchFilter({ q, tag, inStock, onSale, minRating, badge }) {
  const filter = { isActive: true };
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: pattern }, { tagline: pattern }, { tags: pattern }, { category: pattern }];
  }
  if (tag) filter.tags = tag;
  if (inStock) filter.stock = { $gt: 0 };
  if (onSale) filter.$expr = { $gt: ['$compareAtPrice', '$price'] };
  if (minRating !== undefined) filter.rating = { $gte: minRating };
  if (badge) filter.badges = badge;
  return filter;
}

function priceFilter({ minPrice, maxPrice }) {
  if (minPrice === undefined && maxPrice === undefined) return {};
  const price = {};
  if (minPrice !== undefined) price.$gte = minPrice;
  if (maxPrice !== undefined) price.$lte = maxPrice;
  return { price };
}

// Facets ignore their own filter so category chips keep their counts and the
// price slider keeps its bounds while the user narrows things down.
async function buildFacets(query) {
  const base = searchFilter(query);
  const [categoryCounts, priceStats] = await Promise.all([
    Product.aggregate([
      { $match: { ...base, ...priceFilter(query) } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    Product.aggregate([
      { $match: { ...base, ...(query.category ? { category: query.category } : {}) } },
      { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
    ]),
  ]);
  const counts = new Map(categoryCounts.map((row) => [row._id, row.count]));
  return {
    categories: CATEGORIES.map((key) => ({ key, count: counts.get(key) ?? 0 })),
    priceRange: { min: priceStats[0]?.min ?? 0, max: priceStats[0]?.max ?? 0 },
  };
}

export async function listProducts(req, res) {
  const { page, limit, sort, category } = req.query;
  const filter = { ...searchFilter(req.query), ...priceFilter(req.query), ...(category ? { category } : {}) };

  const [items, total, facets] = await Promise.all([
    Product.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
    buildFacets(req.query),
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit), facets });
}

export async function featuredProducts(_req, res) {
  const featured = await Product.find({ isActive: true, badges: { $in: ['bestseller', 'new'] } })
    .sort({ reviewCount: -1, rating: -1 })
    .limit(8);
  const fillers =
    featured.length < 8
      ? await Product.find({ isActive: true, _id: { $nin: featured.map((p) => p._id) } })
          .sort({ rating: -1 })
          .limit(8 - featured.length)
      : [];
  res.json({ items: [...featured, ...fillers] });
}

export async function findActiveProduct(slug) {
  const product = await Product.findOne({ slug: slug.toLowerCase(), isActive: true });
  if (!product) throw ApiError.notFound('PRODUCT_NOT_FOUND', "That product doesn't exist (or wandered off).");
  return product;
}

const MAX_SUGGESTIONS = 6;

/** Typeahead: word-prefix matches on name and tags, plus matching category keys. */
export async function suggest(req, res) {
  const { q } = req.query;
  if (!q) return res.json({ products: [], categories: [], query: '' });

  const wordPrefix = new RegExp(`(^|[\\s-])${escapeRegex(q)}`, 'i');
  const products = await Product.find({ isActive: true, $or: [{ name: wordPrefix }, { tags: wordPrefix }] })
    .sort({ reviewCount: -1, rating: -1, name: 1 })
    .limit(MAX_SUGGESTIONS)
    .select('slug name images price category');
  const needle = q.toLowerCase();
  res.json({
    products: products.map((p) => ({ slug: p.slug, name: p.name, image: p.images[0] ?? null, price: p.price, category: p.category })),
    categories: CATEGORIES.filter((key) => key.startsWith(needle)),
    query: q,
  });
}

/** Back-in-stock alert. Uses the signed-in user's email when there is one. */
export async function notifyWhenInStock(req, res) {
  const product = await findActiveProduct(req.params.slug);
  const email = req.user?.email ?? req.body.email;
  if (!email) {
    const message = 'Enter your email so we can let you know.';
    throw ApiError.badRequest('VALIDATION_ERROR', message, { fields: { email: message } });
  }
  // Re-subscribing re-arms an alert that has already fired.
  const result = await StockAlert.updateOne({ product: product._id, email }, { $set: { notifiedAt: null } }, { upsert: true });
  res.status(result.upsertedCount ? 201 : 200).json({ ok: true });
}

export async function getProduct(req, res) {
  const product = await findActiveProduct(req.params.slug);

  const sameCategory = await Product.find({ isActive: true, category: product.category, _id: { $ne: product._id } })
    .sort({ rating: -1, reviewCount: -1 })
    .limit(4);
  const others =
    sameCategory.length < 4
      ? await Product.find({ isActive: true, _id: { $nin: [product._id, ...sameCategory.map((p) => p._id)] } })
          .sort({ rating: -1 })
          .limit(4 - sameCategory.length)
      : [];

  res.json({ product, related: [...sameCategory, ...others] });
}
