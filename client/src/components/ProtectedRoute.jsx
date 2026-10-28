import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingFallback } from './ui/LoadingFallback';

/**
 * Route guard that ensures the user has a valid authenticated Clerk session.
 * - Handles Clerk's loading state without prematurely redirecting.
 * - Redirects unauthenticated visitors to /sign-in, preserving return URL.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingFallback message="Verifying session..." />;
  }

  if (!isAuthenticated) {
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

