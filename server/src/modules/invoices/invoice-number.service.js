import { InvoiceCounter } from './invoice-counter.model.js';
import { AppError } from '../../shared/errors/app-error.js';

/**
 * Returns current Indian Financial Year string (e.g. "26-27").
 */
export function getCurrentFinancialYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 is Jan, 3 is April
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  const startCode = String(startYear).slice(-2);
  const endCode = String(endYear).slice(-2);
  return `${startCode}-${endCode}`;
}

export function getDefaultPrefix() {
  return `INV/${getCurrentFinancialYear()}/`;
}

/**
 * Previews the next sequential invoice number without consuming the counter.
 * @param {string} userId
 * @param {string} [prefix]
 * @param {number} [startingNumber=1]
 * @returns {Promise<string>}
 */
export async function getPreviewNextInvoiceNumber(userId, prefix, startingNumber = 1) {
  const cleanPrefix = (prefix && prefix.trim()) || getDefaultPrefix();
  const startNum = Math.max(1, Number(startingNumber) || 1);

  const counter = await InvoiceCounter.findOne({ userId, prefix: cleanPrefix });
  const nextSeq = counter ? Math.max(counter.seq + 1, startNum) : startNum;

  const padded = String(nextSeq).padStart(3, '0');
  const invoiceNumber = `${cleanPrefix}${padded}`;

  if (invoiceNumber.length > 16) {
    throw new AppError(
      `Invoice number "${invoiceNumber}" exceeds the statutory 16-character limit (${invoiceNumber.length} chars). Adjust prefix or numbering.`,
      422,
      'INVOICE_NUMBER_EXCEEDS_LIMIT'
    );
  }

  return invoiceNumber;
}

/**
 * Atomically increments and returns the next sequential invoice number for a given prefix.
 * Guaranteed race-free under high concurrency.
 * @param {string} userId
 * @param {string} [prefix]
 * @param {number} [startingNumber=1]
 * @returns {Promise<string>}
 */
export async function allocateNextInvoiceNumber(userId, prefix, startingNumber = 1) {
  const cleanPrefix = (prefix && prefix.trim()) || getDefaultPrefix();
  const startNum = Math.max(1, Number(startingNumber) || 1);

  const counter = await InvoiceCounter.findOneAndUpdate(
    { userId, prefix: cleanPrefix },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  let seqNum = counter.seq;
  if (seqNum < startNum) {
    // If startingNumber was set higher than initial seq, align counter
    const updated = await InvoiceCounter.findOneAndUpdate(
      { userId, prefix: cleanPrefix, seq: { $lt: startNum } },
      { $set: { seq: startNum } },
      { new: true }
    );
    if (updated) {
      seqNum = updated.seq;
    }
  }

  const padded = String(seqNum).padStart(3, '0');
  const invoiceNumber = `${cleanPrefix}${padded}`;

  if (invoiceNumber.length > 16) {
    throw new AppError(
      `Allocated invoice number "${invoiceNumber}" exceeds the statutory 16-character limit (${invoiceNumber.length} chars).`,
      422,
      'INVOICE_NUMBER_EXCEEDS_LIMIT'
    );
  }

  return invoiceNumber;
}
