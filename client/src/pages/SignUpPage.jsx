import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { SignUp } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import { LoadingFallback } from '../components/ui/LoadingFallback';

export function SignUpPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const paramRedirect = searchParams.get('redirect_url');
  const stateRedirect = location.state?.from?.pathname;
  const redirectTarget = paramRedirect || stateRedirect || '/app/dashboard';
  const safeRedirectUrl = redirectTarget.startsWith('/app') ? redirectTarget : '/app/dashboard';

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
        path="/sign-up"
        signInUrl={`/sign-in${safeRedirectUrl !== '/app/dashboard' ? `?redirect_url=${encodeURIComponent(safeRedirectUrl)}` : ''}`}
        forceRedirectUrl={safeRedirectUrl}
        fallbackRedirectUrl="/app/dashboard"
        appearance={{
          variables: {
            colorPrimary: '#4F46E5',
            colorText: '#FAFAFA',
            colorBackground: '#111113',
            colorInputBackground: '#09090B',
            colorInputText: '#FAFAFA',
            borderRadius: '0.75rem'
          },
          elements: {
            card: 'shadow-sm border border-[#27272A] bg-[#111113]'
          }
        }}
      />
    </div>
  );
}

export default SignUpPage;
