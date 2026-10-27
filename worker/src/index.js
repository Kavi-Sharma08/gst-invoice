import { connectDB } from './infrastructure/database/mongodb.js';
import { startJobProcessor } from './jobs/email-job.processor.js';
import { logger } from './infrastructure/logging/logger.js';

const controller = new AbortController();

async function main() {
  logger.info('BillGST Email Worker starting...');

  try {
    await connectDB();
    await startJobProcessor({ signal: controller.signal });
  } catch (err) {
    logger.error('Worker fatal error', { error: err.message });
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — worker shutting down gracefully...');
  controller.abort();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received — worker shutting down gracefully...');
  controller.abort();
});

main();
