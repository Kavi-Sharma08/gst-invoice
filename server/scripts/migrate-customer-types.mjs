/**
 * Migrate customer types from legacy B2B/B2C to canonical registered/unregistered.
 * Also creates the new indexes.
 *
 * Rules:
 *   B2B with a non-empty GSTIN  → 'registered'
 *   B2B without a GSTIN         → 'unregistered'  (was wrongly defaulted)
 *   B2C / consumer              → 'unregistered'
 *   already registered/unregistered → no change
 *
 * Usage:
 *   node scripts/migrate-customer-types.mjs            (dry-run, prints changes)
 *   node scripts/migrate-customer-types.mjs --apply    (writes to DB)
 *   node scripts/migrate-customer-types.mjs --indexes  (create indexes only, no migration)
 */
import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/billgst';
const APPLY  = process.argv.includes('--apply');
const INDEXES_ONLY = process.argv.includes('--indexes');

function targetType(doc) {
  const t = (doc.customerType || '').toLowerCase();
  if (t === 'registered' || t === 'unregistered') return null; // already canonical
  if (t === 'b2c' || t === 'consumer') return 'unregistered';
  if (t === 'b2b') {
    // B2B with GSTIN → registered; B2B without GSTIN → unregistered
    return (doc.gstin && doc.gstin.trim()) ? 'registered' : 'unregistered';
  }
  // Unknown value — treat as registered
  return 'registered';
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const col = db.collection('customers');

  // ── Indexes ───────────────────────────────────────────────────────────────
  console.log('\n=== Customer indexes (before) ===');
  const before = await col.indexes();
  for (const idx of before) {
    console.log(JSON.stringify({ name: idx.name, key: idx.key, unique: idx.unique, partialFilterExpression: idx.partialFilterExpression }));
  }

  // Check for GSTIN duplicates that would block the new unique index
  console.log('\n=== Checking for duplicate GSTINs per user ===');
  const dups = await col.aggregate([
    { $match: { gstin: { $exists: true, $gt: '' } } },
    { $group: { _id: { userId: '$userId', gstin: '$gstin' }, count: { $sum: 1 }, ids: { $push: '$_id' }, names: { $push: '$name' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  if (dups.length > 0) {
    console.error('CONFLICT: Duplicate GSTINs found per user. Resolve before creating unique GSTIN index:');
    for (const d of dups) {
      console.error(`  GSTIN: ${d._id.gstin}  userId: ${d._id.userId}  names: ${d.names.join(', ')}`);
    }
    console.error('The unique GSTIN index will NOT be created until these are resolved.');
  } else {
    console.log('OK — no duplicate GSTINs per user.');

    // Drop old non-partial gstin indexes if any, then create the corrected ones
    const oldGstinIdx = before.find(i => i.name === 'userId_1_gstin_1' && !i.partialFilterExpression);
    if (oldGstinIdx) {
      console.log('\nDropping old non-partial userId_1_gstin_1 index ...');
      await col.dropIndex('userId_1_gstin_1');
      console.log('✓ Dropped.');
    }

    // Create the unique partial GSTIN index
    const hasGstinUnique = before.some(i => i.name === 'userId_1_gstin_1_unique_nonempty');
    if (!hasGstinUnique) {
      console.log('\nCreating unique partial GSTIN index ...');
      await col.createIndex(
        { userId: 1, gstin: 1 },
        {
          unique: true,
          partialFilterExpression: { gstin: { $type: 'string', $gt: '' } },
          name: 'userId_1_gstin_1_unique_nonempty'
        }
      );
      console.log('✓ Created userId_1_gstin_1_unique_nonempty');
    } else {
      console.log('  userId_1_gstin_1_unique_nonempty already exists');
    }
  }

  // Create compound (userId, isArchived, name) index
  const hasArchivedName = before.some(i => i.name === 'userId_1_isArchived_1_name_1');
  if (!hasArchivedName) {
    console.log('\nCreating (userId, isArchived, name) index ...');
    await col.createIndex(
      { userId: 1, isArchived: 1, name: 1 },
      { name: 'userId_1_isArchived_1_name_1' }
    );
    console.log('✓ Created userId_1_isArchived_1_name_1');
  } else {
    console.log('  userId_1_isArchived_1_name_1 already exists');
  }

  // Drop old (userId, name) if it exists
  const oldNameIdx = before.find(i => i.name === 'userId_1_name_1');
  if (oldNameIdx) {
    console.log('\nDropping old userId_1_name_1 (replaced by userId_1_isArchived_1_name_1) ...');
    await col.dropIndex('userId_1_name_1');
    console.log('✓ Dropped.');
  }

  if (INDEXES_ONLY) {
    await mongoose.disconnect();
    console.log('\nIndex-only run complete.');
    return;
  }

  // ── Migration ──────────────────────────────────────────────────────────────
  console.log(`\n=== Customer type migration ${APPLY ? '(APPLY)' : '(DRY-RUN)'} ===`);

  const all = await col.find({}).toArray();
  let changeCount = 0;
  const ops = [];

  for (const doc of all) {
    const target = targetType(doc);
    if (!target) continue; // already canonical

    changeCount++;
    console.log(
      `  id=${doc._id}  name="${doc.name}"  gstin="${doc.gstin || ''}"  ` +
      `${doc.customerType} → ${target}`
    );

    if (APPLY) {
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { customerType: target } }
        }
      });
    }
  }

  if (changeCount === 0) {
    console.log('No records need migration. All customerType values are already canonical.');
  } else {
    console.log(`\n${changeCount} record(s) would be changed.`);
    if (APPLY) {
      const result = await col.bulkWrite(ops);
      console.log(`✓ Applied. Modified: ${result.modifiedCount}`);
    } else {
      console.log('Run with --apply to write changes to the database.');
    }
  }

  console.log('\n=== Customer indexes (after) ===');
  const after = await col.indexes();
  for (const idx of after) {
    console.log(JSON.stringify({ name: idx.name, key: idx.key, unique: idx.unique, partialFilterExpression: idx.partialFilterExpression }));
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

