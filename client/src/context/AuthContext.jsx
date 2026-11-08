/**
 * AuthContext — thin wrapper around Clerk hooks.
 *
 * Provides the interface for consumers:
 *   { user, isAuthenticated, isLoading, isLoaded, isSignedIn, session, logout }
 *
 * Enforces that `isAuthenticated` and `isSignedIn` are only true when
 * `session.status === 'active'`, preventing pending session tasks from
 * triggering authenticated operations prematurely.
 */

import { createContext, useContext } from 'react';
import { useUser, useClerk, useSession } from '@clerk/clerk-react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { session, isLoaded: isSessionLoaded } = useSession();
  const { signOut } = useClerk();

  const isLoaded = Boolean(isUserLoaded && isSessionLoaded);
  const isActive = session?.status === 'active';

  /**
   * Normalised user shape expected by the rest of the app.
   */
  const user = clerkUser
    ? {
        id: clerkUser.id,
        name:
          clerkUser.fullName ||
          clerkUser.firstName ||
          clerkUser.username ||
          clerkUser.primaryEmailAddress?.emailAddress ||
          'User',
        email: clerkUser.primaryEmailAddress?.emailAddress || ''
      }
    : null;

  const logout = () => signOut();

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(clerkUser && isActive),
        isLoading: !isLoaded,
        isLoaded,
        isSignedIn: Boolean(clerkUser && isActive),
        session,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
