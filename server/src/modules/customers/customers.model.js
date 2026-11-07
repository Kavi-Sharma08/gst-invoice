import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: 150
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    // Canonical values: 'registered' | 'unregistered'
    customerType: {
      type: String,
      enum: ['registered', 'unregistered'],
      default: 'registered'
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
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
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    archivedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        if (ret._id != null) ret.id = ret._id.toString();
        if (ret.userId != null) ret.userId = ret.userId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound indexes for efficient queries
customerSchema.index({ userId: 1, isArchived: 1, name: 1 });
customerSchema.index({ userId: 1, gstin: 1 });

// Unique partial index: only enforce GSTIN uniqueness per user when GSTIN is non-empty
customerSchema.index(
  { userId: 1, gstin: 1 },
  {
    unique: true,
    partialFilterExpression: {
      gstin: { $type: 'string', $gt: '' }
    },
    name: 'userId_1_gstin_1_unique_nonempty'
  }
);

export const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
