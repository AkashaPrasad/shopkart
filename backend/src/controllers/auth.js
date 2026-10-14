import crypto from 'node:crypto';
import { Address } from '../models/Address.js';
import { Cart } from '../models/Cart.js';
import { ContactMessage } from '../models/ContactMessage.js';
import { Order } from '../models/Order.js';
import { PasswordReset } from '../models/PasswordReset.js';
import { StockAlert } from '../models/StockAlert.js';
import { Subscriber } from '../models/Subscriber.js';
import { User } from '../models/User.js';
import { Wishlist } from '../models/Wishlist.js';
import { clearAuthCookie, setAuthCookie, signToken } from '../middleware/auth.js';
import { sendPasswordReset } from '../services/emails.js';
import { verifyGoogleCredential } from '../services/googleAuth.js';
import { ApiError } from '../utils/ApiError.js';

const RESET_TTL_MS = 30 * 60 * 1000;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function sendSession(res, user, status = 200) {
  const token = signToken(user);
  setAuthCookie(res, token);
  res.status(status).json({ user, token });
}

export async function register(req, res) {
  const { name, email, password } = req.body;
  const existing = await User.findOne({ email });
  if (existing) {
    const message = existing.passwordHash
      ? 'That email is already registered. Try logging in instead.'
      : 'That email uses Google sign-in. Continue with Google instead.';
    throw ApiError.conflict('EMAIL_TAKEN', message, { fields: { email: message } });
  }
  const user = new User({ name, email });
  await user.setPassword(password);
  await user.save();
  sendSession(res, user, 201);
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && !user.passwordHash) {
    throw ApiError.unauthorized('This account uses Google sign-in. Continue with Google instead.', 'GOOGLE_ACCOUNT');
  }
  if (!user || !(await user.checkPassword(password))) {
    throw ApiError.unauthorized('Email or password is incorrect.', 'INVALID_CREDENTIALS');
  }
  sendSession(res, user);
}

export async function googleSignIn(req, res) {
  const profile = await verifyGoogleCredential(req.body.credential);

  let user = await User.findOne({ googleId: profile.googleId });
  if (!user) {
    user = await User.findOne({ email: profile.email });
    if (user) {
      user.googleId = profile.googleId;
      user.avatarUrl ??= profile.avatarUrl;
      await user.save();
    } else {
      user = await User.create(profile);
    }
  }
  sendSession(res, user);
}

export function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ ok: true });
}

export function me(req, res) {
  res.json({ user: req.user });
}

export async function updateMe(req, res) {
  const { name, phone } = req.body;
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone || undefined;
  await req.user.save();
  res.json({ user: req.user });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const { user } = req;
  if (!user.passwordHash) {
    throw ApiError.badRequest('NO_PASSWORD_SET', "This account signs in with Google, so there's no password to change.");
  }
  if (!(await user.checkPassword(currentPassword))) {
    const message = 'Current password is incorrect.';
    throw ApiError.badRequest('INVALID_PASSWORD', message, { fields: { currentPassword: message } });
  }
  await user.setPassword(newPassword);
  await user.save();
  res.json({ ok: true });
}

/** Always answers { ok: true } so the endpoint can't be used to probe for accounts. */
export async function forgotPassword(req, res) {
  const user = await User.findOne({ email: req.body.email, deletedAt: null });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    // Only the newest link works.
    await PasswordReset.updateMany({ user: user._id, usedAt: null }, { $set: { usedAt: new Date() } });
    await PasswordReset.create({ user: user._id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) });
    void sendPasswordReset(user, token);
  }
  res.json({ ok: true });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body;
  const reset = await PasswordReset.findOneAndUpdate(
    { tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { returnDocument: 'after' },
  );
  const user = reset && (await User.findById(reset.user));
  if (!user || user.deletedAt) {
    throw ApiError.badRequest('INVALID_TOKEN', 'This reset link is invalid or has expired. Please request a new one.');
  }
  await user.setPassword(password);
  await user.save();
  res.json({ ok: true });
}

const ANONYMISED_ADDRESS = {
  'address.fullName': 'Deleted user',
  'address.phone': '0000000000',
  'address.line1': 'Removed',
};

/** Anonymises the account: personal data goes, orders stay (without personal details). */
export async function deleteMe(req, res) {
  const { user } = req;
  if (user.passwordHash) {
    if (!req.body.password) {
      const message = 'Enter your password to delete your account.';
      throw ApiError.badRequest('PASSWORD_REQUIRED', message, { fields: { password: message } });
    }
    if (!(await user.checkPassword(req.body.password))) {
      const message = 'That password is incorrect.';
      throw ApiError.badRequest('INVALID_PASSWORD', message, { fields: { password: message } });
    }
  }

  const { _id: userId, email } = user;
  await Promise.all([
    Cart.deleteOne({ user: userId }),
    Wishlist.deleteOne({ user: userId }),
    Address.deleteMany({ user: userId }),
    PasswordReset.deleteMany({ user: userId }),
    StockAlert.deleteMany({ email }),
    Subscriber.deleteOne({ email }),
    ContactMessage.deleteMany({ $or: [{ user: userId }, { email }] }),
    Order.updateMany(
      { user: userId },
      { $set: ANONYMISED_ADDRESS, $unset: { 'address.line2': 1, 'address.landmark': 1, deliveryNote: 1, giftMessage: 1 } },
    ),
  ]);

  user.set({
    name: 'Deleted user',
    email: `deleted+${userId}@shopkart.invalid`,
    passwordHash: undefined,
    googleId: undefined,
    avatarUrl: undefined,
    phone: undefined,
    deletedAt: new Date(),
  });
  await user.save();
  clearAuthCookie(res);
  res.json({ ok: true });
}
