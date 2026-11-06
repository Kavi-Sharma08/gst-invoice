import { asyncHandler } from '../../shared/http/async-handler.js';
import * as emailService from './invoice-emails.service.js';
import { sendItem } from '../../shared/http/response.js';

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

  return sendItem(res, job, 202);
});

/**
 * GET /api/v1/invoices/:id/email-status
 * Returns the current delivery status of the latest email job.
 */
export const getEmailStatus = asyncHandler(async (req, res) => {
  const status = await emailService.getEmailStatus(req.user.id, req.params.id);
  return sendItem(res, status, 200);
});
