import React from 'react';
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { PATHS } from '@/app/routes/paths';

export function SignInSsoCallback() {
  return <AuthenticateWithRedirectCallback signInForceRedirectUrl={PATHS.APP.DASHBOARD} />;
}

export function SignUpSsoCallback() {
  return <AuthenticateWithRedirectCallback signUpForceRedirectUrl={PATHS.APP.DASHBOARD} />;
}
