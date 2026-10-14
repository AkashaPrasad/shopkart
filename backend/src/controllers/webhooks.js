import { Order } from '../models/Order.js';
import { markOrderPaid, markPaymentFailed } from '../services/orders.js';
import { verifyWebhookSignature } from '../services/razorpay.js';
import { ApiError } from '../utils/ApiError.js';

async function onPaymentCaptured(payment) {
  const order = await Order.findOne({ razorpayOrderIds: payment.order_id });
  if (!order) return;
  if (payment.amount !== order.total) {
    console.error(`Webhook amount mismatch for ${order.orderNumber}: got ${payment.amount}, expected ${order.total}`);
    return;
  }
  await markOrderPaid(order, {
    razorpayOrderId: payment.order_id,
    razorpayPaymentId: payment.id,
    method: payment.method,
  });
}

async function onPaymentFailed(payment) {
  const order = await Order.findOne({ razorpayOrderIds: payment.order_id });
  // A failure from an earlier attempt must not touch a newer retry.
  if (!order || order.payment.razorpayOrderId !== payment.order_id) return;
  await markPaymentFailed(order._id, payment.error_description || 'Payment failed.');
}

const handlers = { 'payment.captured': onPaymentCaptured, 'payment.failed': onPaymentFailed };

/** Razorpay webhook. Needs the raw body: the signature covers the exact bytes sent. */
export async function razorpayWebhook(req, res) {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!verifyWebhookSignature(raw, req.get('x-razorpay-signature'))) {
    throw ApiError.badRequest('INVALID_SIGNATURE', 'Webhook signature verification failed.');
  }

  let event;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    throw ApiError.badRequest('INVALID_JSON', 'Webhook body is not valid JSON.');
  }

  const payment = event?.payload?.payment?.entity;
  const handler = handlers[event?.event];
  if (handler && payment?.order_id) await handler(payment);

  res.json({ ok: true });
}
