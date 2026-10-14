import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

const wishlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    products: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], default: [] },
  },
  { timestamps: true, toJSON: jsonOptions() },
);

export const Wishlist = mongoose.model('Wishlist', wishlistSchema);
