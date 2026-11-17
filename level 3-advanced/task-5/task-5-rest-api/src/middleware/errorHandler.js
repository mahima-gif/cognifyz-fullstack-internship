/**
 * Global Error Handler Middleware
 * 
 * Catches all unhandled synchronous and asynchronous exceptions in the request pipeline.
 * Formats errors according to the universal JSON shape:
 * { success: false, data: null, message: string, errors: array }
 * 
 * Crucially, server stack traces are logged on the server console and NEVER
 * leaked to client responses to prevent information disclosure vulnerabilities.
 */

function errorHandler(err, req, res, next) {
  // Always log full stack trace on server for internal diagnostics
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  // Handle malformed JSON body from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Malformed JSON payload. Please ensure request body contains valid JSON.',
      errors: [
        {
          field: 'body',
          message: err.message
        }
      ]
    });
  }

  // Handle custom HTTP status errors if set
  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error. Please try again later.' : err.message;

  res.status(statusCode).json({
    success: false,
    data: null,
    message,
    errors: err.errors || [
      {
        field: 'server',
        message
      }
    ]
  });
}

module.exports = errorHandler;

