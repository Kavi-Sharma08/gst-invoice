/**
 * Fix invoice unique index.
 *
 * The existing index `userId_1_invoiceNumber_1` is unique with NO partialFilterExpression,
 * which means two drafts with invoiceNumber='' would collide. MongoDB does NOT support
 * $ne in partialFilterExpression, so the correct filter is:
 *   { invoiceNumber: { $type: 'string', $gt: '' } }
 *
 * This script:
 * 1. Reports the existing indexes
 * 2. Checks for any conflicts that would block index creation
 * 3. Drops the old index and creates the corrected partial unique index
 *
 * Run: node scripts/fix-invoice-index.mjs
 */
import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/billgst';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const col = db.collection('invoices');

  console.log('\n=== Current invoice indexes ===');
  const before = await col.indexes();
  for (const idx of before) {
    console.log(JSON.stringify({ name: idx.name, key: idx.key, unique: idx.unique, partialFilterExpression: idx.partialFilterExpression }));
  }

  // Check for drafts with conflicting invoiceNumber values (non-empty duplicates by userId)
  console.log('\n=== Checking for non-draft invoices with empty invoiceNumber (would not be covered by new index) ===');
  const issuedWithEmpty = await col.countDocuments({ status: { $ne: 'Draft' }, invoiceNumber: '' });
  if (issuedWithEmpty > 0) {
    console.warn(`WARNING: ${issuedWithEmpty} non-draft invoices have an empty invoiceNumber. These should be reviewed.`);
  } else {
    console.log('OK — no non-draft invoices with empty invoiceNumber.');
  }

  // Check for duplicate (userId, invoiceNumber) among non-empty invoiceNumbers
  console.log('\n=== Checking for duplicate (userId, invoiceNumber) conflicts ===');
  const dups = await col.aggregate([
    { $match: { invoiceNumber: { $gt: '' } } },
    { $group: { _id: { userId: '$userId', invoiceNumber: '$invoiceNumber' }, count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  if (dups.length > 0) {
    console.error('CONFLICT: Duplicate (userId, invoiceNumber) pairs found. Resolve before creating unique index:');
    console.error(JSON.stringify(dups, null, 2));
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log('OK — no duplicate (userId, invoiceNumber) pairs found.');

  // Drop the existing non-partial unique index
  const existingIndex = before.find(idx => idx.name === 'userId_1_invoiceNumber_1');
  if (existingIndex) {
    console.log('\nDropping existing index: userId_1_invoiceNumber_1 ...');
    await col.dropIndex('userId_1_invoiceNumber_1');
    console.log('✓ Dropped.');
  } else {
    console.log('\nNo existing userId_1_invoiceNumber_1 index found — will create fresh.');
  }

  // Create the corrected partial unique index
  console.log('\nCreating corrected partial unique index on (userId, invoiceNumber) ...');
  await col.createIndex(
    { userId: 1, invoiceNumber: 1 },
    {
      unique: true,
      partialFilterExpression: {
        invoiceNumber: { $type: 'string', $gt: '' }
      },
      name: 'userId_1_invoiceNumber_1_unique_nonempty'
    }
  );
  console.log('✓ Index created.');

  console.log('\n=== Updated invoice indexes ===');
  const after = await col.indexes();
  for (const idx of after) {
    console.log(JSON.stringify({ name: idx.name, key: idx.key, unique: idx.unique, partialFilterExpression: idx.partialFilterExpression }));
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

