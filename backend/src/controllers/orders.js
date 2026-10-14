import { Address } from '../models/Address.js';
import { Cart } from '../models/Cart.js';
import { Order, PAYABLE_STATUSES } from '../models/Order.js';
import { config } from '../config.js';
import { cartView, findCoupon, getOrCreateCart, mergeIntoCart } from '../services/cart.js';
import { findStockIssues } from '../services/inventory.js';
import {
  cancelOrder as cancelOrderRecord,
  checkoutPayload,
  createOrderRecord,
  markOrderPaid,
  markPaymentFailed,
  placeCodOrder,
  requestReturn as requestReturnRecord,
} from '../services/orders.js';
import { checkCoupon, COD_MAX_TOTAL, computeSummary } from '../services/pricing.js';
import { formatINR } from '../utils/money.js';
import { createRazorpayOrder, verifyPaymentSignature } from '../services/razorpay.js';
import { ApiError } from '../utils/ApiError.js';

const ORDER_NOT_FOUND = () => ApiError.notFound('ORDER_NOT_FOUND', "We couldn't find that order.");

async function findOwnedOrder(userId, idOrNumber) {
  const filter = /^SK-/i.test(idOrNumber) ? { orderNumber: idOrNumber.toUpperCase() } : { _id: idOrNumber };
  const order = await Order.findOne({ ...filter, user: userId });
  if (!order) throw ORDER_NOT_FOUND();
  return order;
}

const stockConflict = (issues) =>
  ApiError.conflict('STOCK_CONFLICT', 'Some items in your cart changed. Please review them before paying.', { issues });

const addressSnapshot = (address) => ({
  fullName: address.fullName,
  phone: address.phone,
  pincode: address.pincode,
  line1: address.line1,
  line2: address.line2,
  landmark: address.landmark,
  city: address.city,
  state: address.state,
  type: address.type,
});

export async function checkout(req, res) {
  const { user } = req;
  const address = await Address.findOne({ _id: req.body.addressId, user: user._id });
  if (!address) {
    const message = 'Please choose a delivery address.';
    throw ApiError.badRequest('ADDRESS_INVALID', message, { fields: { addressId: message } });
  }

  const cart = await Cart.findOne({ user: user._id }).populate('items.product');
  const lines = (cart?.items ?? []).filter((item) => item.product);
  if (!lines.length) throw ApiError.badRequest('CART_EMPTY', 'Your cart is empty.');

  const issues = await findStockIssues(lines.map((line) => ({ productId: line.product._id, qty: line.qty })));
  if (issues.length) throw stockConflict(issues);

  // Prices always come from the database, never from the client.
  const items = lines.map(({ product, qty, color }) => ({
    product: product._id,
    name: product.name,
    slug: product.slug,
    image: product.images[0],
    price: product.price,
    qty,
    ...(color ? { color } : {}),
  }));

  // An explicit `coupon` (even null/empty) overrides whatever is saved on the cart.
  const { paymentMethod, deliveryNote, giftMessage } = req.body;
  const couponCode = 'coupon' in req.body ? req.body.coupon : cart.coupon;
  const coupon = couponCode ? await findCoupon(couponCode) : null;
  const summary = computeSummary(items, coupon, { paymentMethod });
  if (couponCode) {
    const check = checkCoupon(coupon, summary.subtotal);
    if (!check.ok) throw ApiError.badRequest(check.code, check.message, { fields: { coupon: check.message } });
  }

  const data = {
    user: user._id,
    items,
    address: addressSnapshot(address),
    subtotal: summary.subtotal,
    discount: summary.discount,
    shipping: summary.shipping,
    codFee: summary.codFee,
    total: summary.total,
    coupon: coupon?.code,
    deliveryNote,
    giftMessage,
  };

  if (paymentMethod === 'cod') {
    if (summary.total > COD_MAX_TOTAL) {
      throw ApiError.badRequest(
        'COD_LIMIT_EXCEEDED',
        `Cash on delivery is available for orders up to ${formatINR(COD_MAX_TOTAL)}. Please pay online for this one.`,
        { maxTotal: COD_MAX_TOTAL, total: summary.total },
      );
    }
    const codOrder = await placeCodOrder(data);
    if (!codOrder) throw stockConflict(await findStockIssues(items.map((item) => ({ productId: item.product, qty: item.qty }))));
    return res.status(201).json({ order: codOrder });
  }

  const order = await createOrderRecord({
    ...data,
    status: 'pending_payment',
    timeline: [{ status: 'pending_payment', at: new Date(), note: 'Order placed. Waiting for payment.' }],
  });

  let razorpayOrder;
  try {
    razorpayOrder = await createRazorpayOrder(order);
  } catch (err) {
    await Order.deleteOne({ _id: order._id });
    throw err;
  }
  order.payment.razorpayOrderId = razorpayOrder.id;
  order.razorpayOrderIds.push(razorpayOrder.id);
  await order.save();

  res.status(201).json({ order, razorpay: checkoutPayload(order, razorpayOrder, user) });
}

export async function verifyPayment(req, res) {
  const order = await findOwnedOrder(req.user._id, req.params.id);
  const { razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId, razorpay_signature: signature } =
    req.body;

  const valid =
    order.razorpayOrderIds.includes(razorpayOrderId) &&
    verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature });

  if (!valid) {
    const failed = await markPaymentFailed(order._id, 'Payment signature verification failed.');
    throw ApiError.badRequest(
      'INVALID_SIGNATURE',
      "We couldn't verify this payment. If money was debited, it will be refunded automatically.",
      { order: failed },
    );
  }

  const { order: updated, stockIssue } = await markOrderPaid(order, { razorpayOrderId, razorpayPaymentId, signature });
  if (stockIssue) {
    throw ApiError.conflict(
      'SOLD_OUT_DURING_PAYMENT',
      `${stockIssue.name} sold out while you were paying. Your order was cancelled and a full refund has been started.`,
      { order: updated },
    );
  }
  if (updated.status === 'cancelled') {
    throw ApiError.conflict(
      'ORDER_CANCELLED',
      'This order was already cancelled, so we have started a refund for that payment.',
      { order: updated },
    );
  }
  res.json({ order: updated });
}

export async function reportPaymentFailed(req, res) {
  const order = await findOwnedOrder(req.user._id, req.params.id);
  const reason = req.body.reason || 'Payment was not completed.';
  res.json({ order: await markPaymentFailed(order._id, reason) });
}

export async function retryPayment(req, res) {
  const order = await findOwnedOrder(req.user._id, req.params.id);
  if (!PAYABLE_STATUSES.includes(order.status)) {
    throw ApiError.conflict('ORDER_NOT_PAYABLE', `This order is ${order.status.replaceAll('_', ' ')} and can't be paid again.`);
  }

  const issues = await findStockIssues(order.items.map((item) => ({ productId: item.product, qty: item.qty })));
  if (issues.length) throw stockConflict(issues);

  const razorpayOrder = await createRazorpayOrder(order);
  const update = {
    $set: { status: 'pending_payment', 'payment.razorpayOrderId': razorpayOrder.id },
    $unset: { 'payment.failureReason': 1 },
    $push: { razorpayOrderIds: razorpayOrder.id },
  };
  if (order.status === 'payment_failed') {
    update.$push.timeline = { status: 'pending_payment', at: new Date(), note: 'Retrying payment.' };
  }
  // Guard on the status we read so a concurrent payment can't be overwritten.
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, update, {
    returnDocument: 'after',
  });
  if (!updated) throw ApiError.conflict('ORDER_STATE_CHANGED', 'This order was just updated. Refresh to see its latest status.');

  res.json({ order: updated, razorpay: checkoutPayload(updated, razorpayOrder, req.user) });
}

export async function cancelOrder(req, res) {
  const order = await findOwnedOrder(req.user._id, req.params.id);
  res.json({ order: await cancelOrderRecord(order._id, { userId: req.user._id }) });
}

export async function requestReturn(req, res) {
  res.json({ order: await requestReturnRecord(req.params.id, req.user._id, req.body) });
}

/** "Buy again": puts everything still available back in the cart. */
export async function reorder(req, res) {
  const order = await findOwnedOrder(req.user._id, req.params.id);
  const cart = await getOrCreateCart(req.user._id);
  const skipped = await mergeIntoCart(
    cart,
    order.items.map((item) => ({ productId: item.product, qty: item.qty, color: item.color, name: item.name })),
  );
  await cart.save();
  res.json({ cart: await cartView(cart), skipped });
}

const INVOICE_BLOCKED = ['pending_payment', 'payment_failed'];

export async function invoice(req, res) {
  const order = await findOwnedOrder(req.user._id, req.params.id);
  const settled = order.payment.paidAt || order.payment.provider === 'cod';
  if (INVOICE_BLOCKED.includes(order.status) || (order.status === 'cancelled' && !order.payment.paidAt) || !settled) {
    throw ApiError.conflict('INVOICE_UNAVAILABLE', 'An invoice is available once the order is paid or confirmed.');
  }
  res.json({
    order,
    seller: { name: 'ShopKart', address: config.SELLER_ADDRESS, gstin: '(not registered)', email: config.SELLER_EMAIL },
    invoiceNumber: `INV-${order.orderNumber}`,
    issuedAt: order.payment.paidAt ?? order.createdAt,
  });
}

export async function listOrders(req, res) {
  const { page, limit } = req.query;
  const filter = { user: req.user._id };
  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}

export async function getOrder(req, res) {
  res.json({ order: await findOwnedOrder(req.user._id, req.params.id) });
}
