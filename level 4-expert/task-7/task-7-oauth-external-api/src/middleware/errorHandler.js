/**
 * Central Error Handling Middleware.
 *
 * Security & Reliability Best Practices:
 * 1. Information Disclosure Prevention:
 *    NEVER leak stack traces, internal database details, third-party authentication tokens,
 *    or raw upstream URLs to the client.
 * 2. Audit & Observability:
 *    Logs full diagnostic stack traces to server logs (stdout/stderr) for developer debugging.
 * 3. Uniform Response Contract:
 *    Always returns standard JSON shape: { success: false, message: "...", errors: [...] }
 */

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Server-side logging for operational monitoring
  if (process.env.NODE_ENV !== 'test') {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${req.method} ${req.originalUrl} - Status: ${statusCode}`);
    if (err.stack) {
      console.error(err.stack);
    } else {
      console.error(err);
    }
  }

  // Determine safe user-facing message
  let clientMessage = err.message || 'An internal server error occurred.';
  if (statusCode === 500 && isProduction) {
    clientMessage = 'An unexpected internal error occurred on our server. Please try again later.';
  }

  // Response payload adhering strictly to client contract without stack traces
  const responseBody = {
    success: false,
    message: clientMessage,
    errors: Array.isArray(err.errors) ? err.errors : [clientMessage]
  };

  // Include Retry-After header and body property if present (429 or 503)
  if (err.retryAfter) {
    res.set('Retry-After', String(err.retryAfter));
    responseBody.retryAfter = err.retryAfter;
  }

  res.status(statusCode).json(responseBody);
}

module.exports = errorHandler;
