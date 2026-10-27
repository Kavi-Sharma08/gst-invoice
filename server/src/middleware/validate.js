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
