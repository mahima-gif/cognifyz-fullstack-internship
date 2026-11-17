/**
 * 404 Not Found Middleware
 * 
 * Intercepts requests that did not match any registered routes and returns
 * a standardized JSON error response.
 */

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    data: null,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
    errors: [
      {
        field: 'route',
        message: `Endpoint ${req.method} ${req.originalUrl} does not exist.`
      }
    ]
  });
}

module.exports = notFoundHandler;

