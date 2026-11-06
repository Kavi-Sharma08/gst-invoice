import { Invoice } from './invoices.model.js';
import { BusinessProfile } from '../business/business.model.js';
import { determineTaxType, calculateInvoiceTotal, getStateByCode } from './invoice-calculation.service.js';
import { allocateNextInvoiceNumber } from './invoice-number.service.js';
import { AppError } from '../../shared/errors/app-error.js';

export function escapeRegex(string) {
  if (!string || typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function normalizeStatus(status) {
  if (!status || typeof status !== 'string') return null;
  const lower = status.trim().toLowerCase();
  if (lower === 'all') return null;
  if (lower === 'draft') return 'Draft';
  if (lower === 'issued') return 'Issued';
  if (lower === 'paid') return 'Paid';
  if (lower === 'cancelled') return 'Cancelled';
  return status;
}

/**
 * List lightweight invoice rows only.
 */
export async function listInvoices(
  userId,
  { page = 1, limit = 10, status = '', q = '', search = '', customerId = '', sort = '-invoiceDate', expand = false } = {}
) {
  const query = { userId };

  // Status filter (case-insensitive)
  const normStatus = normalizeStatus(status);
  if (normStatus) {
    query.status = normStatus;
  }

  // Text search on invoiceNumber and customer.name
  const searchQuery = (q || search || '').trim();
  if (searchQuery) {
    const safeRegex = new RegExp(escapeRegex(searchQuery), 'i');
    query.$or = [{ invoiceNumber: safeRegex }, { 'customer.name': safeRegex }];
  }

  // Customer ID filter
  if (customerId && customerId.trim()) {
    const cId = customerId.trim();
    query.$or = query.$or
      ? query.$or.map((cond) => ({ ...cond, $and: [{ $or: [{ customerId: cId }, { 'customer.id': cId }] }] }))
      : [{ customerId: cId }, { 'customer.id': cId }];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const isExpanded = expand === true || expand === 'true' || expand === 'legacy';
  const limitNum = isExpanded ? Math.min(500, Math.max(1, Number(limit) || 10)) : Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  // Projection: lightweight fields by default; full fields when expand=true
  const projection = isExpanded
    ? null
    : {
        _id: 1,
        invoiceNumber: 1,
        status: 1,
        customerId: 1,
        'customer.id': 1,
        'customer.name': 1,
        invoiceDate: 1,
        dueDate: 1,
        taxableAmount: 1,
        cgst: 1,
        sgst: 1,
        igst: 1,
        totalTax: 1,
        grandTotal: 1,
        roundOff: 1,
        netTotal: 1,
        currency: 1,
        createdAt: 1
      };

  const sortOrder = sort === 'oldest' || sort === 'invoiceDate' ? { invoiceDate: 1, createdAt: 1 } : { invoiceDate: -1, createdAt: -1 };

  const [invoices, total] = await Promise.all([
    Invoice.find(query, projection).sort(sortOrder).skip(skip).limit(limitNum),
    Invoice.countDocuments(query)
  ]);

  const rows = invoices.map((inv) => {
    const json = inv.toJSON();
    if (!isExpanded) {
      json.customer = {
        id: json.customer?.id || json.customerId || '',
        name: json.customer?.name || ''
      };
    }
    return json;
  });

  return {
    invoices: rows,
    total,
    page: pageNum,
    limit: limitNum
  };
}

/**
 * Get tab counts: { all, paid, issued, draft, cancelled }
 * Respects q and customerId, but NOT status.
 */
export async function getInvoiceCounts(userId, { q = '', search = '', customerId = '' } = {}) {
  const query = { userId };

  const searchQuery = (q || search || '').trim();
  if (searchQuery) {
    const safeRegex = new RegExp(escapeRegex(searchQuery), 'i');
    query.$or = [{ invoiceNumber: safeRegex }, { 'customer.name': safeRegex }];
  }

  if (customerId && customerId.trim()) {
    const cId = customerId.trim();
    query.$or = query.$or
      ? query.$or.map((cond) => ({ ...cond, $and: [{ $or: [{ customerId: cId }, { 'customer.id': cId }] }] }))
      : [{ customerId: cId }, { 'customer.id': cId }];
  }

  const [all, paid, issued, draft, cancelled] = await Promise.all([
    Invoice.countDocuments(query),
    Invoice.countDocuments({ ...query, status: 'Paid' }),
    Invoice.countDocuments({ ...query, status: 'Issued' }),
    Invoice.countDocuments({ ...query, status: 'Draft' }),
    Invoice.countDocuments({ ...query, status: 'Cancelled' })
  ]);

  return { all, paid, issued, draft, cancelled };
}

/**
 * Summary totals for stat cards and customer detail strip.
 * { totalBilled, paid, outstanding, invoiceCount }
 */
export async function getInvoiceSummary(userId, { customerId = '' } = {}) {
  const query = { userId };

  if (customerId && customerId.trim()) {
    const cId = customerId.trim();
    query.$or = [{ customerId: cId }, { 'customer.id': cId }];
  }

  const invoices = await Invoice.find(query, {
    status: 1,
    netTotal: 1,
    grandTotal: 1
  });

  let totalBilled = 0;
  let paid = 0;
  let outstanding = 0;
  let invoiceCount = 0;

  for (const inv of invoices) {
    const amount = Number(inv.netTotal ?? inv.grandTotal) || 0;
    if (inv.status !== 'Cancelled') {
      totalBilled += amount;
      invoiceCount++;
    }
    if (inv.status === 'Paid') {
      paid += amount;
    } else if (inv.status === 'Issued') {
      outstanding += amount;
    }
  }

  return {
    totalBilled: Math.round(totalBilled * 100) / 100,
    paid: Math.round(paid * 100) / 100,
    outstanding: Math.round(outstanding * 100) / 100,
    invoiceCount
  };
}

export async function getInvoiceById(userId, invoiceId) {
  const invoice = await Invoice.findOne({ _id: invoiceId, userId });
  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }
  return invoice.toJSON();
}

/**
 * Creates a DRAFT invoice. Does NOT consume an invoice number.
 */
export async function createDraftInvoice(userId, data) {
  const business = await BusinessProfile.findOne({ userId });
  const sellerState = business?.state || '';

  const customerState = data.placeOfSupply || data.customer?.state || sellerState;
  const taxType = determineTaxType(sellerState, customerState);

  const items = data.items || [];
  const calculation = calculateInvoiceTotal(items, taxType);

  const invoiceDoc = {
    userId,
    businessProfileId: business?._id,
    customerId: data.customerId || null,
    invoiceNumber: '', // Drafts do not have an invoice number
    invoiceDate: data.invoiceDate || new Date().toISOString().slice(0, 10),
    dueDate: data.dueDate || '',
    status: 'Draft',
    currency: data.currency || 'INR',
    placeOfSupply: customerState,
    taxType,
    customer: {
      id: data.customerId ? String(data.customerId) : data.customer?.id || '',
      name: data.customer?.name || 'Walk-in Customer',
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

/**
 * Updates a DRAFT invoice only. 409 Conflict if not Draft.
 */
export async function updateDraftInvoice(userId, invoiceId, data) {
  const existing = await Invoice.findOne({ _id: invoiceId, userId });
  if (!existing) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  if (existing.status !== 'Draft') {
    throw new AppError(
      `Only draft invoices can be edited (current status: ${existing.status}).`,
      409,
      'INVOICE_NOT_DRAFT'
    );
  }

  const business = await BusinessProfile.findOne({ userId });
  const sellerState = business?.state || existing.business?.state || '';
  const customerState = data.placeOfSupply || data.customer?.state || existing.placeOfSupply || sellerState;
  const taxType = determineTaxType(sellerState, customerState);

  const items = data.items !== undefined ? data.items : existing.items;
  const calculation = calculateInvoiceTotal(items, taxType);

  const updateFields = {
    ...data,
    status: 'Draft', // Status cannot be escalated via update
    invoiceNumber: existing.invoiceNumber || '', // Number cannot be altered via update
    taxType,
    placeOfSupply: customerState,
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
    updatedAt: new Date()
  };

  if (data.customer) {
    updateFields.customer = {
      ...existing.customer?.toObject?.() || existing.customer,
      ...data.customer,
      id: data.customerId ? String(data.customerId) : data.customer.id || existing.customer?.id || ''
    };
  }

  delete updateFields.userId;
  delete updateFields._id;
  delete updateFields.id;

  const updated = await Invoice.findOneAndUpdate(
    { _id: invoiceId, userId },
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  return updated.toJSON();
}

/**
 * Deletes a DRAFT invoice only. 409 Conflict if not Draft.
 */
export async function deleteDraftInvoice(userId, invoiceId) {
  const existing = await Invoice.findOne({ _id: invoiceId, userId });
  if (!existing) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  if (existing.status !== 'Draft') {
    throw new AppError(
      `Only draft invoices can be deleted (current status: ${existing.status}).`,
      409,
      'INVOICE_NOT_DRAFT'
    );
  }

  await Invoice.deleteOne({ _id: invoiceId, userId });
  return { success: true };
}

/**
 * Validates, allocates sequential invoice number atomically, and locks into Issued status.
 */
export async function issueInvoice(userId, invoiceId) {
  const existing = await Invoice.findOne({ _id: invoiceId, userId });
  if (!existing) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  if (existing.status !== 'Draft') {
    throw new AppError(
      `Invoice has already been issued (current status: ${existing.status}).`,
      409,
      'INVOICE_ALREADY_ISSUED'
    );
  }

  // Business Rules Validation
  const fields = {};

  if (!existing.items || existing.items.length === 0) {
    fields.items = 'At least one line item is required to issue an invoice.';
  }

  if (!existing.netTotal || existing.netTotal <= 0) {
    fields.netTotal = 'Invoice grand total must be greater than zero to be issued.';
  }

  if (!existing.customer?.name || !existing.customer.name.trim()) {
    fields['customer.name'] = 'Customer name is required to issue an invoice.';
  }

  if (!existing.placeOfSupply || !existing.placeOfSupply.trim()) {
    fields.placeOfSupply = 'Place of supply is required to issue an invoice.';
  }

  // GSTIN validation if provided
  const gstin = existing.customer?.gstin?.trim()?.toUpperCase();
  if (gstin) {
    if (!GSTIN_REGEX.test(gstin)) {
      fields['customer.gstin'] = 'Customer GSTIN format is invalid.';
    } else {
      const stateCode = gstin.slice(0, 2);
      const mappedState = getStateByCode(stateCode);
      if (!mappedState) {
        fields['customer.gstin'] = `GSTIN state code "${stateCode}" is invalid.`;
      }
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new AppError(
      'Invoice cannot be issued due to business rule validation failures.',
      422,
      'ISSUE_VALIDATION_FAILED',
      null,
      fields
    );
  }

  // Fetch business profile settings for numbering
  const business = await BusinessProfile.findOne({ userId });
  const prefix = business?.invoiceSettings?.invoicePrefix;
  const startingNumber = business?.invoiceSettings?.startingNumber || 1;

  // Allocate atomic number
  const invoiceNumber = await allocateNextInvoiceNumber(userId, prefix, startingNumber);

  const today = new Date().toISOString().slice(0, 10);
  const updated = await Invoice.findOneAndUpdate(
    { _id: invoiceId, userId, status: 'Draft' },
    {
      $set: {
        invoiceNumber,
        status: 'Issued',
        invoiceDate: existing.invoiceDate || today,
        updatedAt: new Date()
      }
    },
    { new: true }
  );

  if (!updated) {
    throw new AppError('Failed to issue invoice. Concurrent modification detected.', 409, 'CONCURRENT_UPDATE');
  }

  return updated.toJSON();
}

/**
 * Cancel an Issued invoice.
 */
export async function cancelInvoice(userId, invoiceId) {
  const existing = await Invoice.findOne({ _id: invoiceId, userId });
  if (!existing) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  if (existing.status === 'Draft') {
    throw new AppError('Draft invoices should be deleted, not cancelled.', 409, 'INVALID_TRANSITION');
  }

  if (existing.status === 'Paid') {
    throw new AppError('Paid invoices cannot be cancelled directly. Mark unpaid first.', 409, 'INVALID_TRANSITION');
  }

  if (existing.status === 'Cancelled') {
    throw new AppError('Invoice is already cancelled.', 409, 'ALREADY_CANCELLED');
  }

  if (existing.status !== 'Issued') {
    throw new AppError(`Cannot cancel invoice in status "${existing.status}".`, 409, 'INVALID_TRANSITION');
  }

  const updated = await Invoice.findOneAndUpdate(
    { _id: invoiceId, userId },
    { $set: { status: 'Cancelled', updatedAt: new Date() } },
    { new: true }
  );

  return updated.toJSON();
}

/**
 * Mark an Issued invoice as Paid.
 */
export async function markInvoicePaid(userId, invoiceId) {
  const existing = await Invoice.findOne({ _id: invoiceId, userId });
  if (!existing) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  if (existing.status === 'Draft') {
    throw new AppError('Draft invoices must be issued before marking as paid.', 409, 'INVALID_TRANSITION');
  }

  if (existing.status === 'Cancelled') {
    throw new AppError('Cancelled invoices cannot be marked as paid.', 409, 'INVALID_TRANSITION');
  }

  if (existing.status === 'Paid') {
    return existing.toJSON();
  }

  if (existing.status !== 'Issued') {
    throw new AppError(`Cannot mark invoice paid in status "${existing.status}".`, 409, 'INVALID_TRANSITION');
  }

  const updated = await Invoice.findOneAndUpdate(
    { _id: invoiceId, userId },
    { $set: { status: 'Paid', updatedAt: new Date() } },
    { new: true }
  );

  return updated.toJSON();
}

/**
 * Mark a Paid invoice back to Issued (unpaid).
 */
export async function markInvoiceUnpaid(userId, invoiceId) {
  const existing = await Invoice.findOne({ _id: invoiceId, userId });
  if (!existing) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  if (existing.status !== 'Paid') {
    throw new AppError(`Only paid invoices can be marked unpaid (current status: ${existing.status}).`, 409, 'INVALID_TRANSITION');
  }

  const updated = await Invoice.findOneAndUpdate(
    { _id: invoiceId, userId },
    { $set: { status: 'Issued', updatedAt: new Date() } },
    { new: true }
  );

  return updated.toJSON();
}

/**
 * Duplicates an invoice into a NEW DRAFT (no invoice number consumed).
 */
export async function duplicateInvoice(userId, invoiceId) {
  const existing = await Invoice.findOne({ _id: invoiceId, userId });
  if (!existing) {
    throw new AppError('Source invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  const today = new Date().toISOString().slice(0, 10);
  const duplicateData = existing.toObject();

  delete duplicateData._id;
  delete duplicateData.id;
  delete duplicateData.createdAt;
  delete duplicateData.updatedAt;

  duplicateData.invoiceNumber = ''; // New draft has no number
  duplicateData.invoiceDate = today;
  duplicateData.status = 'Draft';

  const duplicated = await Invoice.create(duplicateData);
  return duplicated.toJSON();
}
