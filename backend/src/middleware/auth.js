import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const AUTH_COOKIE = 'sk_token';
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export const signToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role }, config.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: TOKEN_TTL_SECONDS,
  });

const cookieOptions = () =>
  config.isProd
    ? { httpOnly: true, secure: true, sameSite: 'none', domain: config.COOKIE_DOMAIN, path: '/' }
    : { httpOnly: true, sameSite: 'lax', path: '/' };

export const setAuthCookie = (res, token) =>
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: TOKEN_TTL_SECONDS * 1000 });

export const clearAuthCookie = (res) => res.clearCookie(AUTH_COOKIE, cookieOptions());

function readToken(req) {
  const header = req.get('authorization');
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  return req.cookies?.[AUTH_COOKIE] || null;
}

const sessionExpired = () => ApiError.unauthorized('Your session has expired. Please log in again.', 'SESSION_EXPIRED');

/** Resolves the session user, or null when there is no token. Throws on a bad session. */
async function sessionUser(req) {
  const token = readToken(req);
  if (!token) return null;

  let payload;
  try {
    payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw sessionExpired();
  }
  const user = await User.findById(payload.sub);
  if (!user || user.deletedAt) throw sessionExpired();
  return user;
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const user = await sessionUser(req);
  if (!user) throw ApiError.unauthorized();
  req.user = user;
  next();
});

/** For public routes that personalise when signed in: never rejects the request. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  try {
    req.user = (await sessionUser(req)) ?? undefined;
  } catch {
    req.user = undefined;
  }
  next();
});

/** Use after requireAuth. Responds 403 FORBIDDEN unless the user has the given role. */
export const requireRole = (role) => (req, _res, next) =>
  next(req.user?.role === role ? undefined : ApiError.forbidden());
