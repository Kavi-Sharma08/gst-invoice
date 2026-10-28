import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { SignIn } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import { LoadingFallback } from '../components/ui/LoadingFallback';

export function SignInPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const paramRedirect = searchParams.get('redirect_url');
  const stateRedirect = location.state?.from?.pathname;
  const redirectTarget = paramRedirect || stateRedirect || '/app/dashboard';
  // Ensure we only redirect internally within the app workspace
  const safeRedirectUrl = redirectTarget.startsWith('/app') ? redirectTarget : '/app/dashboard';

  if (isLoading) {
    return <LoadingFallback message="Checking session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to={safeRedirectUrl} replace />;
  }

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-10 px-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-slate-900 text-white font-bold text-lg mb-2 shadow-sm">
          ₹
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Sign in to BillGST</h1>
        <p className="text-xs text-slate-500 mt-1">Access your invoices and business records</p>
      </div>

      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl={`/sign-up${safeRedirectUrl !== '/app/dashboard' ? `?redirect_url=${encodeURIComponent(safeRedirectUrl)}` : ''}`}
        forceRedirectUrl={safeRedirectUrl}
        fallbackRedirectUrl="/app/dashboard"
        appearance={{
          variables: {
            colorPrimary: '#0f172a',
            colorText: '#1e293b',
            colorBackground: '#ffffff',
            borderRadius: '0.75rem'
          },
          elements: {
            card: 'shadow-sm border border-slate-200/90'
          }
        }}
      />
    </div>
  );
}

export default SignInPage;
