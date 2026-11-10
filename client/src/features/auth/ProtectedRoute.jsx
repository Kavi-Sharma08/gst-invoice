import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { PATHS } from '@/app/routes/paths';
import { LoadingFallback } from '@/components/ui/LoadingFallback';
import { useAuth } from './useAuth';

/**
 * Route guard that ensures the user has a valid authenticated session.
 * - Displays loading fallback while auth resolution is pending.
 * - Requires `sessionStatus === 'active'`. If unauthenticated or pending,
 *   redirects to sign-in while preserving pathname, search, and hash.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading, isLoaded, sessionStatus } = useAuth();
  const location = useLocation();

  if (isLoading || !isLoaded) {
    return <LoadingFallback message="Verifying session..." />;
  }

  // Require both authentication and an active session status
  if (!isAuthenticated || sessionStatus !== 'active') {
    const fullPath = location.pathname + location.search + location.hash;
    const returnUrl = encodeURIComponent(fullPath);
    return (
      <Navigate
        to={`${PATHS.AUTH.SIGN_IN}?redirect_url=${returnUrl}`}
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}

export default ProtectedRoute;

