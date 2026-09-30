import { db } from './database';

export async function getInvoices(filters = {}) {
  try {
    let invoices = await db.invoices.toArray();

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      invoices = invoices.filter(
        (inv) =>
          (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
          (inv.customer?.name && inv.customer.name.toLowerCase().includes(q)) ||
          (inv.customer?.gstin && inv.customer.gstin.toLowerCase().includes(q))
      );
    }

    if (filters.status && filters.status !== 'ALL') {
      invoices = invoices.filter((inv) => inv.status === filters.status);
    }

    // Sort by invoiceDate descending by default, then id descending
    return invoices.sort((a, b) => {
      const dateA = new Date(a.invoiceDate || a.createdAt).getTime();
      const dateB = new Date(b.invoiceDate || b.createdAt).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return (b.id || 0) - (a.id || 0);
    });
  } catch (error) {
    console.error('Failed to get invoices:', error);
    throw new Error('Unable to load invoices from local storage.');
  }
}

export async function getInvoiceById(id) {
  try {
    return await db.invoices.get(Number(id));
  } catch (error) {
    console.error(`Failed to get invoice ${id}:`, error);
    throw new Error('Unable to retrieve invoice details.');
  }
}

export async function saveInvoice(data) {
  try {
    const now = new Date().toISOString();
    const invoice = {
      ...data,
      status: data.status || 'Issued',
      createdAt: now,
      updatedAt: now
    };
    const id = await db.invoices.add(invoice);
    return { ...invoice, id };
  } catch (error) {
    console.error('Failed to save invoice:', error);
    throw new Error('Unable to save invoice to local storage. Storage quota may be exceeded.');
  }
}

export async function updateInvoice(id, data) {
  try {
    const numId = Number(id);
    const existing = await db.invoices.get(numId);
    if (!existing) throw new Error('Invoice not found');

    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString()
    };
    await db.invoices.put(updated);
    return updated;
  } catch (error) {
    console.error(`Failed to update invoice ${id}:`, error);
    throw new Error('Unable to update invoice in local storage.');
  }
}

export async function deleteInvoice(id) {
  try {
    await db.invoices.delete(Number(id));
    return true;
  } catch (error) {
    console.error(`Failed to delete invoice ${id}:`, error);
    throw new Error('Unable to delete invoice from local storage.');
  }
}

export async function duplicateInvoice(id, newInvoiceNumber) {
  try {
    const existing = await getInvoiceById(id);
    if (!existing) throw new Error('Source invoice not found');

    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const duplicate = {
      ...existing,
      id: undefined,
      invoiceNumber: newInvoiceNumber,
      invoiceDate: today,
      status: 'Draft',
      createdAt: now,
      updatedAt: now
    };

    const newId = await db.invoices.add(duplicate);
    return { ...duplicate, id: newId };
  } catch (error) {
    console.error(`Failed to duplicate invoice ${id}:`, error);
    throw new Error('Unable to duplicate invoice.');
  }
}
