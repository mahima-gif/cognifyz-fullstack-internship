/**
 * 404 Not Found Catch-All Middleware.
 */
function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found on this server.`,
    errors: ['Not Found']
  });
}

module.exports = notFound;
