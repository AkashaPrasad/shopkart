import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'payment_failed',
  'cancelled',
  'return_requested',
  'returned',
];
export const PAYMENT_METHODS = ['razorpay', 'cod'];
export const RETURN_REASONS = ['damaged', 'wrong_item', 'not_as_described', 'changed_mind', 'other'];
export const CANCELLABLE_STATUSES = ['pending_payment', 'paid', 'processing'];
export const PAYABLE_STATUSES = ['pending_payment', 'payment_failed'];

const { ObjectId } = mongoose.Schema.Types;

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    color: { type: String },
  },
  { _id: false },
);

const addressSnapshotSchema = new mongoose.Schema(
  {
    fullName: String,
    phone: String,
    pincode: String,
    line1: String,
    line2: String,
    landmark: String,
    city: String,
    state: String,
    type: String,
  },
  { _id: false },
);

const paymentSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: PAYMENT_METHODS, default: 'razorpay' },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    method: String,
    paidAt: Date,
    failureReason: String,
    refundId: String,
    refundStatus: { type: String, enum: ['pending', 'processed', 'failed', 'manual'] },
  },
  { _id: false },
);

const returnSchema = new mongoose.Schema(
  {
    reason: { type: String, enum: RETURN_REASONS, required: true },
    note: String,
    requestedAt: { type: Date, required: true },
    resolvedAt: Date,
  },
  { _id: false },
);

const timelineSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    note: String,
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true, index: true },
    orderNumber: { type: String, required: true, unique: true },
    items: { type: [orderItemSchema], required: true },
    address: { type: addressSnapshotSchema, required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, required: true, default: 0 },
    shipping: { type: Number, required: true, default: 0 },
    codFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    coupon: { type: String },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending_payment', index: true },
    payment: { type: paymentSchema, default: () => ({}) },
    timeline: { type: [timelineSchema], default: [] },
    deliveryNote: { type: String, maxlength: 200 },
    giftMessage: { type: String, maxlength: 200 },
    deliveredAt: Date,
    return: { type: returnSchema, default: undefined },
    // Every Razorpay order ever created for this order (retries create new ones),
    // so late webhooks for an earlier attempt can still be matched.
    razorpayOrderIds: { type: [String], default: [], index: true },
    // True while this order's quantities are subtracted from product stock.
    stockDeducted: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: jsonOptions(['razorpayOrderIds', 'stockDeducted']) },
);

orderSchema.index({ user: 1, createdAt: -1 });

orderSchema.virtual('paymentMethod').get(function paymentMethod() {
  return this.payment?.provider ?? 'razorpay';
});

export const Order = mongoose.model('Order', orderSchema);
