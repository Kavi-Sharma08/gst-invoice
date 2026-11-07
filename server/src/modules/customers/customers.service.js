import mongoose from 'mongoose';
import { Customer } from './customers.model.js';
import { Invoice } from '../invoices/invoices.model.js';
import { AppError } from '../../shared/errors/app-error.js';
import { escapeRegex } from '../../shared/utils/regex.js';
import { getStateByCode } from '../invoices/invoice-calculation.service.js';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * Checks whether a GSTIN's first two digits (state code) match the
 * provided state string. Returns a warning string or null.
 */
function checkGstinStateMismatch(gstin, state) {
  if (!gstin || gstin.length < 2 || !state) return null;
  const code = gstin.slice(0, 2);
  const mapped = getStateByCode(code);
  if (!mapped) return null;
  if (mapped.name.trim().toLowerCase() !== state.trim().toLowerCase()) {
    return `GSTIN state code "${code}" corresponds to ${mapped.name}, but customer state is "${state}"`;
  }
  return null;
}

/**
 * Builds the archived filter for a query based on the ?archived param.
 * 'false' (default) → show active only
 * 'true'            → show archived only
 * 'all'             → show both
 */
function buildArchivedFilter(archived) {
  if (archived === 'true') return { isArchived: true };
  if (archived === 'all') return {};
  return { isArchived: { $ne: true } }; // default: active only
}

/**
 * Fetches per-customer invoice counts for a set of customer IDs using a
 * single aggregation pipeline — no per-row queries, no $lookup.
 *
 * @param {string} userId
 * @param {string[]} customerIds - array of ObjectId strings
 * @returns {Promise<Map<string, number>>}  customerId → invoiceCount
 */
async function getInvoiceCountsForCustomers(userId, customerIds) {
  if (!customerIds.length) return new Map();

  const objectIds = customerIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const rows = await Invoice.aggregate([
    {
      $match: {
        userId,
        customerId: { $in: objectIds }
      }
    },
    {
      $group: {
        _id: '$customerId',
        count: { $sum: 1 }
      }
    }
  ]);

  const map = new Map();
  for (const row of rows) {
    map.set(row._id.toString(), row.count);
  }
  return map;
}

/**
 * List customers with pagination, search, archived filter and invoiceCount per row.
 */
export async function listCustomers(userId, { q = '', page = 1, limit = 25, archived = 'false', sort = '-updatedAt' } = {}) {
  const query = { userId, ...buildArchivedFilter(archived) };

  if (q && q.trim()) {
    const safeRegex = new RegExp(escapeRegex(q.trim()), 'i');
    query.$or = [{ name: safeRegex }, { gstin: safeRegex }, { state: safeRegex }];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 25));
  const skip = (pageNum - 1) * limitNum;

  // Determine sort order
  const sortOrder = sort.startsWith('-')
    ? { [sort.slice(1)]: -1 }
    : { [sort]: 1 };

  const [customers, total] = await Promise.all([
    Customer.find(query).sort(sortOrder).skip(skip).limit(limitNum),
    Customer.countDocuments(query)
  ]);

  // Fetch invoice counts for this page's customers in one aggregation
  const customerIds = customers.map((c) => c._id.toString());
  const invoiceCountMap = await getInvoiceCountsForCustomers(userId, customerIds);

  const rows = customers.map((c) => {
    const json = c.toJSON();
    json.invoiceCount = invoiceCountMap.get(json.id) ?? 0;
    return json;
  });

  return { customers: rows, total, page: pageNum, limit: limitNum };
}

/**
 * Search — lightweight, active-only, used by the invoice editor combobox.
 * Returns only the fields the combobox needs.
 */
export async function searchCustomers(userId, { q = '', limit = 10 } = {}) {
  const limitNum = Math.min(20, Math.max(1, Number(limit) || 10));
  const query = { userId, isArchived: { $ne: true } };

  if (q && q.trim()) {
    const safeRegex = new RegExp(escapeRegex(q.trim()), 'i');
    query.$or = [{ name: safeRegex }, { gstin: safeRegex }, { state: safeRegex }];
  }

  // Empty q → return most recently created
  const sortOrder = q.trim() ? { name: 1 } : { createdAt: -1 };

  const customers = await Customer.find(query, {
    _id: 1,
    name: 1,
    gstin: 1,
    state: 1,
    customerType: 1
  })
    .sort(sortOrder)
    .limit(limitNum);

  return customers.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    gstin: c.gstin || '',
    state: c.state || '',
    customerType: c.customerType
  }));
}

/**
 * Get a single customer by ID with invoiceCount.
 */
export async function getCustomerById(userId, customerId) {
  const customer = await Customer.findOne({ _id: customerId, userId });
  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }
  const json = customer.toJSON();
  const countMap = await getInvoiceCountsForCustomers(userId, [json.id]);
  json.invoiceCount = countMap.get(json.id) ?? 0;
  return json;
}

/**
 * Create a customer. Returns { customer, warnings }.
 * Throws 409 on duplicate GSTIN.
 */
export async function createCustomer(userId, data) {
  const warnings = [];

  // Check for duplicate name (warning only)
  if (data.name) {
    const nameDup = await Customer.findOne({
      userId,
      name: { $regex: new RegExp(`^${escapeRegex(data.name.trim())}$`, 'i') }
    });
    if (nameDup) {
      warnings.push({
        code: 'DUPLICATE_NAME',
        message: `A customer named "${nameDup.name}" already exists.`
      });
    }
  }

  // Check for duplicate GSTIN (hard 409)
  if (data.gstin && data.gstin.trim()) {
    const gstinDup = await Customer.findOne({ userId, gstin: data.gstin.trim().toUpperCase() });
    if (gstinDup) {
      throw new AppError(
        `A customer with GSTIN ${data.gstin.trim().toUpperCase()} already exists.`,
        409,
        'DUPLICATE_GSTIN',
        null,
        {
          existingId: gstinDup._id.toString(),
          existingName: gstinDup.name,
          isArchived: gstinDup.isArchived ?? false
        }
      );
    }
  }

  // State-code mismatch warning (non-blocking)
  if (data.gstin && data.state) {
    const mismatch = checkGstinStateMismatch(data.gstin, data.state);
    if (mismatch) warnings.push({ code: 'GSTIN_STATE_MISMATCH', message: mismatch });
  }

  const customer = await Customer.create({ ...data, userId });
  const json = customer.toJSON();
  json.invoiceCount = 0;

  return { customer: json, warnings };
}

/**
 * Update a customer. Returns { customer, warnings }.
 * Throws 409 on duplicate GSTIN for a different record.
 */
export async function updateCustomer(userId, customerId, data) {
  const existing = await Customer.findOne({ _id: customerId, userId });
  if (!existing) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  const warnings = [];

  // Check GSTIN uniqueness only when it changes
  const newGstin = data.gstin !== undefined ? data.gstin : existing.gstin;
  if (newGstin && newGstin.trim()) {
    const gstinDup = await Customer.findOne({
      userId,
      gstin: newGstin.trim().toUpperCase(),
      _id: { $ne: customerId }
    });
    if (gstinDup) {
      throw new AppError(
        `A customer with GSTIN ${newGstin.trim().toUpperCase()} already exists.`,
        409,
        'DUPLICATE_GSTIN',
        null,
        {
          existingId: gstinDup._id.toString(),
          existingName: gstinDup.name,
          isArchived: gstinDup.isArchived ?? false
        }
      );
    }
  }

  // Name duplicate warning
  if (data.name) {
    const nameDup = await Customer.findOne({
      userId,
      name: { $regex: new RegExp(`^${escapeRegex(data.name.trim())}$`, 'i') },
      _id: { $ne: customerId }
    });
    if (nameDup) {
      warnings.push({
        code: 'DUPLICATE_NAME',
        message: `A customer named "${nameDup.name}" already exists.`
      });
    }
  }

  // State-code mismatch warning
  const resolvedGstin = newGstin || '';
  const resolvedState = data.state !== undefined ? data.state : existing.state;
  if (resolvedGstin && resolvedState) {
    const mismatch = checkGstinStateMismatch(resolvedGstin, resolvedState);
    if (mismatch) warnings.push({ code: 'GSTIN_STATE_MISMATCH', message: mismatch });
  }

  const customer = await Customer.findOneAndUpdate(
    { _id: customerId, userId },
    { ...data, updatedAt: new Date() },
    { new: true, runValidators: true }
  );

  const json = customer.toJSON();
  const countMap = await getInvoiceCountsForCustomers(userId, [json.id]);
  json.invoiceCount = countMap.get(json.id) ?? 0;

  return { customer: json, warnings };
}

/**
 * Delete a customer. 409 if the customer has any invoices.
 */
export async function deleteCustomer(userId, customerId) {
  const existing = await Customer.findOne({ _id: customerId, userId });
  if (!existing) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }

  // Count invoices that reference this customer (by ID or snapshot ID)
  const invoiceCount = await Invoice.countDocuments({
    userId,
    $or: [
      { customerId: new mongoose.Types.ObjectId(customerId) },
      { 'customer.id': customerId }
    ]
  });

  if (invoiceCount > 0) {
    throw new AppError(
      `Cannot delete customer. ${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'} reference${invoiceCount === 1 ? 's' : ''} this customer.`,
      409,
      'CUSTOMER_HAS_INVOICES',
      null,
      { invoiceCount }
    );
  }

  await Customer.findOneAndDelete({ _id: customerId, userId });
  return { success: true };
}

/**
 * Archive a customer (soft delete). Allowed even with invoices.
 */
export async function archiveCustomer(userId, customerId) {
  const customer = await Customer.findOneAndUpdate(
    { _id: customerId, userId },
    { isArchived: true, archivedAt: new Date() },
    { new: true }
  );
  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }
  return customer.toJSON();
}

/**
 * Unarchive a customer.
 */
export async function unarchiveCustomer(userId, customerId) {
  const customer = await Customer.findOneAndUpdate(
    { _id: customerId, userId },
    { isArchived: false, archivedAt: null },
    { new: true }
  );
  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }
  return customer.toJSON();
}

/**
 * Checks that a customerId belongs to the given userId.
 * Used by the invoice service to prevent cross-tenant snapshot copying.
 *
 * @param {string} userId
 * @param {string} customerId
 * @returns {Promise<{ customer: object, isArchived: boolean } | null>}
 */
export async function getOwnedCustomer(userId, customerId) {
  if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) return null;
  const customer = await Customer.findOne({ _id: customerId, userId });
  if (!customer) return null;
  return { customer: customer.toJSON(), isArchived: customer.isArchived ?? false };
}
