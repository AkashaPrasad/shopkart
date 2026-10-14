import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

const { ObjectId } = mongoose.Schema.Types;

const reviewSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    product: { type: ObjectId, ref: 'Product', required: true, index: true },
    order: { type: ObjectId, ref: 'Order' },
    rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: jsonOptions() },
);

reviewSchema.index({ user: 1, product: 1 }, { unique: true });

export const Review = mongoose.model('Review', reviewSchema);
