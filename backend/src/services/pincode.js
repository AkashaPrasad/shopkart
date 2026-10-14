import { ApiError } from '../utils/ApiError.js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 2000;
const TIMEOUT_MS = 5000;
const cache = new Map();

function remember(pincode, value) {
  if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(pincode, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Resolves an Indian PIN code to { city, state, valid } via India Post, cached in memory. */
export async function lookupPincode(pincode) {
  const hit = cache.get(pincode);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  let body;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    body = await res.json();
  } catch {
    throw new ApiError(503, 'PINCODE_LOOKUP_UNAVAILABLE', "Couldn't look up that PIN code right now. Please enter city and state manually.");
  }

  const result = Array.isArray(body) ? body[0] : null;
  const office = result?.Status === 'Success' && Array.isArray(result.PostOffice) ? result.PostOffice[0] : null;
  const value = office
    ? { city: office.District, state: office.State, valid: true }
    : { city: null, state: null, valid: false };

  remember(pincode, value);
  return value;
}
