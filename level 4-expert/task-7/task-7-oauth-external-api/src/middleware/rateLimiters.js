/**
 * Rate Limiting Middleware using express-rate-limit.
 *
 * Why Rate Limiting is Critical:
 * 1. Denial-of-Service (DoS) and Brute-Force Defense:
 *    Prevents malicious actors or buggy clients from overwhelming the Node.js event loop
 *    with excessive concurrent requests.
 * 2. Third-Party API Quota & Cost Protection:
 *    Even though Open-Meteo and REST Countries are free, upstream providers enforce burst
 *    and daily consumption thresholds (e.g. 10,000 calls/day or 60 calls/min).
 *    Rate limiting our own endpoints protects upstream infrastructure from cascading failures
 *    and prevents our server IP from being blocked or blacklisted.
 * 3. Fair Resource Allocation:
 *    Ensures a single aggressive user or script cannot starve out legitimate users.
 */

const rateLimit = require('express-rate-limit');

/**
 * Standard 429 JSON Error Handler
 */
function createRateLimitHandler(customMessage = 'Too many requests. Please slow down.') {
  return (req, res /* , next, options */) => {
    // Calculate remaining seconds until reset
    const resetTime = req.rateLimit?.resetTime
      ? Math.max(1, Math.ceil((new Date(req.rateLimit.resetTime).getTime() - Date.now()) / 1000))
      : 60;

    res.set('Retry-After', String(resetTime));

    res.status(429).json({
      success: false,
      message: customMessage,
      retryAfter: resetTime,
      errors: ['Rate limit exceeded']
    });
  };
}

/**
 * General API Rate Limiter:
 * Allows up to 100 requests per 15 minutes per IP address across all general endpoints.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  standardHeaders: true, // Return standard RateLimit-* headers (RFC draft)
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  handler: createRateLimitHandler('General API rate limit reached. Maximum 100 requests per 15 minutes.'),
  skip: (req) => process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']
});

/**
 * Strict External API Rate Limiter:
 * Applied to endpoints that trigger outbound network traffic to third parties (/api/weather, /api/country, /api/demo/error).
 * Limits to 20 requests per 1-minute window per user (or IP if unauthenticated).
 */
const externalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit to 20 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Key by authenticated user ID if available, otherwise fallback to IP
    return req.user?.id ? `user_${req.user.id}` : (req.ip || 'unknown_client');
  },
  handler: createRateLimitHandler(
    'External API rate limit reached. Maximum 20 weather/country queries per minute.'
  ),
  skip: (req) => process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']
});

/**
 * Retrieve active limiter counters for a given request.
 *
 * @param {import('express').Request} req
 * @returns {Promise<Object>} { general: { limit, remaining, resetSeconds }, strict: { limit, remaining, resetSeconds } }
 */
async function getLimiterState(req) {
  const strictKey = req.user?.id ? `user_${req.user.id}` : (req.ip || 'unknown_client');
  const generalKey = req.ip || 'unknown_client';

  let strictHits = 0;
  let strictResetTime = null;
  if (externalApiLimiter.store && typeof externalApiLimiter.store.get === 'function') {
    try {
      const record = await externalApiLimiter.store.get(strictKey);
      if (record) {
        strictHits = record.totalHits || 0;
        strictResetTime = record.resetTime;
      }
    } catch (_) {}
  }

  let generalHits = 0;
  let generalResetTime = null;
  if (generalLimiter.store && typeof generalLimiter.store.get === 'function') {
    try {
      const record = await generalLimiter.store.get(generalKey);
      if (record) {
        generalHits = record.totalHits || 0;
        generalResetTime = record.resetTime;
      }
    } catch (_) {}
  }

  const now = Date.now();
  const strictResetSeconds = strictResetTime
    ? Math.max(0, Math.ceil((new Date(strictResetTime).getTime() - now) / 1000))
    : 60;

  const generalResetSeconds = generalResetTime
    ? Math.max(0, Math.ceil((new Date(generalResetTime).getTime() - now) / 1000))
    : 900;

  return {
    general: {
      limit: 100,
      remaining: Math.max(0, 100 - generalHits),
      resetSeconds: generalResetSeconds
    },
    strict: {
      limit: 20,
      remaining: Math.max(0, 20 - strictHits),
      resetSeconds: strictResetSeconds
    }
  };
}

module.exports = {
  generalLimiter,
  externalApiLimiter,
  getLimiterState
};
