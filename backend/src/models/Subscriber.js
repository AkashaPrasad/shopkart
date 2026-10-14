import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

const subscriberSchema = new mongoose.Schema(
  { email: { type: String, required: true, unique: true, lowercase: true, trim: true } },
  { timestamps: true, toJSON: jsonOptions() },
);

export const Subscriber = mongoose.model('Subscriber', subscriberSchema);
