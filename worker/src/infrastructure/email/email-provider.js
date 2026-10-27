import nodemailer from 'nodemailer';
import { workerEnv } from '../../config/env.js';
import { logger } from '../logging/logger.js';

let transporter = null;

/**
 * Returns a configured nodemailer transporter.
 * Falls back to Ethereal (test) transport when SMTP credentials are missing.
 * @returns {Promise<nodemailer.Transporter>}
 */
export async function getTransporter() {
  if (transporter) return transporter;

  if (!workerEnv.SMTP_HOST || !workerEnv.SMTP_USER) {
    logger.warn('SMTP credentials not configured — using Ethereal test transport');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    logger.info('Ethereal test transport ready', { user: testAccount.user });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: workerEnv.SMTP_HOST,
    port: workerEnv.SMTP_PORT,
    secure: workerEnv.SMTP_SECURE,
    auth: {
      user: workerEnv.SMTP_USER,
      pass: workerEnv.SMTP_PASS
    }
  });

  return transporter;
}

/**
 * Classifies a nodemailer/SMTP error as permanent or transient.
 * Permanent errors should not be retried.
 * @param {Error} err
 * @returns {{ isPermanent: boolean, code: string, safeMessage: string }}
 */
export function classifyEmailError(err) {
  const message = (err.message || '').toLowerCase();
  const responseCode = err.responseCode || 0;

  // SMTP 5xx permanent failures: bad address, mailbox not found, spam block
  if (
    responseCode >= 500 ||
    message.includes('invalid address') ||
    message.includes('user not found') ||
    message.includes('does not exist') ||
    message.includes('no such user') ||
    message.includes('mailbox unavailable')
  ) {
    return {
      isPermanent: true,
      code: 'PERMANENT_DELIVERY_FAILURE',
      safeMessage: 'Delivery failed permanently: recipient address rejected.'
    };
  }

  return {
    isPermanent: false,
    code: 'TRANSIENT_DELIVERY_FAILURE',
    safeMessage: 'Delivery failed temporarily. Will retry.'
  };
}

/**
 * Sends an email using the configured transporter.
 * @param {{ to: string, toName: string, subject: string, html: string, text: string }} options
 * @returns {Promise<{ messageId: string }>}
 */
export async function sendEmail({ to, toName, subject, html, text }) {
  const transport = await getTransporter();
  const info = await transport.sendMail({
    from: `"${workerEnv.EMAIL_FROM_NAME}" <${workerEnv.EMAIL_FROM_ADDRESS}>`,
    to: toName ? `"${toName}" <${to}>` : to,
    subject,
    text,
    html
  });

  // Log Ethereal preview URL for development
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info('Ethereal preview URL', { url: previewUrl });
  }

  return { messageId: info.messageId };
}
