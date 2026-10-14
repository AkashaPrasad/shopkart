import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number, required: true, min: 1, max: 10 },
    color: { type: String, trim: true },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
    coupon: { type: String, uppercase: true, trim: true, default: null },
  },
  { timestamps: true, toJSON: jsonOptions() },
);

export const Cart = mongoose.model('Cart', cartSchema);
