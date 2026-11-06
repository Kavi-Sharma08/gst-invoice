/**
 * Custom application error class for standardized operational errors.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {string} [code] - Machine-readable error code
   * @param {Array|Object} [details] - Optional validation or contextual details
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null, fields = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.fields = fields;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
