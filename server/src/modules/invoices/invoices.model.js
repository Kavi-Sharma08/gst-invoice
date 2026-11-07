import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    hsnSac: { type: String, trim: true, default: '' },
    quantity: { type: Number, required: true, min: 0.001 },
    unit: { type: String, trim: true, default: 'Nos' },
    rate: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    gstRate: { type: Number, required: true, min: 0, max: 100 },
    grossAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    cgstRate: { type: Number, default: 0 },
    sgstRate: { type: Number, default: 0 },
    igstRate: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 }
  },
  { _id: false }
);

const customerSnapshotSchema = new mongoose.Schema(
  {
    id: { type: String },
    name: { type: String, default: '' },
    gstin: { type: String, default: '' },
    address: { type: String, default: '' },
    state: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' }
  },
  { _id: false }
);

const businessSnapshotSchema = new mongoose.Schema(
  {
    businessName: { type: String, default: '' },
    gstin: { type: String, default: '' },
    pan: { type: String, default: '' },
    address: { type: String, default: '' },
    state: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' }
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    businessProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessProfile'
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    invoiceNumber: {
      type: String,
      trim: true,
      default: ''
    },
    invoiceDate: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10)
    },
    dueDate: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Draft', 'Issued', 'Paid', 'Cancelled'],
      default: 'Draft'
    },
    currency: {
      type: String,
      default: 'INR'
    },
    placeOfSupply: {
      type: String,
      default: ''
    },
    taxType: {
      type: String,
      enum: ['INTRA', 'INTER'],
      default: 'INTRA'
    },
    customer: {
      type: customerSnapshotSchema,
      default: () => ({})
    },
    business: {
      type: businessSnapshotSchema,
      default: () => ({})
    },
    items: {
      type: [lineItemSchema],
      required: true,
      validate: [(v) => Array.isArray(v) && v.length > 0, 'At least one line item is required']
    },
    grossAmount: { type: Number, required: true, default: 0 },
    discountAmount: { type: Number, required: true, default: 0 },
    taxableAmount: { type: Number, required: true, default: 0 },
    cgst: { type: Number, required: true, default: 0 },
    sgst: { type: Number, required: true, default: 0 },
    igst: { type: Number, required: true, default: 0 },
    totalTax: { type: Number, required: true, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    roundOff: { type: Number, required: true, default: 0 },
    netTotal: { type: Number, required: true, default: 0 },
    notes: { type: String, default: '' },
    terms: { type: String, default: '' },
    bankDetails: {
      accountName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      bankName: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      branch: { type: String, default: '' },
      upiId: { type: String, default: '' }
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        if (ret._id != null) ret.id = ret._id.toString();
        if (ret.userId != null) ret.userId = ret.userId.toString();
        if (ret.businessProfileId != null) ret.businessProfileId = ret.businessProfileId.toString();
        if (ret.customerId != null) ret.customerId = ret.customerId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Unique partial index: invoiceNumber uniqueness per user, only for non-empty values.
// MongoDB does not support $ne in partialFilterExpression, so we use $gt: '' alone.
// Drafts always have invoiceNumber='' so they are excluded automatically.
invoiceSchema.index(
  { userId: 1, invoiceNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      invoiceNumber: { $type: 'string', $gt: '' }
    },
    name: 'userId_1_invoiceNumber_1_unique_nonempty'
  }
);
invoiceSchema.index({ userId: 1, status: 1, invoiceDate: -1 });
invoiceSchema.index({ userId: 1, customerId: 1 });
invoiceSchema.index({ userId: 1, invoiceDate: -1 });

export const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
