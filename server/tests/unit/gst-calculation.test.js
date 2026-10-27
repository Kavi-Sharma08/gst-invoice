import { describe, it, expect } from 'vitest';
import {
  roundToTwo,
  determineTaxType,
  calculateItemTotal,
  calculateInvoiceTotal
} from '../../src/modules/invoices/invoice-calculation.service.js';

describe('GST Calculation Service', () => {
  describe('roundToTwo', () => {
    it('rounds numbers to 2 decimal places with paise precision', () => {
      expect(roundToTwo(10.005)).toBe(10.01);
      expect(roundToTwo(10.004)).toBe(10);
      expect(roundToTwo(0)).toBe(0);
      expect(roundToTwo('15.456')).toBe(15.46);
    });
  });

  describe('determineTaxType', () => {
    it('determines INTRA for identical state names', () => {
      expect(determineTaxType('Maharashtra', 'Maharashtra')).toBe('INTRA');
      expect(determineTaxType('delhi', 'DELHI')).toBe('INTRA');
    });

    it('determines INTRA by state codes', () => {
      expect(determineTaxType('27', '27')).toBe('INTRA');
      expect(determineTaxType('Maharashtra', '27')).toBe('INTRA');
    });

    it('determines INTER for different states', () => {
      expect(determineTaxType('Maharashtra', 'Gujarat')).toBe('INTER');
      expect(determineTaxType('27', '24')).toBe('INTER');
      expect(determineTaxType('Delhi', 'Haryana')).toBe('INTER');
    });

    it('defaults to INTRA when either state is missing', () => {
      expect(determineTaxType('', 'Maharashtra')).toBe('INTRA');
      expect(determineTaxType('Maharashtra', null)).toBe('INTRA');
    });
  });

  describe('calculateItemTotal', () => {
    it('calculates INTRA tax correctly (split CGST and SGST equally)', () => {
      const item = {
        description: 'Web development service',
        quantity: 2,
        rate: 500,
        discount: 10, // 10% discount -> gross = 1000, discount = 100, taxable = 900
        gstRate: 18
      };

      const result = calculateItemTotal(item, 'INTRA');
      expect(result.grossAmount).toBe(1000);
      expect(result.discountAmount).toBe(100);
      expect(result.taxableAmount).toBe(900);
      expect(result.cgstRate).toBe(9);
      expect(result.sgstRate).toBe(9);
      expect(result.cgstAmount).toBe(81);
      expect(result.sgstAmount).toBe(81);
      expect(result.igstAmount).toBe(0);
      expect(result.totalTax).toBe(162);
      expect(result.totalAmount).toBe(1062);
    });

    it('calculates INTER tax correctly (IGST only)', () => {
      const item = {
        quantity: 1,
        rate: 1000,
        discount: 0,
        gstRate: 18
      };

      const result = calculateItemTotal(item, 'INTER');
      expect(result.taxableAmount).toBe(1000);
      expect(result.cgstAmount).toBe(0);
      expect(result.sgstAmount).toBe(0);
      expect(result.igstRate).toBe(18);
      expect(result.igstAmount).toBe(180);
      expect(result.totalTax).toBe(180);
      expect(result.totalAmount).toBe(1180);
    });

    it('handles zero GST rate items', () => {
      const item = {
        quantity: 5,
        rate: 200,
        discount: 0,
        gstRate: 0
      };

      const result = calculateItemTotal(item, 'INTRA');
      expect(result.taxableAmount).toBe(1000);
      expect(result.totalTax).toBe(0);
      expect(result.totalAmount).toBe(1000);
    });
  });

  describe('calculateInvoiceTotal', () => {
    it('aggregates multiple items and calculates net total and roundoff accurately', () => {
      const items = [
        { description: 'Item 1', quantity: 1, rate: 33.33, discount: 0, gstRate: 18 },
        { description: 'Item 2', quantity: 2, rate: 50.50, discount: 5, gstRate: 12 }
      ];

      const result = calculateInvoiceTotal(items, 'INTRA');
      expect(result.items.length).toBe(2);
      expect(result.grossAmount).toBeGreaterThan(0);
      expect(result.taxableAmount).toBeGreaterThan(0);
      expect(result.cgst).toBe(result.sgst);
      expect(result.igst).toBe(0);
      expect(result.netTotal).toBe(Math.round(result.grandTotal));
      expect(roundToTwo(result.grandTotal + result.roundOff)).toBe(result.netTotal);
    });
  });
});
