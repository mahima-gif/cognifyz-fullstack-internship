/**
 * Wraps an async route handler or middleware to catch any unhandled promise rejection
 * and forward it to Express's next(err) error pipeline.
 *
 * @param {Function} fn - Async Express route handler
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
