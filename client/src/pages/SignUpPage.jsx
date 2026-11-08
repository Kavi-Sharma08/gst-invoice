import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { SignUp } from '@clerk/clerk-react';
import { PATHS } from '@/app/routes/paths';
import { useAuth } from '../context/AuthContext';
import { LoadingFallback } from '../components/ui/LoadingFallback';
import { clerkAppearance } from '../lib/clerkAppearance';

export function SignUpPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const paramRedirect = searchParams.get('redirect_url');
  const stateRedirect = location.state?.from?.pathname;
  const redirectTarget = paramRedirect || stateRedirect || PATHS.APP.DASHBOARD;
  const safeRedirectUrl = redirectTarget.startsWith(PATHS.APP.ROOT) ? redirectTarget : PATHS.APP.DASHBOARD;

  if (isLoading) {
    return <LoadingFallback message="Checking session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to={safeRedirectUrl} replace />;
  }

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-10 px-4 bg-[var(--background)]">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] font-semibold text-lg mb-2 shadow-sm">
          ₹
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Create your BillGST Account</h1>
        <p className="text-xs text-[var(--muted)] mt-1">Get started with automated GST compliance and invoicing</p>
      </div>

      <SignUp
        routing="path"
        path={PATHS.AUTH.SIGN_UP}
        signInUrl={`${PATHS.AUTH.SIGN_IN}${safeRedirectUrl !== PATHS.APP.DASHBOARD ? `?redirect_url=${encodeURIComponent(safeRedirectUrl)}` : ''}`}
        forceRedirectUrl={safeRedirectUrl}
        fallbackRedirectUrl={PATHS.APP.DASHBOARD}
        signInForceRedirectUrl={PATHS.APP.DASHBOARD}
        signInFallbackRedirectUrl={PATHS.APP.DASHBOARD}
        appearance={clerkAppearance}
      />
    </div>
  );
}

export default SignUpPage;
