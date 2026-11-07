import { z } from 'zod';

// GSTIN format: 2-digit state code + 10-char PAN + 1 entity + Z + checksum
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Normalises any legacy or synonym customerType value to the canonical
 * 'registered' | 'unregistered' stored in the database.
 *
 * Accepted inputs (case-insensitive):
 *   registered, B2B, b2b        → 'registered'
 *   unregistered, B2C, b2c,
 *   consumer                    → 'unregistered'
 */
export function normalizeCustomerType(value) {
  if (!value) return 'registered';
  const v = String(value).trim().toLowerCase();
  if (v === 'unregistered' || v === 'b2c' || v === 'consumer') return 'unregistered';
  return 'registered'; // registered, B2B, b2b, or anything else
}

/**
 * Normalises an Indian phone number:
 *   - Strip spaces, dashes, dots, parens
 *   - Strip a leading +91 or 91 (if 12 or 13 digits remains 10)
 *   - Store digits only, max 20 chars (international fallback)
 */
export function normalizePhone(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/[\s\-().+]/g, '');
  // Strip leading country code +91 / 91 for 12-digit numbers
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 20);
}

// Zod transformer for customerType
const customerTypeSchema = z
  .string()
  .optional()
  .transform((v) => (v ? normalizeCustomerType(v) : 'registered'));

const gstinSchema = z
  .string()
  .optional()
  .default('')
  .transform((v) => (v ? v.trim().toUpperCase() : ''))
  .refine(
    (v) => v === '' || GSTIN_REGEX.test(v),
    { message: 'Invalid GSTIN format. Expected: 2-digit state + PAN + 1Z1 (e.g. 27AAAAA0000A1Z5)' }
  );

const phoneSchema = z
  .string()
  .optional()
  .default('')
  .transform((v) => normalizePhone(v))
  .refine(
    (v) => v === '' || (v.length <= 20),
    { message: 'Phone number must be at most 20 characters' }
  );

export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(150),
  customerType: customerTypeSchema,
  gstin: gstinSchema,
  address: z.string().max(500).optional().default(''),
  state: z.string().max(100).optional().default(''),
  email: z.string().email('Invalid email format').or(z.literal('')).optional().default(''),
  phone: phoneSchema
});

export const customerUpdateSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(150).optional(),
  customerType: customerTypeSchema.optional(),
  gstin: gstinSchema.optional(),
  address: z.string().max(500).optional(),
  state: z.string().max(100).optional(),
  email: z.string().email('Invalid email format').or(z.literal('')).optional(),
  phone: phoneSchema.optional()
});

export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  q: z.string().optional().default(''),
  archived: z.enum(['false', 'true', 'all']).optional().default('false'),
  sort: z.string().optional().default('-updatedAt')
});

export const customerSearchQuerySchema = z.object({
  q: z.string().optional().default(''),
  limit: z.coerce.number().int().min(1).max(20).optional().default(10)
});
