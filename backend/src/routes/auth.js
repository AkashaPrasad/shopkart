import { Router } from 'express';
import { z } from 'zod';
import * as auth from '../controllers/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { email, password, phone } from '../schemas/common.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long');

const registerBody = z.object({ name, email, password });
const loginBody = z.object({ email, password: z.string().min(1, 'Enter your password').max(128) });
const googleBody = z.object({ credential: z.string().min(10, 'Missing Google credential').max(4096) });
const updateMeBody = z.object({ name: name.optional(), phone: z.union([phone, z.literal('')]).optional() });
const forgotBody = z.object({ email });
const resetBody = z.object({ token: z.string().trim().min(1, 'Missing reset token').max(200), password });
const deleteMeBody = z.object({ password: z.string().max(128).optional() });
const changePasswordBody = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(128),
  newPassword: password,
});

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate({ body: registerBody }), asyncHandler(auth.register));
authRouter.post('/login', authLimiter, validate({ body: loginBody }), asyncHandler(auth.login));
authRouter.post('/google', authLimiter, validate({ body: googleBody }), asyncHandler(auth.googleSignIn));
authRouter.post('/logout', auth.logout);
authRouter.get('/me', requireAuth, auth.me);
authRouter.patch('/me', requireAuth, validate({ body: updateMeBody }), asyncHandler(auth.updateMe));
authRouter.delete('/me', requireAuth, validate({ body: deleteMeBody }), asyncHandler(auth.deleteMe));
authRouter.post('/forgot-password', authLimiter, validate({ body: forgotBody }), asyncHandler(auth.forgotPassword));
authRouter.post('/reset-password', authLimiter, validate({ body: resetBody }), asyncHandler(auth.resetPassword));
authRouter.post(
  '/change-password',
  authLimiter,
  requireAuth,
  validate({ body: changePasswordBody }),
  asyncHandler(auth.changePassword),
);
