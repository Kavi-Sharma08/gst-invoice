import { Customer } from './customers.model.js';
import { AppError } from '../../shared/errors/app-error.js';

export async function listCustomers(userId, { search = '', page = 1, limit = 50 } = {}) {
  const query = { userId };
  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ name: regex }, { gstin: regex }, { email: regex }, { phone: regex }];
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [customers, total] = await Promise.all([
    Customer.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Customer.countDocuments(query)
  ]);

  return {
    customers: customers.map((c) => c.toJSON()),
    total,
    page: Number(page),
    limit: Number(limit)
  };
}

export async function getCustomerById(userId, customerId) {
  const customer = await Customer.findOne({ _id: customerId, userId });
  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }
  return customer.toJSON();
}

export async function createCustomer(userId, data) {
  const customer = await Customer.create({
    ...data,
    userId
  });
  return customer.toJSON();
}

export async function updateCustomer(userId, customerId, data) {
  const customer = await Customer.findOneAndUpdate(
    { _id: customerId, userId },
    { ...data, updatedAt: new Date() },
    { new: true, runValidators: true }
  );
  if (!customer) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }
  return customer.toJSON();
}

export async function deleteCustomer(userId, customerId) {
  const result = await Customer.findOneAndDelete({ _id: customerId, userId });
  if (!result) {
    throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  }
  return { success: true };
}
