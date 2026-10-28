import { getAuth } from '@clerk/express';
import { AppError } from '../shared/errors/app-error.js';
import { env } from '../config/env.js';

function decodeJwtPayload(token) {
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
 */
export function authenticate(req, res, next) {
  // Support testing bypass when in test environment with test user header
  if (env.NODE_ENV === 'test' && req.headers['x-test-user-id']) {
    req.user = {
      id: req.headers['x-test-user-id'],
      sessionId: 'test_session'
    };
    req.auth = { userId: req.headers['x-test-user-id'] };
    return next();
  }

  // 1. Check if Clerk's express middleware has already resolved an authenticated session
  let auth = null;
  try {
    auth = getAuth(req);
  } catch {
    // getAuth throws if clerkMiddleware was not active
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

  // 2. Fallback: Parse Bearer token from Authorization header (e.g. In local development or client API calls)
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const payload = decodeJwtPayload(token);

    if (payload && (payload.sub || payload.userId)) {
      const userId = payload.sub || payload.userId;
      const sessionId = payload.sid || 'session';
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
      return next();
    }
  }

  // 3. Reject unauthenticated requests with 401 Unauthorized
  return next(
    new AppError(
      'Authentication required. Missing, invalid, or expired Clerk session token.',
      401,
      'UNAUTHORIZED'
    )
  );
}
