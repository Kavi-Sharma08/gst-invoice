import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { clerkMiddleware } from '@clerk/express';
import { env } from './config/env.js';
import { connectDB } from './infrastructure/database/mongodb.js';
import { logger } from './infrastructure/logging/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { businessRoutes } from './modules/business/business.routes.js';
import { customerRoutes } from './modules/customers/customers.routes.js';
import { productRoutes } from './modules/products/products.routes.js';
import { invoiceRoutes } from './modules/invoices/invoices.routes.js';
import { migrationRoutes } from './modules/migration/migration.routes.js';

dotenv.config();

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Request ID and structured request logging
app.use((req, res, next) => {
  req.requestId = Math.random().toString(36).slice(2, 10);
  logger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl
  });
  next();
});

// Clerk authentication middleware (validates session tokens / cookies)
if (env.CLERK_SECRET_KEY) {
  app.use(
    clerkMiddleware({
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
      secretKey: env.CLERK_SECRET_KEY
    })
  );
} else {
  app.use(clerkMiddleware());
}

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/business-profile', businessRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/migration', migrationRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Cannot ${req.method} ${req.originalUrl}` }
  });
});

// ── Centralized Error Handler ──────────────────────────────────────────────────
app.use(errorHandler);

// ── Startup ───────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB();
    app.listen(env.PORT, () => {
      logger.info(`BillGST API server running`, {
        port: env.PORT,
        env: env.NODE_ENV
      });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, startServer };
export default app;
