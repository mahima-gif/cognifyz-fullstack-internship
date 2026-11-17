const { validationResult, param } = require('express-validator');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

/**
 * Middleware that inspects express-validator results.
 * If validation errors exist, formats them and forwards an AppError with 400 Bad Request.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return next(
      new AppError(
        formattedErrors[0]?.message || 'Input validation failed',
        400,
        formattedErrors
      )
    );
  }
  next();
};

/**
 * Reusable validator rule to verify route params are valid 24-character hex MongoDB ObjectIds.
 * Avoids CastError 500s and standardizes 400 response for invalid IDs.
 */
const validateObjectId = (paramName = 'id') => {
  return [
    param(paramName).custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(`Invalid ${paramName} format: must be a valid 24-character hexadecimal ObjectId`);
      }
      return true;
    }),
    validate,
  ];
};

module.exports = {
  validate,
  validateObjectId,
};
