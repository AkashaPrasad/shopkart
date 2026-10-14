import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

export const CATEGORIES = ['stickers', 'pins', 'stationery', 'desk', 'tech', 'snacks'];
export const BADGES = ['new', 'bestseller', 'limited'];

const colorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    hex: { type: String, required: true, match: /^#[0-9a-fA-F]{6}$/ },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    tagline: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0, validate: Number.isInteger },
    compareAtPrice: { type: Number, min: 0, validate: Number.isInteger },
    images: { type: [String], default: [] },
    category: { type: String, required: true, enum: CATEGORIES, index: true },
    tags: { type: [String], default: [], index: true },
    stock: { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, min: 0, default: 0 },
    colors: { type: [colorSchema], default: undefined },
    badges: { type: [{ type: String, enum: BADGES }], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, toJSON: jsonOptions() },
);

export const Product = mongoose.model('Product', productSchema);
