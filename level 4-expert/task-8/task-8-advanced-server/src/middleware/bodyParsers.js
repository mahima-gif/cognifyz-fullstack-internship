const express = require('express');

/**
 * Custom error handler specifically for body-parser syntax and limit exceptions
 */
function handleBodyParserError(err, req, res, next) {
  // Malformed JSON syntax error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Malformed JSON payload in request body',
      errors: [{ message: err.message }],
      requestId: req.id || null,
    });
  }

  // Payload too large error (413)
  if (err.status === 413 || err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      data: null,
      message: 'Payload too large. Maximum allowed size is 10kb',
      errors: [{ message: err.message }],
      requestId: req.id || null,
    });
  }

  next(err);
}

/**
 * Returns configured body parsing middleware stack with size limits and error conversion
 */
function createBodyParsers() {
  return [
    express.json({ limit: '10kb' }),
    express.urlencoded({ extended: true, limit: '10kb' }),
    handleBodyParserError,
  ];
}

module.exports = createBodyParsers;
module.exports.handleBodyParserError = handleBodyParserError;
