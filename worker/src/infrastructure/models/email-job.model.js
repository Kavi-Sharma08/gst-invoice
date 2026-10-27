import mongoose from 'mongoose';

const emailJobSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    recipientEmail: { type: String, required: true },
    recipientName: { type: String, default: '' },
    emailType: { type: String, enum: ['INVOICE'], default: 'INVOICE' },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'RETRY_SCHEDULED', 'SENT', 'FAILED_PERMANENTLY'],
      default: 'PENDING'
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    nextAttemptAt: { type: Date, default: Date.now },
    leaseExpiresAt: { type: Date, default: null },
    idempotencyKey: { type: String, required: true, unique: true },
    lastErrorCode: { type: String, default: null },
    lastErrorMessage: { type: String, default: null },
    sentAt: { type: Date, default: null },
    providerMessageId: { type: String, default: null }
  },
  { timestamps: true }
);

emailJobSchema.index({ status: 1, nextAttemptAt: 1, leaseExpiresAt: 1 });

export const EmailJob =
  mongoose.models.EmailJob || mongoose.model('EmailJob', emailJobSchema);
