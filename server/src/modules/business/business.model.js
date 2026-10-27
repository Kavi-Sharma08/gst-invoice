import mongoose from 'mongoose';

const bankDetailsSchema = new mongoose.Schema(
  {
    accountName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    bankName: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    branch: { type: String, default: '' },
    upiId: { type: String, default: '' }
  },
  { _id: false }
);

const invoiceSettingsSchema = new mongoose.Schema(
  {
    invoicePrefix: { type: String, default: 'INV/' },
    startingNumber: { type: Number, default: 1 },
    defaultNotes: { type: String, default: 'Thank you for your business!' },
    defaultTerms: { type: String, default: 'Payment due within 15 days.' }
  },
  { _id: false }
);

const businessProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: 200
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    state: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    bankDetails: {
      type: bankDetailsSchema,
      default: () => ({})
    },
    invoiceSettings: {
      type: invoiceSettingsSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.userId = ret.userId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

businessProfileSchema.index({ userId: 1 });

export const BusinessProfile =
  mongoose.models.BusinessProfile || mongoose.model('BusinessProfile', businessProfileSchema);
