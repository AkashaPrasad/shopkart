import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { config } from '../config.js';
import { ApiError } from '../utils/ApiError.js';

const client = new Razorpay({ key_id: config.RAZORPAY_KEY_ID, key_secret: config.RAZORPAY_KEY_SECRET });

const hmacHex = (secret, payload) => crypto.createHmac('sha256', secret).update(payload).digest('hex');

function safeEqualHex(expectedHex, receivedHex) {
  if (typeof receivedHex !== 'string' || !/^[0-9a-f]+$/i.test(receivedHex)) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const received = Buffer.from(receivedHex, 'hex');
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

const paymentSignatureFor = (razorpayOrderId, razorpayPaymentId) =>
  hmacHex(config.RAZORPAY_KEY_SECRET, `${razorpayOrderId}|${razorpayPaymentId}`);

export const verifyPaymentSignature = ({ razorpayOrderId, razorpayPaymentId, signature }) =>
  safeEqualHex(paymentSignatureFor(razorpayOrderId, razorpayPaymentId), signature);

export const verifyWebhookSignature = (rawBody, signature) =>
  safeEqualHex(hmacHex(config.RAZORPAY_WEBHOOK_SECRET, rawBody), signature);

const describeError = (err) =>
  err?.error?.description || err?.message || (err?.statusCode ? `HTTP ${err.statusCode}` : 'Unknown Razorpay error');

export async function createRazorpayOrder(order) {
  try {
    return await client.orders.create({
      amount: order.total,
      currency: 'INR',
      receipt: order._id.toString(),
      notes: { orderNumber: order.orderNumber, userId: order.user.toString() },
    });
  } catch (err) {
    console.error('Razorpay order creation failed:', describeError(err));
    throw new ApiError(
      502,
      'PAYMENT_PROVIDER_ERROR',
      "We couldn't reach our payment partner. Please try again in a moment.",
    );
  }
}

/**
 * Starts a refund (full amount when `amount` is omitted). Never throws: the
 * caller records the outcome on the order.
 */
export async function refundPayment(paymentId, amount, notes) {
  const params = { speed: 'normal', notes };
  if (amount) params.amount = amount;
  try {
    const refund = await client.payments.refund(paymentId, params);
    return { ok: true, refundId: refund.id, status: refund.status === 'processed' ? 'processed' : 'pending' };
  } catch (err) {
    return { ok: false, reason: describeError(err) };
  }
}
