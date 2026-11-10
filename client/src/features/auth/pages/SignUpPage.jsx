import React from 'react';
import { useLocation } from 'react-router-dom';
import { SignUp } from '@clerk/clerk-react';
import { PATHS } from '@/app/routes/paths';
import { clerkAppearance } from '../clerkAppearance';
import { resolveRedirectTarget } from '../utils/redirect';
import { AuthPageLayout } from '../components/AuthPageLayout';

export function SignUpPage() {
  const location = useLocation();
  const safeRedirectUrl = resolveRedirectTarget({
    search: location.search,
    state: location.state,
    fallback: PATHS.APP.DASHBOARD,
  });

  return (
    <AuthPageLayout
      title="Create your BillGST Account"
      subtitle="Get started with automated GST compliance and invoicing"
      redirectUrl={safeRedirectUrl}
    >
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
    </AuthPageLayout>
  );
}

export default SignUpPage;

