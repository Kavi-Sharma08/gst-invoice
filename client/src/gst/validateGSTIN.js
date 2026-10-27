import { getStateByCode } from './taxRules';

/**
 * Validates the structure and format of an Indian 15-character GSTIN.
 * Pattern: 2 digits (State Code) + 5 letters (PAN) + 4 digits + 1 letter + 1 char + 'Z' + 1 checksum
 * Note: This only checks structural compliance and format validity.
 */
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGSTIN(gstin) {
  if (!gstin || typeof gstin !== 'string') {
    return {
      isValid: false,
      isEmpty: true,
      message: 'GSTIN is required for registered tax invoices'
    };
  }

  const trimmed = gstin.trim().toUpperCase();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      isEmpty: true,
      message: 'GSTIN is empty'
    };
  }

  if (trimmed.length !== 15) {
    return {
      isValid: false,
      isEmpty: false,
      value: trimmed,
      message: `GSTIN must be exactly 15 characters (currently ${trimmed.length})`
    };
  }

  if (!GSTIN_REGEX.test(trimmed)) {
    return {
      isValid: false,
      isEmpty: false,
      value: trimmed,
      message: 'Invalid GSTIN format (expected: 2 digits + 10-char PAN + 1 entity + Z + 1 check digit)'
    };
  }

  const stateCode = trimmed.slice(0, 2);
  const matchedState = getStateByCode(stateCode);

  return {
    isValid: true,
    isEmpty: false,
    value: trimmed,
    stateCode,
    stateName: matchedState ? matchedState.name : null,
    pan: trimmed.slice(2, 12),
    message: 'GSTIN format appears valid'
  };
}
