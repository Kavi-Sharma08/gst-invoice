import { describe, it, expect } from 'vitest';
import { invoiceCreateSchema } from '../../src/modules/invoices/invoices.schema.js';
import { calculateInvoiceTotal } from '../../src/modules/invoices/invoice-calculation.service.js';

describe('Validation Schemas & Security Protection', () => {
  describe('invoice creation schema', () => {
    it('accepts valid invoice payload', () => {
      const valid = {
        invoiceDate: '2026-10-27',
        customer: { name: 'Acme Corp', gstin: '27ABCDE1234F1Z5' },
        items: [
          {
            description: 'Consulting Services',
            quantity: 1,
            rate: 5000,
            gstRate: 18
          }
        ]
      };
      const result = invoiceCreateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invoice with no items or negative rate', () => {
      const invalidNoItems = {
        invoiceDate: '2026-10-27',
        items: []
      };
      expect(invoiceCreateSchema.safeParse(invalidNoItems).success).toBe(false);

      const invalidNegativeRate = {
        invoiceDate: '2026-10-27',
        items: [{ description: 'Test', quantity: 1, rate: -100, gstRate: 18 }]
      };
      expect(invoiceCreateSchema.safeParse(invalidNegativeRate).success).toBe(false);
    });
  });

  describe('authoritative calculation tamper protection', () => {
    it('authoritative calculateInvoiceTotal recalculates totals independently of client claims', () => {
      // Client tampered input: claims grandTotal is 100 when it should be 1180
      const tamperedItems = [
        {
          description: 'High Value Product',
          quantity: 1,
          rate: 1000,
          discount: 0,
          gstRate: 18,
          taxableAmount: 10, // tampered
          totalTax: 5,       // tampered
          totalAmount: 15    // tampered
        }
      ];

      const verified = calculateInvoiceTotal(tamperedItems, 'INTRA');
      // Server overrides tampered numbers:
      expect(verified.taxableAmount).toBe(1000);
      expect(verified.cgst).toBe(90);
      expect(verified.sgst).toBe(90);
      expect(verified.totalTax).toBe(180);
      expect(verified.grandTotal).toBe(1180);
      expect(verified.netTotal).toBe(1180);
    });
  });
});
