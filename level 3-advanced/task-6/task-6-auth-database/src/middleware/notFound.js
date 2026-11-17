const AppError = require('../utils/AppError');

/**
 * notFound Middleware: Handles requests to non-existent API routes
 */
const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

module.exports = notFound;
