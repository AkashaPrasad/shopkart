import { Router } from 'express';
import { z } from 'zod';
import * as misc from '../controllers/misc.js';
import { optionalAuth } from '../middleware/auth.js';
import { formLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { email } from '../schemas/common.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const text = (label, min, max) =>
  z.string().trim().min(min, `${label} is required`).max(max, `${label} must be at most ${max} characters`);

const newsletterBody = z.object({ email });
const contactBody = z.object({
  name: text('Name', 2, 80),
  email,
  subject: text('Subject', 2, 120),
  message: text('Message', 10, 2000),
});

export const miscRouter = Router();

miscRouter.post('/newsletter', formLimiter, validate({ body: newsletterBody }), asyncHandler(misc.subscribe));
miscRouter.post('/contact', formLimiter, optionalAuth, validate({ body: contactBody }), asyncHandler(misc.contact));
