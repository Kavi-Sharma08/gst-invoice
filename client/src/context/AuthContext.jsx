/**
 * AuthContext — thin wrapper around Clerk hooks.
 *
 * Provides the same interface as the old custom auth context so that
 * existing consumers (App.jsx, pages, etc.) require zero changes:
 *   { user, isAuthenticated, isLoading, logout }
 *
 * Sign-in / sign-up is now handled by Clerk's hosted UI (SignIn / SignUp
 * components), so `login` and `register` functions are no longer needed.
 */

import { createContext, useContext } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // useUser gives us the Clerk User object and loading state
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut } = useClerk();

  /**
   * Normalised user shape expected by the rest of the app.
   * Clerk user IDs look like "user_2abc...".
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
        isAuthenticated: !!clerkUser,
        isLoading: !isLoaded,
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
