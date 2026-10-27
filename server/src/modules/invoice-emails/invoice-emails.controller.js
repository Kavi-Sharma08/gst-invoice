import { asyncHandler } from '../../shared/http/async-handler.js';
import * as emailService from './invoice-emails.service.js';

/**
 * POST /api/v1/invoices/:id/email
 * Accepts the delivery request durably and immediately returns 202.
 * Never waits for actual delivery.
 */
export const sendEmail = asyncHandler(async (req, res) => {
  const { recipientEmail, recipientName } = req.body;
  const job = await emailService.enqueueInvoiceEmail(
    req.user.id,
    req.params.id,
    recipientEmail,
    recipientName
  );

  res.status(202).json({
    success: true,
    message: 'Email delivery has been queued and will be processed shortly.',
    data: job
  });
});

/**
 * GET /api/v1/invoices/:id/email-status
 * Returns the current delivery status of the latest email job.
 */
export const getEmailStatus = asyncHandler(async (req, res) => {
  const status = await emailService.getEmailStatus(req.user.id, req.params.id);
  res.status(200).json({ success: true, data: status });
});
