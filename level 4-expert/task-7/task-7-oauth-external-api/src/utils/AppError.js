/**
 * Custom application error class for operational errors.
 * Operational errors represent expected runtime problems (invalid inputs, not found, rate limits, upstream failures)
 * rather than programmer bugs.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {number} statusCode - HTTP status code (e.g. 400, 404, 502, 503, 504)
   * @param {Array<string>|null} [errors=null] - Optional detailed error list (e.g. validation issues)
   * @param {number|null} [retryAfter=null] - Optional retry-after duration in seconds (for 429/503)
   */
  constructor(message, statusCode = 500, errors = null, retryAfter = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;
    this.retryAfter = retryAfter;

    // Capture clean stack trace excluding this constructor
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
