import dotenv from 'dotenv';
dotenv.config();

export const workerEnv = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/billgst',
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS || '10000', 10),
  JOB_LEASE_DURATION_MS: parseInt(process.env.JOB_LEASE_DURATION_MS || '60000', 10),
  MAX_CONCURRENT_JOBS: parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10),
  // SMTP / Email provider settings
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || 'noreply@billgst.in',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'BillGST',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_SECURE: process.env.SMTP_SECURE === 'true'
};
