/**
 * Centralized API HTTP client.
 * Attaches Clerk session tokens as Bearer auth headers,
 * normalizes responses to standard { data, meta } shape while preserving
 * backwards compatibility for { success, data }, and provides typed ApiError.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(message, status = 500, code = 'API_ERROR', fields = null, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields || null;
    this.details = details || null;
  }
}

/**
 * Retrieves the current Clerk session token.
 * Falls back to null if Clerk is not yet initialized or user is signed out.
 * @returns {Promise<string|null>}
 */
async function getClerkToken() {
  try {
    if (typeof window === 'undefined') return null;

    if (window.Clerk?.session) {
      return await window.Clerk.session.getToken();
    }

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

    if (response.status === 204) return { data: null, meta: null };

    const raw = await response.json();

    if (!response.ok) {
      const err = raw?.error || raw || {};
      const message = err.message || (typeof err === 'string' ? err : `HTTP ${response.status}`);
      const code = err.code || 'API_ERROR';
      const fields = err.fields || null;
      const details = err.details || null;
      throw new ApiError(message, response.status, code, fields, details);
    }

    // Standardize response to { data, meta } while maintaining backwards compatibility
    const data = raw.data !== undefined ? raw.data : raw;
    let meta = raw.meta !== undefined ? raw.meta : null;

    // If legacy list format { data: { items: [...], total, page, limit } }
    if (!meta && data && typeof data === 'object' && !Array.isArray(data)) {
      if (typeof data.total === 'number') {
        meta = {
          total: data.total,
          page: data.page ?? 1,
          limit: data.limit ?? 10
        };
      }
    }

    return {
      success: raw.success !== undefined ? raw.success : true,
      data,
      meta,
      ...raw
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your connection.', 408, 'TIMEOUT');
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
  put: (path, body) =>
    request(path, {
      method: 'PUT',
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
