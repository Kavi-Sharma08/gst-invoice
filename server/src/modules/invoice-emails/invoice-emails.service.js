import crypto from 'crypto';
import { EmailJob } from './invoice-emails.model.js';
import { Invoice } from '../invoices/invoices.model.js';
import { AppError } from '../../shared/errors/app-error.js';

/**
 * Creates a durable email job in the outbox for the given invoice.
 * Returns HTTP 202 Accepted immediately — never waits for delivery.
 *
 * @param {string} userId
 * @param {string} invoiceId
 * @param {string} recipientEmail
 * @param {string} [recipientName]
 * @returns {Promise<Object>} The created email job
 */
export async function enqueueInvoiceEmail(userId, invoiceId, recipientEmail, recipientName = '') {
  // Verify invoice ownership before queuing
  const invoice = await Invoice.findOne({ _id: invoiceId, userId });
  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  // Idempotency key: scoped to user + invoice + recipient to prevent duplicate jobs
  const idempotencyKey = crypto
    .createHash('sha256')
    .update(`${userId}:${invoiceId}:${recipientEmail.toLowerCase().trim()}`)
    .digest('hex');

  const existing = await EmailJob.findOne({ idempotencyKey });
  if (existing) {
    // Allow re-queueing only for terminally failed or explicitly completed jobs
    if (['SENT', 'PROCESSING', 'PENDING', 'RETRY_SCHEDULED'].includes(existing.status)) {
      return {
        ...existing.toJSON(),
        message: 'An email delivery job already exists for this invoice and recipient.'
      };
    }

    // Re-queue a previously failed job by resetting state
    const reset = await EmailJob.findOneAndUpdate(
      { _id: existing._id, userId },
      {
        $set: {
          status: 'PENDING',
          attempts: 0,
          nextAttemptAt: new Date(),
          leaseExpiresAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
          sentAt: null,
          providerMessageId: null
        }
      },
      { new: true }
    );
    return reset.toJSON();
  }

  const job = await EmailJob.create({
    userId,
    invoiceId,
    recipientEmail: recipientEmail.toLowerCase().trim(),
    recipientName,
    emailType: 'INVOICE',
    status: 'PENDING',
    idempotencyKey,
    nextAttemptAt: new Date()
  });

  return job.toJSON();
}

/**
 * Returns the current delivery status of an email job for a given invoice.
 * Always validates userId ownership to prevent cross-user access.
 */
export async function getEmailStatus(userId, invoiceId) {
  // Ensure invoice belongs to user
  const invoice = await Invoice.findOne({ _id: invoiceId, userId });
  if (!invoice) {
    throw new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
  }

  const job = await EmailJob.findOne({ invoiceId, userId }).sort({ createdAt: -1 });
  if (!job) {
    return { status: 'NOT_QUEUED', invoiceId };
  }

  const result = job.toJSON();

  // Expose safe user-facing error messages without leaking provider internals
  if (job.status === 'FAILED_PERMANENTLY') {
    result.userMessage =
      'Email delivery failed permanently. Please check the recipient address and try again.';
  } else if (job.status === 'RETRY_SCHEDULED') {
    result.userMessage = 'Delivery failed temporarily. The system will retry automatically.';
  }

  return result;
}
