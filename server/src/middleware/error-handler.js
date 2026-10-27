import { AppError } from '../shared/errors/app-error.js';
import { logger } from '../infrastructure/logging/logger.js';
import { env } from '../config/env.js';

/**
 * Centralized express error handler.
 */
export function errorHandler(err, req, res, next) {
  let error = err;

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    error = new AppError(`Invalid identifier: ${err.value}`, 400, 'INVALID_ID');
  }

  // Handle Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'record';
    error = new AppError(`A resource with this ${field} already exists.`, 409, 'DUPLICATE_KEY');
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      path: e.path,
      message: e.message
    }));
    error = new AppError('Database validation failed', 400, 'VALIDATION_ERROR', details);
  }

  const statusCode = error.statusCode || 500;
  const errorCode = error.code || 'INTERNAL_SERVER_ERROR';
  const message = error.isOperational ? error.message : 'An unexpected error occurred. Please try again.';

  if (statusCode >= 500) {
    logger.error('Unhandled Server Error', {
      message: err.message,
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
      path: req.originalUrl,
      method: req.method
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      details: error.details || undefined
    }
  });
}
