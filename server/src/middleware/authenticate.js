import { getAuth } from '@clerk/express';
import { AppError } from '../shared/errors/app-error.js';
import { env } from '../config/env.js';

/**
 * Clerk authentication middleware.
 * Verifies Clerk session tokens securely and binds authenticated Clerk user ID to req.user.id and req.auth.
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

  const auth = getAuth(req);

  if (!auth || !auth.userId) {
    return next(
      new AppError(
        'Authentication required. Missing, invalid, or expired Clerk session token.',
        401,
        'UNAUTHORIZED'
      )
    );
  }

  // Preserve req.user.id for all existing controllers
  req.user = {
    id: auth.userId,
    sessionId: auth.sessionId,
    claims: auth.sessionClaims
  };
  req.auth = auth;

  next();
}
