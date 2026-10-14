import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const csv = (value) =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  // Comma-separated bind addresses; unset = all interfaces. On macOS use
  // "127.0.0.1,::1" because AirPlay Receiver already listens on *:5000.
  HOST: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() ? csv(value) : [])),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  CORS_ORIGINS: z.string().default('http://localhost:5173').transform(csv),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
  RAZORPAY_KEY_SECRET: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1, 'RAZORPAY_WEBHOOK_SECRET is required'),
  COOKIE_DOMAIN: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() ? value.trim() : undefined)),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  // Storefront origin used in emailed links (password reset, order emails).
  APP_URL: z
    .url()
    .default('https://shopkart.spacesdrive.cc')
    .transform((value) => value.replace(/\/+$/, '')),
  // Optional: emails are only logged when SMTP_URL is unset.
  SMTP_URL: z
    .string()
    .optional()
    .transform((value) => (value && value.trim() ? value.trim() : undefined)),
  MAIL_FROM: z.string().default('ShopKart <hello@shopkart.spacesdrive.cc>'),
  SELLER_ADDRESS: z.string().default('ShopKart, India'),
  SELLER_EMAIL: z.email().default('hello@shopkart.spacesdrive.cc'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
  console.error(`Invalid environment configuration:\n${lines.join('\n')}`);
  process.exit(1);
}

export const config = Object.freeze({
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
});
