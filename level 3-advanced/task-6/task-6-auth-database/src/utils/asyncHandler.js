/**
 * asyncHandler: Wraps async route handlers to catch uncaught rejections
 * and automatically forwards them to the Express global error handling middleware.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
