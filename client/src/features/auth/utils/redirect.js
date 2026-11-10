/**
 * URL validation and redirect resolution for authentication flows.
 */

/**
 * Checks whether a given redirect target is safe to navigate to internally.
 * - Must be within /app (exact match or /app/*).
 * - Accepts query strings (?) and hashes (#).
 * - Rejects protocol-relative URLs (//, /\, \\).
 * - Rejects any backslash (\) anywhere in the path part.
 * - Rejects ASCII control characters.
 * - Rejects external absolute URLs (e.g. https://evil.com).
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isSafeRedirectUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  // Reject ASCII control characters (0x00 - 0x1F, 0x7F)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return false;

  // Reject protocol-relative or backslash-based URL tricks
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.startsWith('\\')) {
    return false;
  }

  // Must begin with a leading slash
  if (!trimmed.startsWith('/')) {
    return false;
  }

  // Extract path part (before query '?' or hash '#')
  const pathPart = trimmed.split(/[?#]/)[0];

  // Reject backslashes in the path part
  if (pathPart.includes('\\')) {
    return false;
  }

  // Must be strictly '/app' or a sub-path starting with '/app/'
  return pathPart === '/app' || pathPart.startsWith('/app/');
}

/**
 * Resolves the safe redirect URL for sign-in and sign-up flows.
 * Precedence:
 *   1. `redirect_url` query parameter in search
 *   2. `state.from` (string or Location object)
 *   3. `fallback`
 *
 * @param {Object} options
 * @param {string} [options.search]
 * @param {Object} [options.state]
 * @param {string} [options.fallback='/app/dashboard']
 * @returns {string}
 */
export function resolveRedirectTarget({ search, state, fallback = '/app/dashboard' }) {
  // 1. Check URL query param redirect_url (if present and safe)
  if (search) {
    try {
      const params = new URLSearchParams(search);
      const paramTarget = params.get('redirect_url');
      if (paramTarget && isSafeRedirectUrl(paramTarget)) {
        return paramTarget.trim();
      }
    } catch {
      // Ignore URL parse error
    }
  }

  // 2. Fall back to location.state.from (if present and safe)
  if (state?.from) {
    let stateTarget = null;
    if (typeof state.from === 'string') {
      stateTarget = state.from;
    } else if (typeof state.from === 'object' && state.from.pathname) {
      stateTarget =
        state.from.pathname +
        (state.from.search || '') +
        (state.from.hash || '');
    }

    if (stateTarget && isSafeRedirectUrl(stateTarget)) {
      return stateTarget.trim();
    }
  }

  // 3. Fallback
  return fallback;
}
