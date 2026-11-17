/**
 * AppError: Custom operational error class for predictable error handling
 * Distinguishes operational errors (e.g. invalid input, unauthorized) from programming bugs.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (e.g., 400, 401, 403, 404, 409)
   * @param {Array} [errors=[]] - Optional array of specific field errors
   */
  constructor(message, statusCode, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
