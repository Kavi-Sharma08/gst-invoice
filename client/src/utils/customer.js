/**
 * customer.js
 * Centralized helpers and constants for customer types.
 *
 * Supported customer types for new data:
 *   - 'registered'
 *   - 'unregistered'
 *
 * Backward compatibility:
 *   - Accepts legacy 'consumer', 'B2C', 'b2c' and maps them to 'unregistered'.
 *   - Accepts 'B2B', 'b2b' and maps them to 'registered'.
 */

export const CUSTOMER_TYPES = {
  REGISTERED: 'registered',
  UNREGISTERED: 'unregistered',
};

export const CUSTOMER_TYPE_OPTIONS = [
  { value: CUSTOMER_TYPES.REGISTERED, label: 'Registered' },
  { value: CUSTOMER_TYPES.UNREGISTERED, label: 'Unregistered' },
];

/**
 * Normalizes any legacy or new customer type string to either 'registered' or 'unregistered'.
 *
 * @param {string} value - The customer type to normalize
 * @returns {'registered' | 'unregistered'}
 */
export function normalizeCustomerType(value) {
  if (!value) return CUSTOMER_TYPES.REGISTERED;
  const val = String(value).trim().toLowerCase();
  if (val === 'unregistered' || val === 'consumer' || val === 'b2c') {
    return CUSTOMER_TYPES.UNREGISTERED;
  }
  return CUSTOMER_TYPES.REGISTERED;
}

/**
 * Returns the human-readable display label for a customer type.
 * Always returns 'Registered' or 'Unregistered' (never 'Consumer' or 'B2C').
 *
 * @param {string} value
 * @returns {'Registered' | 'Unregistered'}
 */
export function getCustomerTypeLabel(value) {
  return normalizeCustomerType(value) === CUSTOMER_TYPES.REGISTERED
    ? 'Registered'
    : 'Unregistered';
}

