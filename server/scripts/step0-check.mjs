// Step 0 investigation script — read-only, no changes
import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/billgst';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  // 1. Invoice indexes
  console.log('\n=== INVOICE INDEXES ===');
  const invoiceIndexes = await db.collection('invoices').indexes();
  for (const idx of invoiceIndexes) {
    console.log(JSON.stringify(idx));
  }

  // 2. Customer type distribution
  console.log('\n=== CUSTOMER TYPE DISTRIBUTION ===');
  const customerTypes = await db.collection('customers').aggregate([
    { $group: { _id: '$customerType', count: { $sum: 1 } } }
  ]).toArray();
  console.log(JSON.stringify(customerTypes, null, 2));

  // 3. Sample customers (name, type, gstin)
  console.log('\n=== SAMPLE CUSTOMERS (up to 10) ===');
  const samples = await db.collection('customers').find({}).limit(10).toArray();
  for (const c of samples) {
    console.log(JSON.stringify({ id: c._id, name: c.name, customerType: c.customerType, gstin: c.gstin || '' }));
  }

  // 4. Duplicate GSTINs per user
  console.log('\n=== DUPLICATE GSTINs PER USER ===');
  const dups = await db.collection('customers').aggregate([
    { $match: { gstin: { $exists: true, $ne: '' } } },
    { $group: { _id: { userId: '$userId', gstin: '$gstin' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  if (dups.length === 0) {
    console.log('No duplicate GSTINs found.');
  } else {
    console.log(JSON.stringify(dups, null, 2));
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

