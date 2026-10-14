import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { ApiError } from '../utils/ApiError.js';

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

/** Verifies a Google Identity Services ID token and returns the trusted profile. */
export async function verifyGoogleCredential(credential) {
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: config.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw ApiError.unauthorized("Google sign-in couldn't be verified. Please try again.", 'GOOGLE_TOKEN_INVALID');
  }
  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw ApiError.unauthorized('Your Google account email is not verified.', 'GOOGLE_EMAIL_UNVERIFIED');
  }
  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split('@')[0],
    avatarUrl: payload.picture,
  };
}
