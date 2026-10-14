import { formatINR } from '../utils/money.js';

// Every amount here is integer paise. These functions are pure: the cart,
// the public quote and checkout all call computeSummary so totals never drift.
export const FREE_SHIPPING_THRESHOLD = 49900;
export const SHIPPING_FEE = 4900;
export const MAX_QTY_PER_ITEM = 10;
export const COD_FEE = 3000;
export const COD_MAX_TOTAL = 500000;

/**
 * Decides whether a coupon can be used against a subtotal.
 * @returns {{ ok: true } | { ok: false, code: string, message: string }}
 */
export function checkCoupon(coupon, subtotal, now = new Date()) {
  if (!coupon) {
    return { ok: false, code: 'COUPON_NOT_FOUND', message: "That code doesn't exist. Double-check the spelling?" };
  }
  if (!coupon.isActive) {
    return { ok: false, code: 'COUPON_INACTIVE', message: `${coupon.code} is no longer active.` };
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() <= now.getTime()) {
    return { ok: false, code: 'COUPON_EXPIRED', message: `${coupon.code} has expired.` };
  }
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    const short = coupon.minSubtotal - subtotal;
    return {
      ok: false,
      code: 'COUPON_MIN_NOT_MET',
      message: `${coupon.code} needs a subtotal of ${formatINR(coupon.minSubtotal)}. Add ${formatINR(short)} more to use it.`,
    };
  }
  return { ok: true };
}

function couponDiscount(coupon, subtotal) {
  if (coupon.type === 'percent') {
    const raw = Math.floor((subtotal * coupon.value) / 100);
    return coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
  }
  if (coupon.type === 'flat') return Math.min(coupon.value, subtotal);
  return 0;
}

/**
 * @param {{ price: number, qty: number }[]} items  prices in paise, taken from the DB
 * @param {object|null} coupon  a Coupon document/object; ignored when not applicable
 * @param {{ paymentMethod?: 'razorpay'|'cod', now?: Date }} [options]  COD adds a flat fee
 */
export function computeSummary(items, coupon = null, { paymentMethod = 'razorpay', now = new Date() } = {}) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
  const applicable = coupon && checkCoupon(coupon, subtotal, now).ok ? coupon : null;

  const discount = applicable ? couponDiscount(applicable, subtotal) : 0;
  const qualifiesForFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD || applicable?.type === 'freeship';
  const shipping = itemCount === 0 || qualifiesForFreeShipping ? 0 : SHIPPING_FEE;
  const codFee = paymentMethod === 'cod' && itemCount > 0 ? COD_FEE : 0;

  return {
    subtotal,
    discount,
    shipping,
    codFee,
    total: Math.max(0, subtotal - discount + shipping + codFee),
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    amountToFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal),
    itemCount,
  };
}
