import mongoose from 'mongoose';
import { AppError } from '../shared/errors/app-error.js';

/**
 * Validates request data against a Zod schema.
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} [target='body']
 */
export function validate(schema, target = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const details = result.error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message
      }));
      return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', details));
    }
    req[target] = result.data;
    next();
  };
}

/**
 * Express router.param middleware to validate 24-character hexadecimal MongoDB ObjectIds.
 * Returns 400 INVALID_ID if parameter is not a valid ObjectId.
 */
export function validateObjectId(paramName = 'id') {
  return (req, res, next, val) => {
    const id = val || req.params[paramName];
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError(`Invalid identifier format: ${id}`, 400, 'INVALID_ID'));
    }
    next();
  };
}
