/**
 * Request Validation Middleware using express-validator.
 *
 * Input sanitization and validation prevents injection attacks, malformed query params,
 * and unnecessary upstream API calls with garbage data.
 */

const { query, param, validationResult } = require('express-validator');

/**
 * Middleware that checks validation results and returns an immediate 400 Bad Request
 * if validation errors are detected.
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => `${err.path}: ${err.msg}`);
    return res.status(400).json({
      success: false,
      message: 'Invalid request input parameters.',
      errors: formattedErrors
    });
  }
  next();
}

/**
 * City weather query validation:
 * - city: 2 to 60 chars; letters (including international accents), spaces, hyphens, apostrophes, periods.
 * - units: optional; 'metric' or 'imperial' only.
 */
const validateWeatherQuery = [
  query('city')
    .trim()
    .notEmpty()
    .withMessage('City parameter is required.')
    .isLength({ min: 2, max: 60 })
    .withMessage('City name must be between 2 and 60 characters.')
    // Regex allows Latin & accented international letters, spaces, hyphens, apostrophes, and dots
    .matches(/^[\p{L}\s\-\.'’]+$/u)
    .withMessage('City name can only contain letters, spaces, hyphens, apostrophes, and periods.'),
  query('units')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(['metric', 'imperial'])
    .withMessage("Units must be either 'metric' or 'imperial'."),
  handleValidationErrors
];

/**
 * Country code parameter validation:
 * - code: exactly 2 alphabetic characters (ISO 3166-1 alpha-2)
 */
const validateCountryParam = [
  param('code')
    .trim()
    .notEmpty()
    .withMessage('Country code is required.')
    .isLength({ min: 2, max: 2 })
    .withMessage('Country code must be exactly 2 letters (ISO 3166-1 alpha-2).')
    .isAlpha()
    .withMessage('Country code must contain only alphabetic characters.'),
  handleValidationErrors
];

module.exports = {
  validateWeatherQuery,
  validateCountryParam
};
