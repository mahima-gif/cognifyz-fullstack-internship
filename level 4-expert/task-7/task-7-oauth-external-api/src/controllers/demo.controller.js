/**
 * Demo & Error Simulation Controller.
 * Provides on-demand error simulation through the REAL production error-handling pipeline.
 *
 * Security:
 * Strictly disabled when NODE_ENV === 'production' unless explicitly enabled via DEMO_MODE=true.
 */

const AppError = require('../utils/AppError');
const { DEMO_MODE, NODE_ENV } = require('../config/env');

/**
 * GET /api/demo/error?type=timeout|upstream500|upstream429|notfound|badinput
 */
function triggerError(req, res, next) {
  // Guard against production execution if demo mode is off
  if (NODE_ENV === 'production' && !DEMO_MODE) {
    return next(new AppError('Error simulation is disabled in production mode.', 403));
  }

  const { type } = req.query;

  switch (type) {
    case 'timeout':
      // Simulates client-side request abort after 5000ms timeout
      return next(
        new AppError('Open-Meteo request timed out after 5000ms. Please try again.', 504)
      );

    case 'upstream500':
      // Simulates upstream service internal 500 crash
      return next(
        new AppError(
          'Open-Meteo is currently experiencing issues (HTTP 500). Upstream unavailable.',
          502
        )
      );

    case 'upstream429':
      // Simulates upstream service rate limit rejection
      return next(
        new AppError(
          'Open-Meteo rate limit exceeded. Please wait a moment before trying again.',
          503,
          null,
          30 // 30-second retryAfter
        )
      );

    case 'notfound':
      // Simulates resource not found
      return next(
        new AppError("City 'NonExistentCityXYZ' not found. Please verify spelling.", 404)
      );

    case 'badinput':
      // Simulates express-validator rejection
      return next(
        new AppError('Invalid request input parameters.', 400, [
          'city: City name must be between 2 and 60 characters.'
        ])
      );

    default:
      return next(
        new AppError(
          `Invalid error type '${type || ''}'. Valid types: timeout, upstream500, upstream429, notfound, badinput`,
          400
        )
      );
  }
}

module.exports = {
  triggerError
};
