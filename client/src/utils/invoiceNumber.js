import { getCurrentFinancialYear } from './date';

export const DEFAULT_INVOICE_PREFIX = `INV/${getCurrentFinancialYear()}/`;
export const DEFAULT_STARTING_NUMBER = 1;

/**
 * Parses the sequence number out of an existing invoice number using a prefix.
 */
function extractSequenceNumber(invoiceNumber, prefix) {
  if (!invoiceNumber || typeof invoiceNumber !== 'string') return null;
  if (!invoiceNumber.startsWith(prefix)) return null;

  const remainder = invoiceNumber.slice(prefix.length);
  const match = remainder.match(/^(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Generates the next sequential invoice number based on prefix, starting number, and existing invoices.
 */
export function generateNextInvoiceNumber(prefix = DEFAULT_INVOICE_PREFIX, startingNumber = 1, existingInvoices = []) {
  const cleanPrefix = prefix || DEFAULT_INVOICE_PREFIX;
  const startNum = Math.max(1, parseInt(startingNumber, 10) || 1);

  let highestNum = 0;

  for (const inv of existingInvoices) {
    const seq = extractSequenceNumber(inv.invoiceNumber, cleanPrefix);
    if (seq !== null && seq > highestNum) {
      highestNum = seq;
    }
  }

  const nextNum = Math.max(startNum, highestNum + 1);
  const padded = String(nextNum).padStart(3, '0');
  return `${cleanPrefix}${padded}`;
}

/**
 * Checks if an invoice number is already taken by another invoice.
 */
export function isDuplicateInvoiceNumber(invoiceNumber, currentInvoiceId, existingInvoices = []) {
  if (!invoiceNumber) return false;
  const normalized = invoiceNumber.trim().toLowerCase();

  return existingInvoices.some((inv) => {
    if (currentInvoiceId && inv.id === currentInvoiceId) return false;
    return (inv.invoiceNumber || '').trim().toLowerCase() === normalized;
  });
}
