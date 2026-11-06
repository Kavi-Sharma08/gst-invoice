import { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';

/**
 * Fast deep equality comparison for primitives, objects, and arrays.
 */
export function isDeepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!isDeepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Deep-comparison dirty tracking hook.
 *
 * @param {any} currentValues The live form state
 * @param {any} [initialValues] Baseline to compare against (defaults to currentValues on mount)
 * @returns {{ isDirty: boolean, resetBaseline: (newBaseline?: any) => void }}
 */
export function useUnsavedChanges(currentValues, initialValues = null) {
  const [baseline, setBaseline] = useState(() =>
    initialValues !== null ? initialValues : currentValues
  );

  const initialRef = useRef(initialValues);
  useEffect(() => {
    if (initialValues !== null && !isDeepEqual(initialRef.current, initialValues)) {
      initialRef.current = initialValues;
      setBaseline(initialValues);
    }
  }, [initialValues]);

  const isDirty = useMemo(() => {
    if (baseline === null || baseline === undefined) return false;
    return !isDeepEqual(baseline, currentValues);
  }, [baseline, currentValues]);

  const resetBaseline = useCallback(
    (newBaseline) => {
      setBaseline(newBaseline !== undefined ? newBaseline : currentValues);
    },
    [currentValues]
  );

  return { isDirty, resetBaseline };
}

/**
 * Intercepts router navigation and browser back/forward while dirty.
 *
 * @param {boolean} isBlocked Whether navigation is currently blocked
 * @param {(retry: () => void) => void} onBlockedNavigation Callback with resume function
 * @param {React.MutableRefObject<boolean>} [shouldBypassRef] Optional ref to allow navigation through
 */
export function useNavigationBlocker(isBlocked, onBlockedNavigation, shouldBypassRef = null) {
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const callbackRef = useRef(onBlockedNavigation);
  callbackRef.current = onBlockedNavigation;

  useEffect(() => {
    if (!isBlocked) return;

    const originalPush = navigator.push;
    const originalReplace = navigator.replace;

    navigator.push = (...args) => {
      if (shouldBypassRef?.current) {
        return originalPush.apply(navigator, args);
      }
      callbackRef.current(() => originalPush.apply(navigator, args));
    };

    navigator.replace = (...args) => {
      if (shouldBypassRef?.current) {
        return originalReplace.apply(navigator, args);
      }
      callbackRef.current(() => originalReplace.apply(navigator, args));
    };

    const handlePopState = () => {
      if (shouldBypassRef?.current) return;
      // Restore URL in browser address bar
      window.history.pushState(null, '', window.location.href);
      callbackRef.current(() => {
        if (shouldBypassRef) shouldBypassRef.current = true;
        window.history.back();
      });
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      navigator.push = originalPush;
      navigator.replace = originalReplace;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isBlocked, navigator, shouldBypassRef]);
}
