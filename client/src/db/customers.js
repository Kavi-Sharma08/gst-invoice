import { db } from './database';

export async function getCustomers(searchQuery = '') {
  try {
    let collection = await db.customers.toArray();
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      collection = collection.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.gstin && c.gstin.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.state && c.state.toLowerCase().includes(q))
      );
    }
    // Sort recently updated or created first
    return collection.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  } catch (error) {
    console.error('Failed to get customers:', error);
    throw new Error('Unable to load customers from local storage.');
  }
}

export async function getCustomerById(id) {
  try {
    return await db.customers.get(Number(id));
  } catch (error) {
    console.error(`Failed to get customer ${id}:`, error);
    throw new Error('Unable to retrieve customer details.');
  }
}

export async function addCustomer(data) {
  try {
    const now = new Date().toISOString();
    const customer = {
      name: data.name?.trim() || '',
      gstin: (data.gstin || '').trim().toUpperCase(),
      customerType: data.customerType || 'B2B', // B2B or B2C
      address: data.address?.trim() || '',
      state: data.state?.trim() || '',
      email: data.email?.trim() || '',
      phone: data.phone?.trim() || '',
      createdAt: now,
      updatedAt: now
    };
    const id = await db.customers.add(customer);
    return { ...customer, id };
  } catch (error) {
    console.error('Failed to add customer:', error);
    throw new Error('Unable to save new customer to local storage.');
  }
}

export async function updateCustomer(id, data) {
  try {
    const numId = Number(id);
    const existing = await db.customers.get(numId);
    if (!existing) throw new Error('Customer not found');

    const updated = {
      ...existing,
      ...data,
      gstin: (data.gstin !== undefined ? data.gstin : existing.gstin || '').trim().toUpperCase(),
      updatedAt: new Date().toISOString()
    };
    await db.customers.put(updated);
    return updated;
  } catch (error) {
    console.error(`Failed to update customer ${id}:`, error);
    throw new Error('Unable to update customer in local storage.');
  }
}

export async function deleteCustomer(id) {
  try {
    await db.customers.delete(Number(id));
    return true;
  } catch (error) {
    console.error(`Failed to delete customer ${id}:`, error);
    throw new Error('Unable to delete customer from local storage.');
  }
}
