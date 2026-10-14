import { Cart } from '../models/Cart.js';
import { Coupon } from '../models/Coupon.js';
import { Product } from '../models/Product.js';
import { checkCoupon, computeSummary, MAX_QTY_PER_ITEM } from './pricing.js';
import { lineIssue } from './inventory.js';

/** The compact product shape shared by cart lines, quotes and the wishlist. */
export const toLiteProduct = (product) => ({
  _id: product._id,
  id: product._id.toString(),
  slug: product.slug,
  name: product.name,
  tagline: product.tagline,
  price: product.price,
  compareAtPrice: product.compareAtPrice ?? null,
  image: product.images?.[0] ?? null,
  images: product.images ?? [],
  category: product.category,
  colors: product.colors ?? [],
  badges: product.badges ?? [],
  stock: product.stock,
  isActive: product.isActive,
});

/** One priced line with availability flags; `product` may be null for deleted items. */
export function buildLine(product, productId, qty, color) {
  const issue = lineIssue(product, qty);
  const purchasable = Boolean(product?.isActive);
  return {
    productId: String(productId),
    product: product ? toLiteProduct(product) : null,
    qty,
    color: color ?? null,
    lineTotal: purchasable ? product.price * qty : 0,
    inStock: purchasable && product.stock > 0,
    maxQty: purchasable ? Math.min(MAX_QTY_PER_ITEM, product.stock) : 0,
    available: issue === null,
    issue,
  };
}

/** Lines that contribute to totals: the product still exists and is on sale. */
export const pricedItems = (lines) =>
  lines.filter((line) => line.product?.isActive).map((line) => ({ price: line.product.price, qty: line.qty }));

export const findCoupon = (code) => (code ? Coupon.findOne({ code: code.trim().toUpperCase() }) : null);

export const getOrCreateCart = (userId) =>
  Cart.findOneAndUpdate({ user: userId }, { $setOnInsert: { items: [] } }, { upsert: true, returnDocument: 'after' });

/** Serialises a cart document into the API shape: { items, coupon, couponError, summary }. */
export async function cartView(cart) {
  await cart.populate('items.product');
  const lines = cart.items
    .filter((item) => item.product)
    .map((item) => buildLine(item.product, item.product._id, item.qty, item.color));
  const items = pricedItems(lines);
  const coupon = await findCoupon(cart.coupon);
  const summary = computeSummary(items, coupon);
  const couponCheck = cart.coupon ? checkCoupon(coupon, summary.subtotal) : { ok: true };

  return {
    items: lines,
    coupon: cart.coupon || null,
    couponError: couponCheck.ok ? null : couponCheck.message,
    summary,
  };
}

export const matchColor = (product, wanted) =>
  wanted ? (product.colors?.find((color) => color.name.toLowerCase() === wanted.toLowerCase())?.name ?? null) : null;

/**
 * Adds [{ productId, qty, color?, name? }] to a cart document (not saved), summing with
 * existing lines and capping at 10 / live stock. Returns what couldn't be added in full.
 */
export async function mergeIntoCart(cart, lines) {
  const incoming = new Map();
  for (const line of lines) {
    const key = String(line.productId);
    const existing = incoming.get(key);
    incoming.set(key, {
      qty: (existing?.qty ?? 0) + line.qty,
      color: line.color ?? existing?.color,
      name: line.name ?? existing?.name ?? null,
    });
  }

  const products = await Product.find({ _id: { $in: [...incoming.keys()] }, isActive: true });
  const byId = new Map(products.map((product) => [product._id.toString(), product]));
  const adjustments = [];

  for (const [productId, { qty, color, name }] of incoming) {
    const product = byId.get(productId);
    const line = cart.items.find((item) => item.product.toString() === productId);
    const inCart = line?.qty ?? 0;
    if (!product || product.stock <= 0) {
      const reason = product ? 'out_of_stock' : 'unavailable';
      adjustments.push({ productId, name: product?.name ?? name, requestedQty: qty, addedQty: 0, reason });
      continue;
    }

    const cap = Math.min(MAX_QTY_PER_ITEM, product.stock);
    const nextQty = Math.min(inCart + qty, cap);
    if (nextQty < inCart + qty) {
      adjustments.push({
        productId,
        name: product.name,
        requestedQty: inCart + qty,
        addedQty: Math.max(0, nextQty - inCart),
        reason: product.stock < MAX_QTY_PER_ITEM ? 'insufficient_stock' : 'max_qty',
      });
    }

    const resolvedColor = product.colors?.length
      ? (matchColor(product, color) ?? matchColor(product, line?.color) ?? product.colors[0].name)
      : undefined;
    if (line) {
      line.qty = nextQty;
      line.color = resolvedColor;
    } else {
      cart.items.push({ product: product._id, qty: nextQty, color: resolvedColor });
    }
  }
  return adjustments;
}
