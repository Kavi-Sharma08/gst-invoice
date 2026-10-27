import mongoose from 'mongoose';

/**
 * Durable outbox collection for asynchronous email delivery.
 * Atomic job claiming via findOneAndUpdate prevents concurrent duplicate processing.
 */
const emailJobSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true
    },
    recipientEmail: {
      type: String,
      required: [true, 'Recipient email is required'],
      trim: true,
      lowercase: true
    },
    recipientName: {
      type: String,
      trim: true,
      default: ''
    },
    emailType: {
      type: String,
      enum: ['INVOICE'],
      default: 'INVOICE'
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'RETRY_SCHEDULED', 'SENT', 'FAILED_PERMANENTLY'],
      default: 'PENDING',
      index: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 5
    },
    nextAttemptAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    leaseExpiresAt: {
      type: Date,
      default: null
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true
    },
    lastErrorCode: {
      type: String,
      default: null
    },
    lastErrorMessage: {
      type: String,
      default: null
    },
    sentAt: {
      type: Date,
      default: null
    },
    providerMessageId: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.userId = ret.userId.toString();
        ret.invoiceId = ret.invoiceId.toString();
        delete ret._id;
        delete ret.__v;
        // Never expose internal error details in API responses
        delete ret.lastErrorCode;
        return ret;
      }
    }
  }
);

// Compound index for efficient worker polling
emailJobSchema.index(
  { status: 1, nextAttemptAt: 1, leaseExpiresAt: 1 },
  { name: 'worker_polling_idx' }
);
emailJobSchema.index({ idempotencyKey: 1 }, { unique: true });

export const EmailJob =
  mongoose.models.EmailJob || mongoose.model('EmailJob', emailJobSchema);
