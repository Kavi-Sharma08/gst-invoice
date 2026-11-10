import React, { useMemo, useCallback } from 'react';
import { useUser, useClerk, useSession } from '@clerk/clerk-react';
import { AuthContext } from './useAuth';
import { useClearCacheOnUserChange } from './hooks/useClearCacheOnUserChange';

/**
 * Authentication Context Provider.
 * Wraps Clerk user and session states, exposes memoized user and status properties,
 * and handles React Query cache eviction when the logged-in user changes.
 */
export function AuthProvider({ children }) {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { session, isLoaded: isSessionLoaded } = useSession();
  const { signOut } = useClerk();

  const isLoaded = Boolean(isUserLoaded && isSessionLoaded);
  const isActive = session?.status === 'active';
  const sessionStatus = session?.status ?? null;
  const currentTask = session?.currentTask?.key ?? null;

  // Clear query cache on user switch or sign-out (keyed on Clerk user id)
  useClearCacheOnUserChange(clerkUser?.id, isLoaded);

  const user = useMemo(() => {
    if (!clerkUser) return null;
    return {
      id: clerkUser.id,
      name:
        clerkUser.fullName ||
        clerkUser.firstName ||
        clerkUser.username ||
        clerkUser.primaryEmailAddress?.emailAddress ||
        'User',
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
    };
  }, [clerkUser]);

  const logout = useCallback(() => signOut(), [signOut]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(clerkUser && isActive),
      isLoading: !isLoaded,
      isLoaded,
      isSignedIn: Boolean(clerkUser && isActive),
      sessionStatus,
      currentTask,
      logout,
    }),
    [user, clerkUser, isActive, isLoaded, sessionStatus, currentTask, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
