import { EmailJob } from '../infrastructure/models/email-job.model.js';
import { Invoice } from '../infrastructure/models/invoice.model.js';
import { sendEmail, classifyEmailError } from '../infrastructure/email/email-provider.js';
import { buildInvoiceEmailTemplate } from '../templates/invoice-email.template.js';
import { logger } from '../infrastructure/logging/logger.js';
import { workerEnv } from '../config/env.js';

/**
 * Exponential backoff with jitter.
 * @param {number} attempts
 * @returns {Date} nextAttemptAt
 */
function calcNextAttempt(attempts) {
  const base = Math.min(300, 5 * Math.pow(2, attempts)); // Max 5 minutes
  const jitter = Math.random() * base * 0.3;
  const delaySeconds = base + jitter;
  return new Date(Date.now() + delaySeconds * 1000);
}

/**
 * Atomically claims one pending job using findOneAndUpdate with a lease.
 * This prevents multiple concurrent worker processes from picking up the same job.
 * @returns {Promise<Document|null>}
 */
async function claimNextJob() {
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + workerEnv.JOB_LEASE_DURATION_MS);

  return EmailJob.findOneAndUpdate(
    {
      status: { $in: ['PENDING', 'RETRY_SCHEDULED'] },
      nextAttemptAt: { $lte: now },
      $or: [{ leaseExpiresAt: null }, { leaseExpiresAt: { $lt: now } }]
    },
    {
      $set: { status: 'PROCESSING', leaseExpiresAt },
      $inc: { attempts: 1 }
    },
    { returnDocument: 'after', sort: { nextAttemptAt: 1 } }
  );
}

/**
 * Processes a single email job: loads invoice data, renders template, sends email, updates status.
 * @param {Document} job
 */
async function processJob(job) {
  logger.info('Processing email job', {
    jobId: job._id.toString(),
    invoiceId: job.invoiceId.toString(),
    attempt: job.attempts
  });

  try {
    // 1. Load invoice (scoped to owning user)
    const invoice = await Invoice.findOne({ _id: job.invoiceId, userId: job.userId });
    if (!invoice) {
      await EmailJob.findByIdAndUpdate(job._id, {
        $set: {
          status: 'FAILED_PERMANENTLY',
          lastErrorCode: 'INVOICE_NOT_FOUND',
          lastErrorMessage: 'Invoice was deleted before email delivery',
          leaseExpiresAt: null
        }
      });
      logger.warn('Invoice not found for email job — marked as permanently failed', {
        jobId: job._id.toString()
      });
      return;
    }

    const businessName = invoice.business?.businessName || 'BillGST Business';

    // 2. Build email content
    const { subject, html, text } = buildInvoiceEmailTemplate({
      invoice: invoice.toObject ? invoice.toObject() : invoice,
      businessName,
      recipientName: job.recipientName || invoice.customer?.name || ''
    });

    // 3. Send email via provider adapter
    const { messageId } = await sendEmail({
      to: job.recipientEmail,
      toName: job.recipientName,
      subject,
      html,
      text
    });

    // 4. Mark job as SENT
    await EmailJob.findByIdAndUpdate(job._id, {
      $set: {
        status: 'SENT',
        sentAt: new Date(),
        providerMessageId: messageId,
        lastErrorCode: null,
        lastErrorMessage: null,
        leaseExpiresAt: null
      }
    });

    logger.info('Email job completed successfully', {
      jobId: job._id.toString(),
      invoiceId: job.invoiceId.toString(),
      messageId
    });
  } catch (err) {
    const { isPermanent, code, safeMessage } = classifyEmailError(err);

    if (isPermanent || job.attempts >= job.maxAttempts) {
      await EmailJob.findByIdAndUpdate(job._id, {
        $set: {
          status: 'FAILED_PERMANENTLY',
          lastErrorCode: code,
          lastErrorMessage: safeMessage,
          leaseExpiresAt: null
        }
      });
      logger.error('Email job permanently failed', {
        jobId: job._id.toString(),
        reason: code,
        attempts: job.attempts
      });
    } else {
      const nextAttemptAt = calcNextAttempt(job.attempts);
      await EmailJob.findByIdAndUpdate(job._id, {
        $set: {
          status: 'RETRY_SCHEDULED',
          lastErrorCode: code,
          lastErrorMessage: safeMessage,
          nextAttemptAt,
          leaseExpiresAt: null
        }
      });
      logger.warn('Email job scheduled for retry', {
        jobId: job._id.toString(),
        nextAttemptAt,
        attempt: job.attempts
      });
    }
  }
}

/**
 * Main polling loop. Claims and processes pending jobs at a bounded rate.
 * Gracefully stops when shutdown is requested.
 * @param {{ signal: AbortSignal }} options
 */
export async function startJobProcessor({ signal } = {}) {
  logger.info('Email job processor started', {
    pollIntervalMs: workerEnv.POLL_INTERVAL_MS,
    maxConcurrent: workerEnv.MAX_CONCURRENT_JOBS
  });

  while (!signal?.aborted) {
    try {
      const runningJobs = [];

      for (let i = 0; i < workerEnv.MAX_CONCURRENT_JOBS; i++) {
        const job = await claimNextJob();
        if (!job) break;
        runningJobs.push(processJob(job));
      }

      if (runningJobs.length > 0) {
        await Promise.allSettled(runningJobs);
      } else {
        // No jobs available — wait before next poll
        await new Promise((resolve) => setTimeout(resolve, workerEnv.POLL_INTERVAL_MS));
      }
    } catch (err) {
      logger.error('Job processor error', { error: err.message });
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  logger.info('Email job processor stopped');
}
