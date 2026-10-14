import { z } from 'zod';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
export const idParams = z.object({ id: objectId });

export const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'));
export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');
export const phone = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');
export const pincode = z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code');

// Blank query values (`?page=`) behave as if they were omitted.
const blankToUndefined = (value) => (value === '' ? undefined : value);
export const optionalQuery = (schema) => z.preprocess(blankToUndefined, schema.optional());

export const pagination = {
  page: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).default(1)),
  limit: (max, fallback) => z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(max).default(fallback)),
};
