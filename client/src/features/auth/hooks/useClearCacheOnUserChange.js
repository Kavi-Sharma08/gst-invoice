import { useEffect, useRef } from 'react';
import { queryClient } from '@/lib/queryClient';

/**
 * Clears the TanStack Query cache on sign-out or account switch.
 *
 * Rules:
 * - Keyed strictly on Clerk's user ID so pending-to-active session transitions do not clear.
 * - Initial load (visitor or logged-in user) -> never clear.
 * - A -> null (sign out) or A -> B (account switch) -> clear.
 * - null -> A on fresh page load -> never clear.
 * - null -> A after another user already existed in this browser tab -> clear.
 *
 * @param {string|null|undefined} userId Clerk user ID (e.g. clerkUser?.id)
 * @param {boolean} isLoaded Whether Clerk authentication state has resolved
 */
export function useClearCacheOnUserChange(userId, isLoaded) {
  // Track whether initial auth state has been evaluated on this page load
  const isInitializedRef = useRef(false);
  // Track whether this tab session has previously observed an active user
  const hasSeenUserRef = useRef(false);
  // Track the most recent user ID
  const lastUserIdRef = useRef(null);

  useEffect(() => {
    if (!isLoaded) return;

    const currentId = userId || null;

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      lastUserIdRef.current = currentId;
      if (currentId) {
        hasSeenUserRef.current = true;
      }
      return; // Do not clear on initial page load
    }

    const previousId = lastUserIdRef.current;

    if (previousId !== currentId) {
      // Clear if a user signed out (A -> null), switched accounts (A -> B),
      // or signed in after a previous user existed in this tab (null -> A with hasSeenUser)
      if (previousId || hasSeenUserRef.current) {
        queryClient.clear();
      }

      lastUserIdRef.current = currentId;
      if (currentId) {
        hasSeenUserRef.current = true;
      }
    }
  }, [userId, isLoaded]);
}

export default useClearCacheOnUserChange;
