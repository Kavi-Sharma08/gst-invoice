/**
 * Centralized API HTTP client.
 * Attaches Clerk session tokens as Bearer auth headers,
 * normalizes errors, and handles timeouts.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const TIMEOUT_MS = 15000;

/**
 * Retrieves the current Clerk session token.
 * Falls back to null if Clerk is not yet initialized or user is signed out.
 * @returns {Promise<string|null>}
 */
async function getClerkToken() {
  try {
    if (typeof window === 'undefined') return null;

    // If Clerk is already ready with a session, return token immediately
    if (window.Clerk?.session) {
      return await window.Clerk.session.getToken();
    }

    // If Clerk is mounting, wait briefly (up to 1.5 seconds) for session to resolve
    if (window.Clerk && !window.Clerk.loaded) {
      await new Promise((resolve) => {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (window.Clerk?.loaded || window.Clerk?.session || attempts > 30) {
            clearInterval(interval);
            resolve();
          }
        }, 50);
      });
      if (window.Clerk?.session) {
        return await window.Clerk.session.getToken();
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const token = await getClerkToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 204) return null;

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data?.error?.message || `HTTP ${response.status}`);
      error.code = data?.error?.code;
      error.details = data?.error?.details;
      error.status = response.status;
      throw error;
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Request timed out. Please check your connection.');
      timeoutErr.code = 'TIMEOUT';
      throw timeoutErr;
    }
    throw err;
  }
}

export const apiClient = {
  get: (path, params) => {
    let url = path;
    if (params) {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          qs.append(k, String(v));
        }
      });
      const str = qs.toString();
      if (str) url += (url.includes('?') ? '&' : '?') + str;
    }
    return request(url, { method: 'GET' });
  },
  post: (path, body) =>
    request(path, {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  patch: (path, body) =>
    request(path, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),
  delete: (path) => request(path, { method: 'DELETE' })
};

export default apiClient;
