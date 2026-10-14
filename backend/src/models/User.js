import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { jsonOptions } from './jsonOptions.js';

const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    avatarUrl: { type: String },
    phone: { type: String, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    deletedAt: { type: Date },
  },
  { timestamps: true, toJSON: jsonOptions(['passwordHash', 'googleId']) },
);

userSchema.virtual('hasPassword').get(function hasPassword() {
  return Boolean(this.passwordHash);
});

userSchema.methods.setPassword = async function setPassword(password) {
  this.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
};

userSchema.methods.checkPassword = function checkPassword(password) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);
