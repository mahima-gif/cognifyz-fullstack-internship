/**
 * 404 Not Found Middleware
 * Catch-all for unhandled routes, returning a standardized JSON error.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    data: null,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errors: [],
    requestId: req.id || null,
  });
}

module.exports = notFoundHandler;
