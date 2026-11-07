/**
 * shared/utils/regex.js
 * Shared regex utility used by customers and invoices services.
 */

/**
 * Escapes all regex metacharacters so a user-supplied string can be used
 * safely inside a RegExp constructor without triggering ReDoS or unintended matches.
 *
 * @param {string} string
 * @returns {string}
 */
export function escapeRegex(string) {
  if (!string || typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

