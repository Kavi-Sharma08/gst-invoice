import mongoose from 'mongoose';

const invoiceCounterSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true
    },
    prefix: {
      type: String,
      required: true
    },
    seq: {
      type: Number,
      required: true,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

invoiceCounterSchema.index({ userId: 1, prefix: 1 }, { unique: true });

export const InvoiceCounter =
  mongoose.models.InvoiceCounter || mongoose.model('InvoiceCounter', invoiceCounterSchema);
