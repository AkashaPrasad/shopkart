import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { config } from '../config.js';
import { ApiError } from '../utils/ApiError.js';

const fieldsFromZod = (error) => {
  const fields = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_root';
    fields[key] ??= issue.message;
  }
  return fields;
};

const fieldsFromMongoose = (error) =>
  Object.fromEntries(Object.entries(error.errors).map(([path, err]) => [path, err.message]));

function normalise(err) {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    const fields = fieldsFromZod(err);
    const first = Object.values(fields)[0];
    return new ApiError(400, 'VALIDATION_ERROR', first || 'Please check your input.', { fields });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return new ApiError(400, 'VALIDATION_ERROR', 'Please check your input.', { fields: fieldsFromMongoose(err) });
  }
  if (err instanceof mongoose.Error.CastError) {
    return new ApiError(400, 'INVALID_ID', `Invalid value for ${err.path}.`);
  }
  if (err?.code === 11000) {
    const fields = Object.keys(err.keyValue ?? err.keyPattern ?? {});
    const message = fields.includes('email') ? 'That email is already registered.' : 'That record already exists.';
    return new ApiError(409, 'DUPLICATE', message, { fields });
  }
  if (err?.type === 'entity.parse.failed') return new ApiError(400, 'INVALID_JSON', 'Request body is not valid JSON.');
  if (err?.type === 'entity.too.large') return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
  return null;
}

export const notFound = (req, _res, next) =>
  next(ApiError.notFound('ROUTE_NOT_FOUND', `No route for ${req.method} ${req.originalUrl}.`));

// Express identifies error middleware by its four-argument signature, so `_next` must stay.
export function errorHandler(err, req, res, _next) {
  const known = normalise(err);
  if (known) {
    const body = { code: known.code, message: known.message };
    if (known.details !== undefined) body.details = known.details;
    return res.status(known.status).json({ error: body });
  }

  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  const body = { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side. Please try again.' };
  if (!config.isProd) body.details = { stack: err?.stack };
  return res.status(500).json({ error: body });
}
