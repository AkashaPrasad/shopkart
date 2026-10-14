import { Router } from 'express';
import { z } from 'zod';
import * as addresses from '../controllers/addresses.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ADDRESS_TYPES } from '../models/Address.js';
import { idParams, phone, pincode } from '../schemas/common.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const text = (label, min, max) =>
  z.string().trim().min(min, `${label} is required`).max(max, `${label} must be at most ${max} characters`);
// Optional lines accept '', null or omission; empty values clear the field.
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .nullish()
    .transform((value) => value || undefined);

const addressFields = {
  fullName: text('Full name', 2, 80),
  phone,
  pincode,
  line1: text('Address line 1', 3, 120),
  line2: optionalText(120),
  landmark: optionalText(80),
  city: text('City', 2, 60),
  state: text('State', 2, 60),
  type: z.enum(ADDRESS_TYPES).default('home'),
  isDefault: z.boolean().optional(),
};

const createBody = z.object(addressFields);
const updateBody = z
  .object({ ...addressFields, type: z.enum(ADDRESS_TYPES) })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update' });
const pincodeParams = z.object({ pincode });

export const addressesRouter = Router();

addressesRouter.use(requireAuth);
addressesRouter.get('/', asyncHandler(addresses.listAddresses));
addressesRouter.post('/', validate({ body: createBody }), asyncHandler(addresses.createAddress));
addressesRouter.get('/pincode/:pincode', validate({ params: pincodeParams }), asyncHandler(addresses.pincodeLookup));
addressesRouter.patch('/:id', validate({ params: idParams, body: updateBody }), asyncHandler(addresses.updateAddress));
addressesRouter.delete('/:id', validate({ params: idParams }), asyncHandler(addresses.deleteAddress));
addressesRouter.post('/:id/default', validate({ params: idParams }), asyncHandler(addresses.setDefaultAddress));
