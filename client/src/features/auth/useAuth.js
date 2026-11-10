import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

/**
 * Hook to consume the authentication context.
 * Exposes:
 *   { user, isAuthenticated, isLoading, isLoaded, isSignedIn, sessionStatus, currentTask, logout }
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;

