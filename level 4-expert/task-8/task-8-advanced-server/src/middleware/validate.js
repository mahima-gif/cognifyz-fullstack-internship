const { validationResult } = require('express-validator');

/**
 * Higher-order middleware that executes express-validator rules
 * and returns a standardized 400 response if validation fails.
 * @param {Array<import('express-validator').ValidationChain>} validations
 */
function validate(validations) {
  return async (req, res, next) => {
    // Execute all validation rules concurrently
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param || 'unknown',
      message: err.msg,
      value: err.value,
    }));

    return res.status(400).json({
      success: false,
      data: null,
      message: 'Validation failed',
      errors: formattedErrors,
      requestId: req.id || null,
    });
  };
}

module.exports = validate;
