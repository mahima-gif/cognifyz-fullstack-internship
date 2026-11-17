/**
 * Central Error Handling Middleware
 * Ensures all errors conform to the standard response shape:
 * { success: false, data: null, message, errors: [], requestId }
 * Prevents stack trace leakage to clients while logging details for debugging.
 */
function errorHandler(err, req, res, next) {
  // If response has already started streaming, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = Number.isInteger(err.statusCode)
    ? err.statusCode
    : (typeof err.status === 'number' ? err.status : 500);

  const message = err.message || 'An internal server error occurred';
  const errors = Array.isArray(err.errors) ? err.errors : [];
  const reqId = req.id || null;

  // Log server errors (5xx)
  if (statusCode >= 500 && process.env.NODE_ENV !== 'test') {
    console.error(`[Server Error] [${reqId || 'N/A'}] ${err.stack || err.message}`);
  }

  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
    errors,
    requestId: reqId,
  });
}

module.exports = errorHandler;
