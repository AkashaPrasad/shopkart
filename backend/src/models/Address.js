import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

export const ADDRESS_TYPES = ['home', 'work', 'other'];

const addressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    pincode: { type: String, required: true, match: /^[1-9]\d{5}$/ },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    landmark: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    type: { type: String, enum: ADDRESS_TYPES, default: 'home' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: jsonOptions() },
);

export const Address = mongoose.model('Address', addressSchema);
