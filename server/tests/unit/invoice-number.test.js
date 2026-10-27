import { describe, it, expect } from 'vitest';
import { getCurrentFinancialYear } from '../../src/modules/invoices/invoice-number.service.js';

describe('Invoice Number Service', () => {
  it('returns valid financial year string format YY-YY', () => {
    const fy = getCurrentFinancialYear();
    expect(fy).toMatch(/^\d{2}-\d{2}$/);
  });
});
