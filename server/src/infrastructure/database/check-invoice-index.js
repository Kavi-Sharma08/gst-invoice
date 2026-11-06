import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Inspection script to report duplicate invoice numbers and drafts with numbers
 * before creating the unique partial index.
 */
export async function checkInvoiceIndexPreconditions() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/billgst';
  await mongoose.connect(uri);

  const Invoice = mongoose.connection.collection('invoices');
  const allInvoices = await Invoice.find({}).toArray();

  const draftsWithNumbers = allInvoices.filter(
    (inv) => inv.status === 'Draft' && inv.invoiceNumber && inv.invoiceNumber.trim() !== ''
  );

  const numberMap = new Map();
  const duplicates = [];

  for (const inv of allInvoices) {
    if (inv.status !== 'Draft' && inv.invoiceNumber && inv.invoiceNumber.trim() !== '') {
      const key = `${inv.userId}::${inv.invoiceNumber.trim()}`;
      if (numberMap.has(key)) {
        duplicates.push({
          userId: inv.userId,
          invoiceNumber: inv.invoiceNumber,
          firstId: numberMap.get(key),
          secondId: inv._id.toString()
        });
      } else {
        numberMap.set(key, inv._id.toString());
      }
    }
  }

  const result = {
    totalInvoices: allInvoices.length,
    draftsWithNumbersCount: draftsWithNumbers.length,
    draftsWithNumbers: draftsWithNumbers.map((d) => ({ id: d._id.toString(), number: d.invoiceNumber })),
    duplicatesCount: duplicates.length,
    duplicates
  };

  console.log('[INDEX AUDIT RESULT]', JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1]?.endsWith('check-invoice-index.js')) {
  checkInvoiceIndexPreconditions()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[INDEX AUDIT ERROR]', err);
      await mongoose.disconnect();
      process.exit(1);
    });
}
