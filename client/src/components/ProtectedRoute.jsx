import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import { LoadingFallback } from './ui/LoadingFallback';

/**
 * Route guard that ensures the user has a valid authenticated Clerk session.
 * - Handles Clerk's loading state without prematurely redirecting.
 * - Requires `session.status === 'active'`. If the session is 'pending' or
 *   unauthenticated, redirects to /sign-in so pending tasks (e.g. choose-organization,
 *   setup-mfa) can be completed instead of loading pages that will 401 on API calls.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { session, isLoaded: isSessionLoaded } = useSession();
  const location = useLocation();

  if (isLoading || !isSessionLoaded) {
    return <LoadingFallback message="Verifying session..." />;
  }

  // Require both authentication and an active session status
  if (!isAuthenticated || session?.status !== 'active') {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return (
      <Navigate
        to={`/sign-in?redirect_url=${returnUrl}`}
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}

export default ProtectedRoute;
