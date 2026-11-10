import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, clerkAppearance } from '@/features/auth';
import { queryClient } from '@/lib/queryClient';
import { PATHS } from '@/app/routes/paths';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const PROXY_URL = import.meta.env.VITE_CLERK_PROXY_URL;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Vite environment variable: VITE_CLERK_PUBLISHABLE_KEY');
}

/**
 * Root providers composition for BillGST.
 * Preserves strict provider nesting order:
 * ClerkProvider > QueryClientProvider > BrowserRouter > AuthProvider
 */
export function AppProviders({ children }) {
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      proxyUrl={PROXY_URL}
      appearance={clerkAppearance}
      signInFallbackRedirectUrl={PATHS.APP.DASHBOARD}
      signUpFallbackRedirectUrl={PATHS.APP.DASHBOARD}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            {children}
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default AppProviders;

