import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    userId: { type: String },
    businessProfileId: { type: mongoose.Schema.Types.ObjectId },
    invoiceNumber: String,
    invoiceDate: String,
    dueDate: String,
    status: String,
    placeOfSupply: String,
    taxType: { type: String, default: 'INTRA' },
    customer: mongoose.Schema.Types.Mixed,
    business: mongoose.Schema.Types.Mixed,
    items: [mongoose.Schema.Types.Mixed],
    grossAmount: Number,
    discountAmount: Number,
    taxableAmount: Number,
    cgst: Number,
    sgst: Number,
    igst: Number,
    totalTax: Number,
    grandTotal: Number,
    roundOff: Number,
    netTotal: Number,
    notes: String,
    terms: String,
    bankDetails: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

export const Invoice =
  mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
