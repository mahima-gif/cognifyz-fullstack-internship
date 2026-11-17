/**
 * Primary Application API Routes.
 * Implements health monitoring, authenticated user state, external proxy endpoints,
 * OAuth-backed GitHub integration, rate limit visibility, and error simulation.
 */

const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/requireAuth');
const { externalApiLimiter, getLimiterState } = require('../middleware/rateLimiters');
const { validateWeatherQuery, validateCountryParam } = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { cache } = require('../utils/cache');
const { requestLog } = require('../utils/requestLog');

const userController = require('../controllers/user.controller');
const weatherController = require('../controllers/weather.controller');
const countryController = require('../controllers/country.controller');
const githubController = require('../controllers/github.controller');
const demoController = require('../controllers/demo.controller');

/**
 * GET /api/health
 * Public health check & diagnostics endpoint.
 * Returns process uptime and in-memory cache metrics.
 */
router.get('/health', (req, res) => {
  const uptimeSeconds = Math.floor(process.uptime());
  const cacheStats = cache.getStats();

  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      uptime: `${uptimeSeconds}s`,
      timestamp: new Date().toISOString(),
      cache: cacheStats
    }
  });
});

/**
 * GET /api/config
 * Public configuration endpoint for UI feature toggles.
 */
router.get('/config', userController.getClientConfig);

/**
 * ============================================================================
 * PROTECTED ROUTES (Require active authenticated session)
 * ============================================================================
 */

// User profile & session history
router.get('/me', requireAuth, userController.getCurrentUser);
router.get('/search-history', requireAuth, userController.getSearchHistory);

// Rate limit visibility endpoint
router.get(
  '/limits',
  requireAuth,
  asyncHandler(async (req, res) => {
    const limits = await getLimiterState(req);
    res.status(200).json({
      success: true,
      data: limits
    });
  })
);

// Authenticated user request log (ring buffer of last 25 calls)
router.get('/request-log', requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    data: requestLog.getEntries(req.user.id)
  });
});

// GitHub API integration through server-side OAuth access token
router.get(
  '/github/profile',
  requireAuth,
  externalApiLimiter,
  asyncHandler(githubController.getProfile)
);

router.get(
  '/github/repos',
  requireAuth,
  externalApiLimiter,
  asyncHandler(githubController.getRepos)
);

// Controlled error simulation endpoint for demoing error handling
router.get(
  '/demo/error',
  requireAuth,
  externalApiLimiter,
  demoController.triggerError
);

// Weather inquiry (Input validation -> Strict rate limit -> Open-Meteo proxy)
router.get(
  '/weather',
  requireAuth,
  validateWeatherQuery,
  externalApiLimiter,
  asyncHandler(weatherController.getWeather)
);

// Standalone country inquiry (Input validation -> Strict rate limit -> REST Countries proxy)
router.get(
  '/country/:code',
  requireAuth,
  validateCountryParam,
  externalApiLimiter,
  asyncHandler(countryController.getCountry)
);

module.exports = router;
