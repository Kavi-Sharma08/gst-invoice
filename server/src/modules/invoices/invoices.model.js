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
      required: [true, 'Invoice number is required'],
      trim: true
    },
    invoiceDate: {
      type: String,
      required: [true, 'Invoice date is required']
    },
    dueDate: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Draft', 'Issued', 'Paid', 'Cancelled'],
      default: 'Issued'
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
        ret.id = ret._id.toString();
        ret.userId = ret.userId.toString();
        if (ret.businessProfileId) ret.businessProfileId = ret.businessProfileId.toString();
        if (ret.customerId) ret.customerId = ret.customerId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

invoiceSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ userId: 1, invoiceDate: -1 });
invoiceSchema.index({ userId: 1, status: 1 });

export const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
