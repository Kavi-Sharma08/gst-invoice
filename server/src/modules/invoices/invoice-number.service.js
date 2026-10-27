import { InvoiceCounter } from './invoice-counter.model.js';

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

/**
 * Atomically increments and returns the next sequential invoice number for a given prefix.
 * Guaranteed race-free under high concurrency.
 * @param {string} userId
 * @param {string} [prefix]
 * @param {number} [startingNumber=1]
 * @returns {Promise<string>}
 */
export async function allocateNextInvoiceNumber(userId, prefix, startingNumber = 1) {
  const cleanPrefix = prefix || `INV/${getCurrentFinancialYear()}/`;

  const counter = await InvoiceCounter.findOneAndUpdate(
    { userId, prefix: cleanPrefix },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  let seqNum = counter.seq;
  if (seqNum < startingNumber) {
    // If startingNumber is set higher, align counter
    const updated = await InvoiceCounter.findOneAndUpdate(
      { userId, prefix: cleanPrefix, seq: { $lt: startingNumber } },
      { $set: { seq: startingNumber } },
      { new: true }
    );
    if (updated) {
      seqNum = updated.seq;
    }
  }

  const padded = String(seqNum).padStart(3, '0');
  return `${cleanPrefix}${padded}`;
}
