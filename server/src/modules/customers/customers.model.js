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
    customerType: {
      type: String,
      enum: ['B2B', 'B2C'],
      default: 'B2B'
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

customerSchema.index({ userId: 1, name: 1 });
customerSchema.index({ userId: 1, gstin: 1 });

export const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
