import React from 'react';
import { useLocation } from 'react-router-dom';
import { SignIn } from '@clerk/clerk-react';
import { PATHS } from '@/app/routes/paths';
import { clerkAppearance } from '../clerkAppearance';
import { resolveRedirectTarget } from '../utils/redirect';
import { AuthPageLayout } from '../components/AuthPageLayout';

export function SignInPage() {
  const location = useLocation();
  const safeRedirectUrl = resolveRedirectTarget({
    search: location.search,
    state: location.state,
    fallback: PATHS.APP.DASHBOARD,
  });

  return (
    <AuthPageLayout
      title="Sign in to BillGST"
      subtitle="Access your invoices and business records"
      redirectUrl={safeRedirectUrl}
    >
      <SignIn
        routing="path"
        path={PATHS.AUTH.SIGN_IN}
        signUpUrl={`${PATHS.AUTH.SIGN_UP}${safeRedirectUrl !== PATHS.APP.DASHBOARD ? `?redirect_url=${encodeURIComponent(safeRedirectUrl)}` : ''}`}
        forceRedirectUrl={safeRedirectUrl}
        fallbackRedirectUrl={PATHS.APP.DASHBOARD}
        signUpForceRedirectUrl={PATHS.APP.DASHBOARD}
        signUpFallbackRedirectUrl={PATHS.APP.DASHBOARD}
        appearance={clerkAppearance}
      />
    </AuthPageLayout>
  );
}

export default SignInPage;

