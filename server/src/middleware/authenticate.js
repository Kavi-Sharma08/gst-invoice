import { getAuth } from '@clerk/express';
import { AppError } from '../shared/errors/app-error.js';
import { env } from '../config/env.js';
import { logger } from '../infrastructure/logging/logger.js';

function decodeJwtPayloadUnsafe(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const jsonStr = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Clerk authentication middleware.
 * Verifies Clerk session tokens and binds the authenticated Clerk user ID to req.user.id and req.auth.
 *
 * In production (NODE_ENV === 'production'):
 * Strictly enforces cryptographically verified Clerk sessions via getAuth(req).
 * No fallbacks or unverified decoding are allowed under any circumstances.
 */
export function authenticate(req, res, next) {
  // 1. Support automated testing bypass when in test environment with test user header
  if (env.NODE_ENV === 'test' && req.headers['x-test-user-id']) {
    req.user = {
      id: String(req.headers['x-test-user-id']),
      sessionId: 'test_session'
    };
    req.auth = { userId: String(req.headers['x-test-user-id']) };
    return next();
  }

  // 2. Verified Clerk authentication session (primary production path)
  let auth = null;
  try {
    auth = getAuth(req);
  } catch {
    // getAuth throws if clerkMiddleware was not initialized
  }

  if (auth && auth.userId) {
    req.user = {
      id: auth.userId,
      sessionId: auth.sessionId,
      claims: auth.sessionClaims
    };
    req.auth = auth;
    return next();
  }

  // 3. Explicit dev-only bypass: ONLY allowed when NODE_ENV === 'development' AND Clerk keys are placeholders
  const isDevWithPlaceholderKeys =
    env.NODE_ENV === 'development' &&
    (!env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY.includes('placeholder'));

  if (isDevWithPlaceholderKeys) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const payload = decodeJwtPayloadUnsafe(token);

      if (payload && (payload.sub || payload.userId)) {
        const userId = payload.sub || payload.userId;
        const sessionId = payload.sid || 'dev_session';
        req.user = {
          id: userId,
          sessionId,
          claims: payload
        };
        req.auth = {
          userId,
          sessionId,
          sessionClaims: payload
        };
        logger.warn('[SECURITY] Using dev-only unverified token decoding. Forbidden in production.', {
          userId
        });
        return next();
      }
    }
  }

  // 4. Reject unauthenticated requests with 401 Unauthorized
  return next(
    new AppError(
      'Authentication required. Missing, invalid, or expired Clerk session token.',
      401,
      'UNAUTHORIZED'
    )
  );
}
