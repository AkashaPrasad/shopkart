import { config } from '../config.js';
import { Cart } from '../models/Cart.js';
import { CANCELLABLE_STATUSES, Order, PAYABLE_STATUSES } from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { formatINR } from '../utils/money.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import { sendOrderConfirmed, sendOrderShipped } from './emails.js';
import { deductStock, restoreStock } from './inventory.js';
import { refundPayment } from './razorpay.js';

export const RETURN_WINDOW_DAYS = 7;

const entry = (status, note) => ({ status, at: new Date(), ...(note ? { note } : {}) });

export const checkoutPayload = (order, razorpayOrder, user) => ({
  orderId: razorpayOrder.id,
  amount: razorpayOrder.amount,
  currency: razorpayOrder.currency,
  keyId: config.RAZORPAY_KEY_ID,
  prefill: { name: user.name, email: user.email, contact: user.phone || order.address.phone },
});

/** Creates an order, retrying on the (unlikely) event of an order-number collision. */
export async function createOrderRecord(data) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await Order.create({ ...data, orderNumber: generateOrderNumber() });
    } catch (err) {
      const collided = err?.code === 11000 && Object.keys(err.keyPattern ?? {}).includes('orderNumber');
      if (!collided) throw err;
    }
  }
  throw new ApiError(500, 'ORDER_NUMBER_EXHAUSTED', 'Could not allocate an order number. Please try again.');
}

async function recordRefund(orderId, paymentId, amount, status, label) {
  const refund = await refundPayment(paymentId, amount, { orderId: String(orderId), reason: label });
  const note = refund.ok
    ? `${label} Refund of the full amount started (${refund.refundId}).`
    : `${label} We'll process your refund manually within 2 business days.`;
  const $set = refund.ok
    ? { 'payment.refundId': refund.refundId, 'payment.refundStatus': refund.status }
    : { 'payment.refundStatus': 'failed' };
  if (!refund.ok) console.error(`Refund failed for payment ${paymentId} on order ${orderId}: ${refund.reason}`);
  return Order.findByIdAndUpdate(orderId, { $set, $push: { timeline: entry(status, note) } }, { returnDocument: 'after' });
}

/** A payment arrived for an order that can no longer take it (already paid or cancelled). */
async function handleUnclaimablePayment(orderId, { razorpayPaymentId, method }) {
  const current = await Order.findById(orderId);
  if (!current) return { order: null };

  if (current.payment.razorpayPaymentId === razorpayPaymentId) {
    // Same payment seen twice (verify + webhook, or a retried request): idempotent.
    if (method && !current.payment.method) {
      current.payment.method = method;
      await current.save();
    }
    return { order: current };
  }

  const label = current.status === 'cancelled' ? 'Payment received after cancellation.' : 'Duplicate payment received.';
  return { order: await recordRefund(current._id, razorpayPaymentId, undefined, current.status, label) };
}

/**
 * Transitions an order to `paid` exactly once and then decrements stock.
 * The status claim is atomic, so concurrent verify/webhook calls can't double-decrement.
 * @returns {Promise<{ order, stockIssue?: object }>}
 */
export async function markOrderPaid(order, { razorpayOrderId, razorpayPaymentId, signature, method }) {
  const payment = {
    'payment.razorpayOrderId': razorpayOrderId,
    'payment.razorpayPaymentId': razorpayPaymentId,
    'payment.paidAt': new Date(),
  };
  if (signature) payment['payment.razorpaySignature'] = signature;
  if (method) payment['payment.method'] = method;

  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, status: { $in: PAYABLE_STATUSES } },
    {
      $set: { status: 'paid', stockDeducted: true, ...payment },
      $unset: { 'payment.failureReason': 1 },
      $push: { timeline: entry('paid', 'Payment received. Thank you!') },
    },
    { returnDocument: 'after' },
  );
  if (!claimed) return handleUnclaimablePayment(order._id, { razorpayPaymentId, method });

  const deduction = await deductStock(claimed.items);
  if (!deduction.ok) {
    // Someone bought the last units while this customer was paying.
    await Order.updateOne(
      { _id: claimed._id, status: 'paid' },
      {
        $set: { status: 'cancelled', stockDeducted: false },
        $push: { timeline: entry('cancelled', `${deduction.failedItem.name} sold out while you were paying.`) },
      },
    );
    const refunded = await recordRefund(claimed._id, razorpayPaymentId, claimed.total, 'cancelled', 'Order cancelled.');
    return { order: refunded, stockIssue: deduction.failedItem };
  }

  await removePurchasedFromCart(claimed);
  void sendOrderConfirmed(claimed);
  return { order: claimed };
}

/** Takes an order's products (and its coupon) out of the customer's cart once it's placed. */
export async function removePurchasedFromCart(order) {
  const productIds = order.items.map((item) => item.product);
  await Cart.updateOne({ user: order.user }, { $pull: { items: { product: { $in: productIds } } } });
  if (order.coupon) await Cart.updateOne({ user: order.user, coupon: order.coupon }, { $set: { coupon: null } });
}

/**
 * Places a cash-on-delivery order: stock is reserved immediately and the order goes
 * straight to `processing`. Returns null (nothing created) if stock ran out meanwhile.
 */
export async function placeCodOrder(data) {
  const deduction = await deductStock(data.items);
  if (!deduction.ok) return null;
  let order;
  try {
    order = await createOrderRecord({
      ...data,
      status: 'processing',
      stockDeducted: true,
      payment: { provider: 'cod', method: 'cod' },
      timeline: [{ status: 'processing', at: new Date(), note: `Order placed. Pay ${formatINR(data.total)} in cash on delivery.` }],
    });
  } catch (err) {
    await restoreStock(data.items);
    throw err;
  }
  await removePurchasedFromCart(order);
  void sendOrderConfirmed(order);
  return order;
}

/** Marks the current attempt as failed. Never downgrades an order that is already paid. */
export async function markPaymentFailed(orderId, reason) {
  const failed = await Order.findOneAndUpdate(
    { _id: orderId, status: 'pending_payment' },
    {
      $set: { status: 'payment_failed', 'payment.failureReason': reason },
      $push: { timeline: entry('payment_failed', reason) },
    },
    { returnDocument: 'after' },
  );
  return failed ?? Order.findById(orderId);
}

/**
 * Cancels an order (customer or admin), restoring stock once and refunding paid orders.
 * Pass `userId` to scope the lookup to that customer's orders.
 */
export async function cancelOrder(orderId, { userId, note = 'Cancelled by you.' } = {}) {
  const scope = userId ? { _id: orderId, user: userId } : { _id: orderId };
  const before = await Order.findOneAndUpdate(
    { ...scope, status: { $in: CANCELLABLE_STATUSES } },
    { $set: { status: 'cancelled', stockDeducted: false }, $push: { timeline: entry('cancelled', note) } },
    { returnDocument: 'before' },
  );

  if (!before) {
    const existing = await Order.findOne(scope);
    if (!existing) throw ApiError.notFound('ORDER_NOT_FOUND', "We couldn't find that order.");
    if (existing.status === 'cancelled') return existing;
    throw ApiError.conflict('ORDER_NOT_CANCELLABLE', `This order is ${existing.status.replaceAll('_', ' ')} and can't be cancelled.`);
  }

  if (before.stockDeducted) await restoreStock(before.items);

  const wasPaid = before.status !== 'pending_payment' && before.payment?.razorpayPaymentId;
  if (wasPaid) return recordRefund(before._id, before.payment.razorpayPaymentId, before.total, 'cancelled', 'Order cancelled.');
  return Order.findById(before._id);
}

// Moves an admin can make. Cancelling goes through cancelOrder; resolving a
// return is `returned` (approve + refund) or back to `delivered` (decline).
export const ADMIN_TRANSITIONS = {
  pending_payment: ['cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  return_requested: ['returned', 'delivered'],
};

const DEFAULT_NOTES = {
  processing: 'Packing your order.',
  shipped: 'Shipped! Your order is on its way.',
  delivered: 'Delivered. Enjoy!',
  cancelled: 'Cancelled by ShopKart.',
  returned: 'Return approved.',
};

/** Extra fields to set for a transition, given the order's current state. */
function transitionFields(order, to, now) {
  const fields = {};
  if (to === 'delivered' && order.status === 'return_requested') {
    fields['return.resolvedAt'] = now;
  } else if (to === 'delivered') {
    fields.deliveredAt = now;
    // Cash is collected on delivery.
    if (order.payment.provider === 'cod') fields['payment.paidAt'] = now;
  }
  if (to === 'returned') fields['return.resolvedAt'] = now;
  return fields;
}

async function refundReturn(order) {
  if (order.payment.provider === 'cod' || !order.payment.razorpayPaymentId) {
    return Order.findByIdAndUpdate(
      order._id,
      {
        $set: { 'payment.refundStatus': 'manual' },
        $push: { timeline: entry('returned', 'Cash on delivery order: refund to be paid out manually.') },
      },
      { returnDocument: 'after' },
    );
  }
  return recordRefund(order._id, order.payment.razorpayPaymentId, order.total, 'returned', 'Return approved.');
}

export async function transitionOrder(orderId, to, note) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('ORDER_NOT_FOUND', "We couldn't find that order.");

  const allowed = ADMIN_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(to)) {
    throw ApiError.conflict('INVALID_TRANSITION', `Can't move an order from ${order.status} to ${to}.`, {
      from: order.status,
      to,
      allowed,
    });
  }

  const declined = to === 'delivered' && order.status === 'return_requested';
  const message = note || (declined ? 'Return request declined.' : DEFAULT_NOTES[to]);
  if (to === 'cancelled') return cancelOrder(order._id, { note: message });

  // Conditional on the status we validated, so concurrent changes can't skip a step.
  const now = new Date();
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status },
    { $set: { status: to, ...transitionFields(order, to, now) }, $push: { timeline: entry(to, message) } },
    { returnDocument: 'after' },
  );
  if (!updated) throw ApiError.conflict('ORDER_STATE_CHANGED', 'This order was just updated. Refresh to see its latest status.');

  if (to === 'shipped') void sendOrderShipped(updated);
  if (to === 'returned') return refundReturn(updated);
  return updated;
}

/** Customer return request: only for delivered orders, within the return window. */
export async function requestReturn(orderId, userId, { reason, note }) {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) throw ApiError.notFound('ORDER_NOT_FOUND', "We couldn't find that order.");
  if (order.status !== 'delivered') {
    throw ApiError.conflict('RETURN_NOT_ALLOWED', 'Only delivered orders can be returned.');
  }
  const deliveredAt = order.deliveredAt ?? order.timeline.findLast((t) => t.status === 'delivered')?.at;
  const windowEnds = new Date((deliveredAt ?? order.createdAt).getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  if (Date.now() > windowEnds.getTime()) {
    throw ApiError.conflict('RETURN_WINDOW_CLOSED', `Returns are accepted within ${RETURN_WINDOW_DAYS} days of delivery.`);
  }

  const now = new Date();
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: 'delivered' },
    {
      $set: { status: 'return_requested', return: { reason, note, requestedAt: now } },
      $push: { timeline: entry('return_requested', note ? `Return requested: ${note}` : 'Return requested.') },
    },
    { returnDocument: 'after' },
  );
  if (!updated) throw ApiError.conflict('ORDER_STATE_CHANGED', 'This order was just updated. Refresh to see its latest status.');
  return updated;
}
