import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Customer } from '../../src/modules/customers/customers.model.js';
import { Invoice } from '../../src/modules/invoices/invoices.model.js';
import {
  listCustomers,
  searchCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  archiveCustomer,
  unarchiveCustomer,
  getOwnedCustomer
} from '../../src/modules/customers/customers.service.js';
import { normalizeCustomerType, normalizePhone } from '../../src/modules/customers/customers.schema.js';

// ── Test helpers ──────────────────────────────────────────────────────────────
const TEST_USER   = 'test_cust_user_unit';
const OTHER_USER  = 'test_cust_other_user';

function makeCustomer(overrides = {}) {
  return {
    userId: TEST_USER,
    name: 'Test Company',
    customerType: 'registered',
    gstin: '',
    state: 'Maharashtra',
    email: 'test@example.com',
    phone: '9876543210',
    address: '123 Main St',
    isArchived: false,
    ...overrides
  };
}

async function insertCustomer(overrides = {}) {
  return Customer.create(makeCustomer(overrides));
}

// ── Setup ─────────────────────────────────────────────────────────────────────
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
  if (mongoose.connection.readyState === 1) {
    await Customer.deleteMany({ userId: { $in: [TEST_USER, OTHER_USER] } });
    await Invoice.deleteMany({ userId: { $in: [TEST_USER, OTHER_USER] } });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
describe('Customers Module — Server Tests', () => {

  // ── 1. customerType normalisation ─────────────────────────────────────────
  describe('customerType normalisation (schema helper)', () => {
    it.each([
      ['registered',   'registered'],
      ['unregistered', 'unregistered'],
      ['B2B',          'registered'],
      ['b2b',          'registered'],
      ['B2C',          'unregistered'],
      ['b2c',          'unregistered'],
      ['consumer',     'unregistered'],
      ['CONSUMER',     'unregistered'],
      [undefined,      'registered'],
      [null,           'registered'],
      ['',             'registered'],
      ['random',       'registered'],  // unknown → registered
    ])('normalizeCustomerType(%s) → %s', (input, expected) => {
      expect(normalizeCustomerType(input)).toBe(expected);
    });
  });

  // ── 2. Phone normalisation ────────────────────────────────────────────────
  describe('phone normalisation', () => {
    it.each([
      ['9876543210',    '9876543210'],
      ['+91 98765 43210', '9876543210'],
      ['91-9876543210', '9876543210'],
      ['(0)98765-43210', '09876543210'],  // strips parens and dashes, keeps digits
      ['',              ''],
      [undefined,       ''],
    ])('normalizePhone(%s) → %s', (input, expected) => {
      expect(normalizePhone(input)).toBe(expected);
    });
  });

  // ── 3. GSTIN format validation ────────────────────────────────────────────
  describe('GSTIN format validation (via createCustomer)', () => {
    it('accepts a valid GSTIN', async () => {
      const { customer } = await createCustomer(TEST_USER, {
        name: 'Valid GSTIN Co',
        gstin: '27AAAAA0000A1Z5',
        state: 'Maharashtra'
      });
      expect(customer.gstin).toBe('27AAAAA0000A1Z5');
    });

    it('returns state-mismatch warning when GSTIN state code differs from state', async () => {
      // 07 = Delhi, but state is Maharashtra
      const { warnings } = await createCustomer(TEST_USER, {
        name: 'Mismatch Co',
        gstin: '07AAAAA0000A1Z5',
        state: 'Maharashtra'
      });
      const mismatch = warnings.find(w => w.code === 'GSTIN_STATE_MISMATCH');
      expect(mismatch).toBeDefined();
      expect(mismatch.message).toContain('Delhi');
    });

    it('does NOT return state-mismatch warning when codes match', async () => {
      // 27 = Maharashtra
      const { warnings } = await createCustomer(TEST_USER, {
        name: 'Match Co',
        gstin: '27AAAAA0000A1Z5',
        state: 'Maharashtra'
      });
      const mismatch = warnings.find(w => w.code === 'GSTIN_STATE_MISMATCH');
      expect(mismatch).toBeUndefined();
    });
  });

  // ── 4. Duplicate GSTIN 409 with details ──────────────────────────────────
  describe('duplicate GSTIN handling', () => {
    it('returns 409 DUPLICATE_GSTIN with existingId, existingName, isArchived on create', async () => {
      const existing = await insertCustomer({ gstin: '27AAAAA0000A1Z5' });

      await expect(
        createCustomer(TEST_USER, { name: 'New Co', gstin: '27AAAAA0000A1Z5', state: 'Maharashtra' })
      ).rejects.toMatchObject({
        code: 'DUPLICATE_GSTIN',
        statusCode: 409,
        fields: {
          existingId: existing._id.toString(),
          existingName: 'Test Company',
          isArchived: false
        }
      });
    });

    it('includes isArchived: true when the duplicate is an archived customer', async () => {
      const existing = await insertCustomer({ gstin: '27AAAAA0000A1Z5', isArchived: true });

      await expect(
        createCustomer(TEST_USER, { name: 'New Co', gstin: '27AAAAA0000A1Z5', state: 'Maharashtra' })
      ).rejects.toMatchObject({
        code: 'DUPLICATE_GSTIN',
        fields: {
          existingId: existing._id.toString(),
          isArchived: true
        }
      });
    });

    it('allows updating a customer to keep its own GSTIN', async () => {
      const c = await insertCustomer({ gstin: '27AAAAA0000A1Z5' });
      const { customer } = await updateCustomer(TEST_USER, c._id.toString(), { name: 'Renamed' });
      expect(customer.name).toBe('Renamed');
      expect(customer.gstin).toBe('27AAAAA0000A1Z5');
    });

    it('rejects update when new GSTIN belongs to a different customer', async () => {
      await insertCustomer({ gstin: '27AAAAA0000A1Z5' });
      const c2 = await insertCustomer({ name: 'Second Co', gstin: '' });

      await expect(
        updateCustomer(TEST_USER, c2._id.toString(), { gstin: '27AAAAA0000A1Z5' })
      ).rejects.toMatchObject({ code: 'DUPLICATE_GSTIN' });
    });
  });

  // ── 5. Delete 409 when customer has invoices ──────────────────────────────
  describe('delete with invoice count guard', () => {
    it('hard-deletes a customer with no invoices', async () => {
      const c = await insertCustomer();
      const result = await deleteCustomer(TEST_USER, c._id.toString());
      expect(result.success).toBe(true);
      expect(await Customer.findById(c._id)).toBeNull();
    });

    it('returns 409 CUSTOMER_HAS_INVOICES with invoiceCount when invoices exist', async () => {
      const c = await insertCustomer();
      // Insert an invoice referencing this customer
      await Invoice.collection.insertOne({
        userId: TEST_USER,
        customerId: c._id,
        invoiceNumber: '',
        status: 'Draft',
        items: [],
        grossAmount: 0, discountAmount: 0, taxableAmount: 0,
        cgst: 0, sgst: 0, igst: 0, totalTax: 0, grandTotal: 0, roundOff: 0, netTotal: 0,
        invoiceDate: '2024-01-01'
      });

      await expect(deleteCustomer(TEST_USER, c._id.toString())).rejects.toMatchObject({
        code: 'CUSTOMER_HAS_INVOICES',
        statusCode: 409,
        fields: { invoiceCount: 1 }
      });
    });

    it('refuses to delete another user\'s customer', async () => {
      const c = await Customer.create(makeCustomer({ userId: OTHER_USER }));
      await expect(deleteCustomer(TEST_USER, c._id.toString())).rejects.toMatchObject({
        code: 'CUSTOMER_NOT_FOUND',
        statusCode: 404
      });
    });
  });

  // ── 6. Archive / unarchive flow ────────────────────────────────────────────
  describe('archive and unarchive', () => {
    it('archives a customer and sets archivedAt', async () => {
      const c = await insertCustomer();
      const result = await archiveCustomer(TEST_USER, c._id.toString());
      expect(result.isArchived).toBe(true);
      expect(result.archivedAt).not.toBeNull();
    });

    it('unarchives a customer and clears archivedAt', async () => {
      const c = await insertCustomer({ isArchived: true, archivedAt: new Date() });
      const result = await unarchiveCustomer(TEST_USER, c._id.toString());
      expect(result.isArchived).toBe(false);
      expect(result.archivedAt).toBeNull();
    });

    it('listCustomers excludes archived by default', async () => {
      await insertCustomer({ name: 'Active' });
      await insertCustomer({ name: 'Archived', isArchived: true });

      const { customers } = await listCustomers(TEST_USER, {});
      expect(customers.map(c => c.name)).toContain('Active');
      expect(customers.map(c => c.name)).not.toContain('Archived');
    });

    it('listCustomers includes archived only when archived=true', async () => {
      await insertCustomer({ name: 'Active' });
      await insertCustomer({ name: 'Archived', isArchived: true });

      const { customers } = await listCustomers(TEST_USER, { archived: 'true' });
      expect(customers.map(c => c.name)).not.toContain('Active');
      expect(customers.map(c => c.name)).toContain('Archived');
    });

    it('listCustomers includes both when archived=all', async () => {
      await insertCustomer({ name: 'Active' });
      await insertCustomer({ name: 'Archived', isArchived: true });

      const { customers } = await listCustomers(TEST_USER, { archived: 'all' });
      const names = customers.map(c => c.name);
      expect(names).toContain('Active');
      expect(names).toContain('Archived');
    });
  });

  // ── 7. Search excludes archived ───────────────────────────────────────────
  describe('searchCustomers', () => {
    it('excludes archived customers from search results', async () => {
      await insertCustomer({ name: 'Acme Active' });
      await insertCustomer({ name: 'Acme Archived', isArchived: true });

      const results = await searchCustomers(TEST_USER, { q: 'Acme' });
      const names = results.map(r => r.name);
      expect(names).toContain('Acme Active');
      expect(names).not.toContain('Acme Archived');
    });

    it('returns most-recently-created when q is empty', async () => {
      await insertCustomer({ name: 'First' });
      await insertCustomer({ name: 'Second' });

      const results = await searchCustomers(TEST_USER, { q: '' });
      expect(results.length).toBeGreaterThanOrEqual(2);
      // Most recent first
      expect(results[0].name).toBe('Second');
    });

    it('returns limited results', async () => {
      for (let i = 0; i < 15; i++) {
        await insertCustomer({ name: `Customer ${i}`, gstin: '' });
      }
      const results = await searchCustomers(TEST_USER, { limit: 5 });
      expect(results.length).toBe(5);
    });
  });

  // ── 8. q escaping (ReDoS safety) ─────────────────────────────────────────
  describe('search q escaping', () => {
    it('handles regex metacharacters without throwing', async () => {
      await insertCustomer({ name: 'Test (Corp) [Ltd]' });
      // These would cause catastrophic backtracking without escapeRegex
      await expect(listCustomers(TEST_USER, { q: '(.*)*' })).resolves.toBeDefined();
      await expect(listCustomers(TEST_USER, { q: 'Corp [Ltd]' })).resolves.toBeDefined();
      await expect(searchCustomers(TEST_USER, { q: 'a+b*c?' })).resolves.toBeDefined();
    });
  });

  // ── 9. invoiceCount accuracy ──────────────────────────────────────────────
  describe('invoiceCount on list and getOne', () => {
    it('returns correct invoiceCount per customer on list', async () => {
      const c1 = await insertCustomer({ name: 'C1' });
      const c2 = await insertCustomer({ name: 'C2', gstin: '' });

      // 2 invoices for c1, 0 for c2
      await Invoice.collection.insertMany([
        { userId: TEST_USER, customerId: c1._id, invoiceNumber: '', status: 'Draft', items: [], grossAmount: 0, discountAmount: 0, taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, grandTotal: 0, roundOff: 0, netTotal: 0, invoiceDate: '2024-01-01' },
        { userId: TEST_USER, customerId: c1._id, invoiceNumber: 'INV/001', status: 'Issued', items: [], grossAmount: 0, discountAmount: 0, taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, grandTotal: 0, roundOff: 0, netTotal: 0, invoiceDate: '2024-01-02' }
      ]);

      const { customers } = await listCustomers(TEST_USER, { archived: 'all' });
      const row1 = customers.find(c => c.id === c1._id.toString());
      const row2 = customers.find(c => c.id === c2._id.toString());

      expect(row1.invoiceCount).toBe(2);
      expect(row2.invoiceCount).toBe(0);
    });

    it('returns invoiceCount on getOne', async () => {
      const c = await insertCustomer();
      await Invoice.collection.insertOne({
        userId: TEST_USER, customerId: c._id, invoiceNumber: '', status: 'Draft', items: [],
        grossAmount: 0, discountAmount: 0, taxableAmount: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0,
        grandTotal: 0, roundOff: 0, netTotal: 0, invoiceDate: '2024-01-01'
      });

      const result = await getCustomerById(TEST_USER, c._id.toString());
      expect(result.invoiceCount).toBe(1);
    });
  });

  // ── 10. Ownership checks ──────────────────────────────────────────────────
  describe('per-user ownership', () => {
    it('getCustomerById returns 404 for another user\'s customer', async () => {
      const c = await Customer.create(makeCustomer({ userId: OTHER_USER }));
      await expect(getCustomerById(TEST_USER, c._id.toString())).rejects.toMatchObject({
        code: 'CUSTOMER_NOT_FOUND'
      });
    });

    it('getOwnedCustomer returns null for another user\'s customer', async () => {
      const c = await Customer.create(makeCustomer({ userId: OTHER_USER }));
      const result = await getOwnedCustomer(TEST_USER, c._id.toString());
      expect(result).toBeNull();
    });

    it('getOwnedCustomer returns { customer, isArchived } for owned customer', async () => {
      const c = await insertCustomer({ isArchived: false });
      const result = await getOwnedCustomer(TEST_USER, c._id.toString());
      expect(result).not.toBeNull();
      expect(result.isArchived).toBe(false);
      expect(result.customer.id).toBe(c._id.toString());
    });

    it('listCustomers only returns the requesting user\'s customers', async () => {
      await insertCustomer({ name: 'My Customer' });
      await Customer.create(makeCustomer({ userId: OTHER_USER, name: 'Other Customer' }));

      const { customers } = await listCustomers(TEST_USER, {});
      expect(customers.map(c => c.name)).toContain('My Customer');
      expect(customers.map(c => c.name)).not.toContain('Other Customer');
    });
  });

  // ── 11. ObjectId validation (via validateObjectId middleware) ─────────────
  describe('ObjectId validation', () => {
    it('getCustomerById throws CUSTOMER_NOT_FOUND for a valid but nonexistent ObjectId', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      await expect(getCustomerById(TEST_USER, fakeId)).rejects.toMatchObject({
        code: 'CUSTOMER_NOT_FOUND'
      });
    });
  });

  // ── 12. /search route registered before /:id ─────────────────────────────
  describe('route order: /search before /:id', () => {
    it('searchCustomers service returns an array (not a customer-not-found error)', async () => {
      // The service function itself works; the route test verifies the route isn't eaten by /:id
      await insertCustomer({ name: 'Route Test Customer' });
      const results = await searchCustomers(TEST_USER, { q: 'Route' });
      expect(Array.isArray(results)).toBe(true);
      expect(results[0].name).toBe('Route Test Customer');
    });
  });

  // ── 13. Duplicate name warning (non-blocking) ─────────────────────────────
  describe('duplicate name', () => {
    it('allows creating two customers with the same name but warns', async () => {
      await insertCustomer({ name: 'Acme Corp', gstin: '' });
      const { customer, warnings } = await createCustomer(TEST_USER, {
        name: 'Acme Corp',
        gstin: ''
      });
      expect(customer).toBeDefined();
      const warn = warnings.find(w => w.code === 'DUPLICATE_NAME');
      expect(warn).toBeDefined();
    });
  });

  // ── 14. Responses always use canonical customerType ───────────────────────
  describe('canonical customerType in responses', () => {
    it('stores and returns canonical customerType regardless of input', async () => {
      // The schema transforms B2B → registered before saving
      // We simulate what the Zod-parsed body would look like after the route's validate()
      const { normalizeCustomerType: norm } = await import(
        '../../src/modules/customers/customers.schema.js'
      );
      expect(norm('B2B')).toBe('registered');
      expect(norm('B2C')).toBe('unregistered');

      // createCustomer receives already-normalized data (after Zod)
      const { customer } = await createCustomer(TEST_USER, {
        name: 'Canonical Test',
        customerType: 'registered',
        gstin: ''
      });
      expect(customer.customerType).toBe('registered');
    });
  });

  // ── 15. Missing isArchived field (backward compatibility) ──────────────────
  describe('missing isArchived field', () => {
    it('returns customers where isArchived is undefined or missing in MongoDB', async () => {
      // Use raw collection insert to bypass Mongoose default { isArchived: false }
      const rawDoc = {
        userId: TEST_USER,
        name: 'Legacy Customer Without isArchived',
        customerType: 'registered',
        gstin: '',
        state: 'Delhi',
        email: 'legacy@example.com',
        phone: '9999988888',
        address: 'Old Town',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      delete rawDoc.isArchived;

      await Customer.collection.insertOne(rawDoc);

      // Verify listCustomers (active filter { isArchived: { $ne: true } }) returns it
      const listRes = await listCustomers(TEST_USER, { archived: 'false' });
      expect(listRes.total).toBe(1);
      expect(listRes.customers[0].name).toBe('Legacy Customer Without isArchived');

      // Verify searchCustomers returns it
      const searchRes = await searchCustomers(TEST_USER, { q: 'Legacy' });
      expect(searchRes.length).toBe(1);
      expect(searchRes[0].name).toBe('Legacy Customer Without isArchived');
    });
  });

});
