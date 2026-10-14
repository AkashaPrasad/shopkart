import { Product } from '../models/Product.js';
import { buildLine, cartView, findCoupon, getOrCreateCart, matchColor, mergeIntoCart, pricedItems } from '../services/cart.js';
import { lineIssue, stockIssue } from '../services/inventory.js';
import { checkCoupon, computeSummary, MAX_QTY_PER_ITEM } from '../services/pricing.js';
import { ApiError } from '../utils/ApiError.js';

const sendCart = async (res, cart, extra = {}) => res.json({ cart: await cartView(cart), ...extra });

const findLine = (cart, productId) => cart.items.find((item) => item.product.toString() === productId);

const removeLine = (cart, productId) => {
  cart.items = cart.items.filter((item) => item.product.toString() !== productId);
};

async function loadActiveProduct(productId) {
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw ApiError.notFound('PRODUCT_NOT_FOUND', 'That product is no longer available.');
  return product;
}

/** Validates a requested colour; keeps the current one or defaults to the first when none is given. */
function resolveColor(product, requested, current) {
  if (!product.colors?.length) return undefined;
  if (requested) {
    const match = matchColor(product, requested);
    if (!match) {
      const message = `Pick one of: ${product.colors.map((color) => color.name).join(', ')}.`;
      throw ApiError.badRequest('INVALID_COLOR', message, { fields: { color: message } });
    }
    return match;
  }
  return matchColor(product, current) ?? product.colors[0].name;
}

/** Rejects quantities above the per-item cap or the live stock (409 carries the issue for the UI). */
function assertQtyAllowed(product, productId, qty, inCart = 0) {
  if (qty > MAX_QTY_PER_ITEM) {
    throw ApiError.badRequest('MAX_QTY_EXCEEDED', `You can have up to ${MAX_QTY_PER_ITEM} of each item.`, {
      maxQty: MAX_QTY_PER_ITEM,
      inCart,
    });
  }
  const issue = lineIssue(product, qty);
  if (issue) {
    const message =
      issue.reason === 'insufficient_stock' && inCart
        ? `Only ${product.stock} left, and you already have ${inCart} in your cart.`
        : issue.message;
    const code = { out_of_stock: 'OUT_OF_STOCK', unavailable: 'PRODUCT_UNAVAILABLE' }[issue.reason] ?? 'INSUFFICIENT_STOCK';
    throw ApiError.conflict(code, message, { issues: [stockIssue(product, productId, qty, issue)] });
  }
}

export async function getCart(req, res) {
  await sendCart(res, await getOrCreateCart(req.user._id));
}

export async function addItem(req, res) {
  const { productId, qty, color } = req.body;
  const product = await loadActiveProduct(productId);
  const cart = await getOrCreateCart(req.user._id);
  const line = findLine(cart, productId);
  const inCart = line?.qty ?? 0;

  assertQtyAllowed(product, productId, inCart + qty, inCart);
  const resolvedColor = resolveColor(product, color, line?.color);
  if (line) {
    line.qty = inCart + qty;
    line.color = resolvedColor;
  } else {
    cart.items.push({ product: product._id, qty, color: resolvedColor });
  }
  await cart.save();
  await sendCart(res, cart);
}

export async function updateItem(req, res) {
  const { productId } = req.params;
  const { qty, color } = req.body;
  const cart = await getOrCreateCart(req.user._id);
  const line = findLine(cart, productId);
  if (!line) throw ApiError.notFound('ITEM_NOT_IN_CART', "That item isn't in your cart.");

  if (qty === 0) {
    removeLine(cart, productId);
  } else {
    const product = await Product.findById(productId);
    // Lowering a quantity is always allowed; raising it must fit the cap and live stock.
    if (qty > line.qty || !product?.isActive) assertQtyAllowed(product, productId, qty);
    line.qty = qty;
    if (product?.isActive) line.color = resolveColor(product, color, line.color);
  }
  await cart.save();
  await sendCart(res, cart);
}

export async function removeItem(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  if (findLine(cart, req.params.productId)) {
    removeLine(cart, req.params.productId);
    await cart.save();
  }
  await sendCart(res, cart);
}

export async function clearCart(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  cart.coupon = null;
  await cart.save();
  await sendCart(res, cart);
}

/** Folds a guest cart into the server cart: sums quantities, capped at 10 and live stock. */
export async function mergeCart(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  const adjustments = await mergeIntoCart(cart, req.body.items);
  await cart.save();
  await sendCart(res, cart, { adjustments });
}

export async function applyCoupon(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  const coupon = await findCoupon(req.body.code);
  const { summary } = await cartView(cart);
  const check = checkCoupon(coupon, summary.subtotal);
  if (!check.ok) throw ApiError.badRequest(check.code, check.message, { fields: { code: check.message } });

  cart.coupon = coupon.code;
  await cart.save();
  await sendCart(res, cart);
}

export async function removeCoupon(req, res) {
  const cart = await getOrCreateCart(req.user._id);
  cart.coupon = null;
  await cart.save();
  await sendCart(res, cart);
}

/** Public: prices a guest cart with server truth (DB prices, stock, coupon validity). */
export async function quote(req, res) {
  const { items, coupon: code } = req.body;
  const products = await Product.find({ _id: { $in: items.map((item) => item.productId) } });
  const byId = new Map(products.map((product) => [product._id.toString(), product]));

  const lines = items.map((item) => buildLine(byId.get(item.productId) ?? null, item.productId, item.qty, item.color));
  const coupon = code ? await findCoupon(code) : null;
  const summary = computeSummary(pricedItems(lines), coupon);
  const couponCheck = code ? checkCoupon(coupon, summary.subtotal) : null;

  res.json({
    summary,
    items: lines,
    coupon: code
      ? { code: code.trim().toUpperCase(), valid: couponCheck.ok, message: couponCheck.ok ? null : couponCheck.message }
      : null,
  });
}
