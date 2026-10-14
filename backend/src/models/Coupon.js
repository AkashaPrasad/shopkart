import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, required: true, enum: ['percent', 'flat', 'freeship'] },
    value: { type: Number, required: true, min: 0, default: 0 },
    maxDiscount: { type: Number, min: 0 },
    minSubtotal: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
  },
  { timestamps: true, toJSON: jsonOptions() },
);

export const Coupon = mongoose.model('Coupon', couponSchema);
