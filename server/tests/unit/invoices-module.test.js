import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import {
  escapeRegex,
  issueInvoice,
  updateDraftInvoice,
  deleteDraftInvoice,
  cancelInvoice,
  markInvoicePaid,
  markInvoiceUnpaid
} from '../../src/modules/invoices/invoices.service.js';
import {
  allocateNextInvoiceNumber,
  getPreviewNextInvoiceNumber
} from '../../src/modules/invoices/invoice-number.service.js';
import { Invoice } from '../../src/modules/invoices/invoices.model.js';
import { InvoiceCounter } from '../../src/modules/invoices/invoice-counter.model.js';
import { BusinessProfile } from '../../src/modules/business/business.model.js';

describe('Invoices Module Server Rules & Business Logic', () => {
  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/billgst';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  beforeEach(async () => {
    // If mongo is connected in test run, clean test fixtures
    if (mongoose.connection.readyState === 1) {
      await Invoice.deleteMany({ userId: 'test_user_unit' });
      await InvoiceCounter.deleteMany({ userId: 'test_user_unit' });
      await BusinessProfile.deleteMany({ userId: 'test_user_unit' });
    }
  });

  afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await Invoice.deleteMany({ userId: 'test_user_unit' });
      await InvoiceCounter.deleteMany({ userId: 'test_user_unit' });
      await BusinessProfile.deleteMany({ userId: 'test_user_unit' });
    }
  });

  describe('q escaping helper', () => {
    it('escapes regex special characters safely against ReDoS', () => {
      const dangerousInputs = [
        '(.*)*',
        'INV[0-9]+',
        'Acme (Corp)',
        'Test+User?^$|{}',
        '\\d+\\w+'
      ];

      for (const input of dangerousInputs) {
        const escaped = escapeRegex(input);
        expect(() => new RegExp(escaped, 'i')).not.toThrow();
        // The escaped regex must match the literal string
        const regex = new RegExp(escaped, 'i');
        expect(regex.test(input)).toBe(true);
      }
    });

    it('handles empty or non-string inputs gracefully', () => {
      expect(escapeRegex('')).toBe('');
      expect(escapeRegex(null)).toBe('');
      expect(escapeRegex(undefined)).toBe('');
    });
  });

  describe('Invoice numbering service', () => {
    it('previews next invoice number without consuming sequence', async () => {
      const userId = `test_user_preview_${Date.now()}`;
      const prefix = 'INV/26-27/';

      // First preview
      const preview1 = await getPreviewNextInvoiceNumber(userId, prefix, 1);
      expect(preview1).toBe('INV/26-27/001');

      // Second preview without allocation should still be 001
      const preview2 = await getPreviewNextInvoiceNumber(userId, prefix, 1);
      expect(preview2).toBe('INV/26-27/001');

      // Now allocate 1
      const allocated1 = await allocateNextInvoiceNumber(userId, prefix, 1);
      expect(allocated1).toBe('INV/26-27/001');

      // Preview should now show 002
      const preview3 = await getPreviewNextInvoiceNumber(userId, prefix, 1);
      expect(preview3).toBe('INV/26-27/002');
    });

    it('guarantees unique consecutive numbers under parallel allocations', async () => {
      const userId = `test_user_parallel_${Date.now()}`;
      const prefix = 'INV/TEST/';

      // Run 10 parallel allocations concurrently
      const promises = Array.from({ length: 10 }, () =>
        allocateNextInvoiceNumber(userId, prefix, 1)
      );
      const allocatedNumbers = await Promise.all(promises);

      // Verify every number is unique
      const uniqueSet = new Set(allocatedNumbers);
      expect(uniqueSet.size).toBe(10);

      // Verify all numbers match expected prefix and 3-digit padding
      for (let i = 1; i <= 10; i++) {
        const expected = `INV/TEST/${String(i).padStart(3, '0')}`;
        expect(allocatedNumbers).toContain(expected);
      }
    });

    it('rejects invoice numbers exceeding the statutory 16-character GST limit', async () => {
      const userId = `test_user_long_${Date.now()}`;
      const longPrefix = 'MYVERYLONGBUSINESSPREFIX/'; // 25 characters

      await expect(
        allocateNextInvoiceNumber(userId, longPrefix, 1)
      ).rejects.toThrow(/16-character limit/);

      await expect(
        getPreviewNextInvoiceNumber(userId, longPrefix, 1)
      ).rejects.toThrow(/16-character limit/);
    });
  });

  describe('Issue rules and validation', () => {
    it('rejects issue when items array is empty (422)', async () => {
      const userId = 'test_user_unit';
      const insertResult = await Invoice.collection.insertOne({
        userId,
        status: 'Draft',
        customer: { name: 'Acme Corp' },
        placeOfSupply: 'Maharashtra',
        items: [],
        netTotal: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await expect(issueInvoice(userId, insertResult.insertedId.toString())).rejects.toMatchObject({
        statusCode: 422,
        code: 'ISSUE_VALIDATION_FAILED'
      });
    });

    it('rejects issue when netTotal is 0 (422)', async () => {
      const userId = 'test_user_unit';
      const draft = await Invoice.create({
        userId,
        status: 'Draft',
        customer: { name: 'Acme Corp' },
        placeOfSupply: 'Maharashtra',
        items: [{ description: 'Item 1', quantity: 1, rate: 0, gstRate: 0 }],
        netTotal: 0
      });

      await expect(issueInvoice(userId, draft._id.toString())).rejects.toMatchObject({
        statusCode: 422,
        code: 'ISSUE_VALIDATION_FAILED'
      });
    });

    it('rejects issue when customer name or place of supply is missing (422)', async () => {
      const userId = 'test_user_unit';
      const draft = await Invoice.create({
        userId,
        status: 'Draft',
        customer: { name: '' },
        placeOfSupply: '',
        items: [{ description: 'Item 1', quantity: 1, rate: 500, gstRate: 18 }],
        netTotal: 590
      });

      await expect(issueInvoice(userId, draft._id.toString())).rejects.toMatchObject({
        statusCode: 422,
        code: 'ISSUE_VALIDATION_FAILED'
      });
    });

    it('rejects issue when customer has an invalid GSTIN format (422)', async () => {
      const userId = 'test_user_unit';
      const draft = await Invoice.create({
        userId,
        status: 'Draft',
        customer: { name: 'Acme Corp', gstin: 'INVALID_GSTIN_123' },
        placeOfSupply: 'Maharashtra',
        items: [{ description: 'Item 1', quantity: 1, rate: 500, gstRate: 18 }],
        netTotal: 590
      });

      await expect(issueInvoice(userId, draft._id.toString())).rejects.toMatchObject({
        statusCode: 422,
        code: 'ISSUE_VALIDATION_FAILED'
      });
    });
  });

  describe('Read-only enforcement and status transitions', () => {
    it('blocks updating non-draft invoices with 409 Conflict', async () => {
      const userId = 'test_user_unit';
      const issued = await Invoice.create({
        userId,
        invoiceNumber: 'INV/26-27/099',
        status: 'Issued',
        customer: { name: 'Acme Corp' },
        placeOfSupply: 'Maharashtra',
        items: [{ description: 'Item 1', quantity: 1, rate: 500, gstRate: 18 }],
        netTotal: 590
      });

      await expect(
        updateDraftInvoice(userId, issued._id.toString(), { notes: 'Tampered note' })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'INVOICE_NOT_DRAFT'
      });
    });

    it('blocks deleting non-draft invoices with 409 Conflict', async () => {
      const userId = 'test_user_unit';
      const issued = await Invoice.create({
        userId,
        invoiceNumber: 'INV/26-27/098',
        status: 'Issued',
        customer: { name: 'Acme Corp' },
        placeOfSupply: 'Maharashtra',
        items: [{ description: 'Item 1', quantity: 1, rate: 500, gstRate: 18 }],
        netTotal: 590
      });

      await expect(
        deleteDraftInvoice(userId, issued._id.toString())
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'INVOICE_NOT_DRAFT'
      });
    });

    it('blocks cancelling a Paid invoice directly; requires mark unpaid first', async () => {
      const userId = 'test_user_unit';
      const paid = await Invoice.create({
        userId,
        invoiceNumber: 'INV/26-27/097',
        status: 'Paid',
        customer: { name: 'Acme Corp' },
        placeOfSupply: 'Maharashtra',
        items: [{ description: 'Item 1', quantity: 1, rate: 500, gstRate: 18 }],
        netTotal: 590
      });

      // Direct cancel should fail with 409
      await expect(cancelInvoice(userId, paid._id.toString())).rejects.toMatchObject({
        statusCode: 409
      });

      // Mark unpaid should succeed
      const unpaid = await markInvoiceUnpaid(userId, paid._id.toString());
      expect(unpaid.status).toBe('Issued');

      // Now cancel should succeed
      const cancelled = await cancelInvoice(userId, paid._id.toString());
      expect(cancelled.status).toBe('Cancelled');
    });

    it('enforces ownership checks on all operations', async () => {
      const ownerId = 'test_user_owner';
      const intruderId = 'test_user_intruder';

      const draft = await Invoice.create({
        userId: ownerId,
        status: 'Draft',
        customer: { name: 'Acme Corp' },
        placeOfSupply: 'Maharashtra',
        items: [{ description: 'Item 1', quantity: 1, rate: 500, gstRate: 18 }],
        netTotal: 590
      });

      // Intruder attempting to update owner's invoice
      await expect(
        updateDraftInvoice(intruderId, draft._id.toString(), { notes: 'Hacked' })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'INVOICE_NOT_FOUND'
      });

      // Intruder attempting to issue owner's invoice
      await expect(
        issueInvoice(intruderId, draft._id.toString())
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'INVOICE_NOT_FOUND'
      });

      // Intruder attempting to delete owner's invoice
      await expect(
        deleteDraftInvoice(intruderId, draft._id.toString())
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'INVOICE_NOT_FOUND'
      });

      // Clean up
      await Invoice.deleteOne({ _id: draft._id });
    });
  });
});
