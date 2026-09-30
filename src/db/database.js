import Dexie from 'dexie';

export const db = new Dexie('BillGSTDatabase');

// Schema definition
db.version(1).stores({
  business: 'id, businessName, gstin, state, updatedAt',
  customers: '++id, name, gstin, state, email, phone, createdAt, updatedAt',
  products: '++id, name, type, hsnSac, gstRate, createdAt, updatedAt',
  invoices: '++id, invoiceNumber, invoiceDate, customerId, grandTotal, status, createdAt, updatedAt',
  settings: 'key'
});
