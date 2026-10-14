import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

const contactMessageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true, toJSON: jsonOptions() },
);

export const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
