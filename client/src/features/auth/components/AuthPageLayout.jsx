import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { LoadingFallback } from '@/components/ui/LoadingFallback';

/**
 * Shared layout wrapper for authentication pages (SignIn, SignUp).
 * Handles loading fallback, already-authenticated redirects, and branding header.
 * All hooks run unconditionally at the top level.
 */
export function AuthPageLayout({ title, subtitle, children, redirectUrl }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingFallback message="Checking session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to={redirectUrl} replace />;
  }

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-10 px-4 bg-[var(--background)]">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] font-semibold text-lg mb-2 shadow-sm">
          ₹
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
        {subtitle && <p className="text-xs text-[var(--muted)] mt-1">{subtitle}</p>}
      </div>

      {children}
    </div>
  );
}

export default AuthPageLayout;

