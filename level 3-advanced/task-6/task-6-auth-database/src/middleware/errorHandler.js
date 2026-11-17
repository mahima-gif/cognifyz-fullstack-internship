const AppError = require('../utils/AppError');

/**
 * Transforms Mongoose CastError (e.g., invalid ObjectId) to clean 400 AppError
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Transforms Mongoose Duplicate Key Error (E11000) to clean 409 Conflict AppError
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue ? err.keyValue[field] : '';
  const message = `The ${field} '${value}' is already registered. Please use another value.`;
  return new AppError(message, 409, [{ field, message }]);
};

/**
 * Transforms Mongoose Schema ValidationError to clean 400 AppError
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => ({
    field: el.path,
    message: el.message,
  }));
  const message = errors.map((e) => e.message).join('. ');
  return new AppError(message || 'Validation failed', 400, errors);
};

/**
 * Transforms JWT invalid token errors
 */
const handleJWTError = () =>
  new AppError('Invalid authentication token. Please log in again.', 401);

/**
 * Transforms JWT expired token errors
 */
const handleJWTExpiredError = () =>
  new AppError('Your session has expired. Please log in again.', 401);

/**
 * Global Error Handling Middleware
 * Centralizes all error formatting and enforces consistent JSON response schema:
 * {
 *   success: false,
 *   data: null,
 *   message: string,
 *   errors: array
 * }
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.statusCode = err.statusCode || 500;

  // Convert Mongoose/JWT errors into standard AppErrors
  if (err.name === 'CastError') error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  const statusCode = error.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // For debugging in development environment, log unexpected errors
  if (statusCode === 500) {
    console.error('\x1b[31m[Unhandled Exception]:\x1b[0m', err);
  }

  // Response payload adhering strictly to the contract
  const response = {
    success: false,
    data: null,
    message: error.isOperational
      ? error.message
      : 'An unexpected internal server error occurred.',
    errors: error.errors || [],
  };

  // Include stack trace only if explicitly in development and error is unexpected
  if (isDevelopment && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
