import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

const stockAlertSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: jsonOptions() },
);

stockAlertSchema.index({ product: 1, email: 1 }, { unique: true });

export const StockAlert = mongoose.model('StockAlert', stockAlertSchema);
