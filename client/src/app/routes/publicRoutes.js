import { lazy } from 'react';
import { PATHS } from '@/app/routes/paths';
import { SignInSsoCallback, SignUpSsoCallback } from './SsoCallbacks';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const SignInPage = lazy(() => import('@/pages/SignInPage'));
const SignUpPage = lazy(() => import('@/pages/SignUpPage'));

export const publicRoutes = [
  {
    path: PATHS.ROOT,
    Component: LandingPage,
  },
  {
    path: PATHS.AUTH.SSO_CALLBACK_SIGN_IN,
    Component: SignInSsoCallback,
  },
  {
    path: PATHS.AUTH.SSO_CALLBACK_SIGN_UP,
    Component: SignUpSsoCallback,
  },
  {
    path: `${PATHS.AUTH.SIGN_IN}/*`,
    Component: SignInPage,
  },
  {
    path: `${PATHS.AUTH.SIGN_UP}/*`,
    Component: SignUpPage,
  },
];

export default publicRoutes;

