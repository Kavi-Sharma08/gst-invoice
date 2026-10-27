import { Invoice } from './invoices.model.js';
import { BusinessProfile } from '../business/business.model.js';
import { Customer } from '../customers/customers.model.js';
import { determineTaxType, calculateInvoiceTotal } from './invoice-calculation.service.js';
import { allocateNextInvoiceNumber } from './invoice-number.service.js';
import { AppError } from '../../shared/errors/app-error.js';

export async function listInvoices(userId, { search = '', status = 'ALL', page = 1, limit = 50 } = {}) {
  const query = { userId };

  if (status && status !== 'ALL') {
    query.status = status;
  }

  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [
      { invoiceNumber: regex },
      { 'customer.name': regex },
      { 'customer.gstin': regex }
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [invoices, total] = await Promise.all([
    Invoice.find(query).sort({ invoiceDate: -1, createdAt: -1 }).skip(skip).limit(limit),
    Invoice.countDocuments(query)
  ]);

  return {
    invoices: invoices.map((inv) => inv.toJSON()),
    total,
    page: Number(page),
    limit: Number(limit)
  };
}

export async function getInvoiceById(userId, invoiceId) {
  const invoice = await Invoice.findOne({ _id: invoiceId, userId });
  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }
  return invoice.toJSON();
}

export async function createInvoice(userId, data) {
  // 1. Fetch current business profile for seller snapshot and state
  const business = await BusinessProfile.findOne({ userId });
  const sellerState = business?.state || '';

  // 2. Resolve place of supply & customer state
  const customerState = data.placeOfSupply || data.customer?.state || sellerState;
  const taxType = determineTaxType(sellerState, customerState);

  // 3. Authoritative server calculation of totals
  const calculation = calculateInvoiceTotal(data.items, taxType);

  // 4. Concurrency-safe invoice number allocation if not explicitly specified
  let invoiceNumber = data.invoiceNumber?.trim();
  if (!invoiceNumber) {
    const prefix = business?.invoiceSettings?.invoicePrefix || undefined;
    const startNum = business?.invoiceSettings?.startingNumber || 1;
    invoiceNumber = await allocateNextInvoiceNumber(userId, prefix, startNum);
  } else {
    // Check uniqueness
    const exists = await Invoice.findOne({ userId, invoiceNumber });
    if (exists) {
      throw new AppError(`Invoice number "${invoiceNumber}" is already in use.`, 409, 'DUPLICATE_INVOICE_NUMBER');
    }
  }

  // 5. Build full invoice document with immutable snapshots
  const invoiceDoc = {
    userId,
    businessProfileId: business?._id,
    customerId: data.customerId || null,
    invoiceNumber,
    invoiceDate: data.invoiceDate,
    dueDate: data.dueDate || '',
    status: data.status || 'Issued',
    currency: data.currency || 'INR',
    placeOfSupply: customerState,
    taxType,
    customer: {
      id: data.customerId || '',
      name: data.customer?.name || '',
      gstin: data.customer?.gstin || '',
      address: data.customer?.address || '',
      state: data.customer?.state || '',
      phone: data.customer?.phone || '',
      email: data.customer?.email || ''
    },
    business: {
      businessName: business?.businessName || '',
      gstin: business?.gstin || '',
      pan: business?.pan || '',
      address: business?.address || '',
      state: business?.state || '',
      phone: business?.phone || '',
      email: business?.email || ''
    },
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
    notes: data.notes || business?.invoiceSettings?.defaultNotes || '',
    terms: data.terms || business?.invoiceSettings?.defaultTerms || '',
    bankDetails: data.bankDetails || business?.bankDetails || {}
  };

  const invoice = await Invoice.create(invoiceDoc);
  return invoice.toJSON();
}

export async function updateInvoice(userId, invoiceId, data) {
  const existing = await Invoice.findOne({ _id: invoiceId, userId });
  if (!existing) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  const business = await BusinessProfile.findOne({ userId });
  const sellerState = business?.state || existing.business?.state || '';
  const customerState = data.placeOfSupply || data.customer?.state || existing.placeOfSupply || sellerState;
  const taxType = determineTaxType(sellerState, customerState);

  const items = data.items || existing.items;
  const calculation = calculateInvoiceTotal(items, taxType);

  const updateFields = {
    ...data,
    items: calculation.items,
    taxType,
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
    updatedAt: new Date()
  };

  delete updateFields.userId; // Prevent hijacking

  const updated = await Invoice.findOneAndUpdate(
    { _id: invoiceId, userId },
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  return updated.toJSON();
}

export async function deleteInvoice(userId, invoiceId) {
  const result = await Invoice.findOneAndDelete({ _id: invoiceId, userId });
  if (!result) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }
  return { success: true };
}

export async function duplicateInvoice(userId, invoiceId) {
  const existing = await Invoice.findOne({ _id: invoiceId, userId });
  if (!existing) {
    throw new AppError('Source invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  const business = await BusinessProfile.findOne({ userId });
  const prefix = business?.invoiceSettings?.invoicePrefix || undefined;
  const newInvoiceNumber = await allocateNextInvoiceNumber(userId, prefix);

  const today = new Date().toISOString().slice(0, 10);
  const duplicateData = existing.toObject();
  delete duplicateData._id;
  delete duplicateData.id;
  delete duplicateData.createdAt;
  delete duplicateData.updatedAt;

  duplicateData.invoiceNumber = newInvoiceNumber;
  duplicateData.invoiceDate = today;
  duplicateData.status = 'Draft';

  const duplicated = await Invoice.create(duplicateData);
  return duplicated.toJSON();
}
