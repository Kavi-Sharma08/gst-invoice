import { Router } from 'express';
import { asyncHandler } from '../../shared/http/async-handler.js';
import { authenticate } from '../../middleware/authenticate.js';
import { BusinessProfile } from '../business/business.model.js';
import { Customer } from '../customers/customers.model.js';
import { Product } from '../products/products.model.js';
import { Invoice } from '../invoices/invoices.model.js';
import { InvoiceCounter } from '../invoices/invoice-counter.model.js';
import { determineTaxType, calculateInvoiceTotal } from '../invoices/invoice-calculation.service.js';
import { allocateNextInvoiceNumber } from '../invoices/invoice-number.service.js';
import { AppError } from '../../shared/errors/app-error.js';

const router = Router();

router.use(authenticate);

/**
 * POST /api/v1/migration/import
 * Accepts a full IndexedDB backup JSON and idempotently imports it into MongoDB.
 * Preserves invoice number uniqueness and cross-references.
 */
router.post(
  '/import',
  asyncHandler(async (req, res) => {
    const { business, customers = [], products = [], invoices = [], settings = [] } = req.body;
    const userId = req.user.id;
    const idMap = { customers: {}, products: {} };
    const results = {
      business: null,
      customers: { imported: 0, skipped: 0 },
      products: { imported: 0, skipped: 0 },
      invoices: { imported: 0, skipped: 0, errors: [] }
    };

    // 1. Migrate Business Profile
    const bizData = Array.isArray(business) ? business[0] : business;
    if (bizData && bizData.businessName) {
      const bankDetails = {};
      const settingsMap = {};
      for (const s of settings) {
        settingsMap[s.key] = s.value;
      }
      const bankRaw = settingsMap.bankDetails || bizData.bankDetails || {};

      await BusinessProfile.findOneAndUpdate(
        { userId },
        {
          userId,
          businessName: bizData.businessName || '',
          gstin: bizData.gstin || '',
          pan: bizData.pan || '',
          address: bizData.address || '',
          state: bizData.state || '',
          email: bizData.email || '',
          phone: bizData.phone || '',
          bankDetails: bankRaw,
          invoiceSettings: {
            invoicePrefix: settingsMap.invoicePrefix || 'INV/',
            startingNumber: settingsMap.startingNumber || 1,
            defaultNotes: settingsMap.defaultNotes || '',
            defaultTerms: settingsMap.defaultTerms || ''
          }
        },
        { upsert: true, new: true }
      );
      results.business = 'imported';
    }

    // 2. Migrate Customers
    for (const c of customers) {
      const existing = await Customer.findOne({ userId, name: c.name });
      if (existing) {
        idMap.customers[c.id] = existing._id.toString();
        results.customers.skipped++;
        continue;
      }
      const created = await Customer.create({
        userId,
        name: c.name || '',
        gstin: c.gstin || '',
        customerType: c.customerType || 'B2B',
        address: c.address || '',
        state: c.state || '',
        email: c.email || '',
        phone: c.phone || ''
      });
      idMap.customers[c.id] = created._id.toString();
      results.customers.imported++;
    }

    // 3. Migrate Products
    for (const p of products) {
      const existing = await Product.findOne({ userId, name: p.name });
      if (existing) {
        idMap.products[p.id] = existing._id.toString();
        results.products.skipped++;
        continue;
      }
      const created = await Product.create({
        userId,
        name: p.name || '',
        type: p.type || 'Service',
        hsnSac: p.hsnSac || '',
        gstRate: parseFloat(p.gstRate ?? 18),
        rate: parseFloat(p.rate ?? 0),
        unit: p.unit || 'Nos',
        description: p.description || ''
      });
      idMap.products[p.id] = created._id.toString();
      results.products.imported++;
    }

    // 4. Migrate Invoices
    const bizProfile = await BusinessProfile.findOne({ userId });
    for (const inv of invoices) {
      if (!inv.invoiceNumber) {
        results.invoices.errors.push({ id: inv.id, reason: 'Missing invoice number' });
        continue;
      }

      const existing = await Invoice.findOne({ userId, invoiceNumber: inv.invoiceNumber });
      if (existing) {
        results.invoices.skipped++;
        continue;
      }

      try {
        const businessSnap = {
          businessName: bizProfile?.businessName || inv.business?.businessName || '',
          gstin: bizProfile?.gstin || inv.business?.gstin || '',
          pan: bizProfile?.pan || inv.business?.pan || '',
          address: bizProfile?.address || inv.business?.address || '',
          state: bizProfile?.state || inv.business?.state || '',
          phone: bizProfile?.phone || inv.business?.phone || '',
          email: bizProfile?.email || inv.business?.email || ''
        };

        const items = Array.isArray(inv.items) ? inv.items : [];
        const taxType = inv.taxType || 'INTRA';
        const calculation = calculateInvoiceTotal(items, taxType);

        await Invoice.create({
          userId,
          businessProfileId: bizProfile?._id,
          customerId: idMap.customers[inv.customerId] || null,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate || new Date().toISOString().slice(0, 10),
          dueDate: inv.dueDate || '',
          status: inv.status || 'Issued',
          currency: 'INR',
          placeOfSupply: inv.placeOfSupply || inv.customer?.state || '',
          taxType,
          customer: inv.customer || {},
          business: businessSnap,
          items: calculation.items,
          grossAmount: calculation.grossAmount,
          discountAmount: calculation.discountAmount,
          taxableAmount: calculation.taxableAmount,
          cgst: calculation.cgst,
          sgst: calculation.sgst,
          igst: calculation.igst,
          totalTax: calculation.totalTax,
          grandTotal: calculation.grandTotal,
          roundOff: calculation.roundOff,
          netTotal: calculation.netTotal,
          notes: inv.notes || '',
          terms: inv.terms || '',
          bankDetails: inv.bankDetails || {}
        });
        results.invoices.imported++;
      } catch (err) {
        results.invoices.errors.push({ invoiceNumber: inv.invoiceNumber, reason: err.message });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Migration completed',
      data: results
    });
  })
);

export const migrationRoutes = router;
