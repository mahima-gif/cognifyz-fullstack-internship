const cacheService = require('../services/cache');

// In-flight request registry for single-flight / request coalescing (Cache Stampede Protection)
const inFlightRequests = new Map();

/**
 * Normalizes request URL into a deterministic cache key with sorted query parameters.
 * E.g. GET /api/products?limit=10&category=books -> cache:GET:/api/products?category=books&limit=10
 * @param {import('express').Request} req
 * @returns {string}
 */
function defaultKeyGenerator(req) {
  const method = req.method.toUpperCase();
  const urlParts = (req.originalUrl || req.url).split('?');
  const pathname = urlParts[0];
  const query = urlParts[1];

  if (!query) {
    return `cache:${method}:${pathname}`;
  }

  const params = new URLSearchParams(query);
  params.sort();
  return `cache:${method}:${pathname}?${params.toString()}`;
}

/**
 * Reusable Cache Middleware with Cache Stampede Protection (Single-Flight Coalescing)
 *
 * Cache Stampede Problem:
 * When a hot cache key expires or is first requested, multiple concurrent requests
 * simultaneously find a cache miss and all execute the slow database/service query at once.
 * This can spike CPU, exhaust database connections, and cause severe latency degradation.
 *
 * Solution:
 * We maintain an in-memory map of in-flight promises per cache key. If a request is already
 * computing data for that key, subsequent concurrent requests wait for that single operation
 * to resolve and share the identical result, hitting the database exactly ONCE.
 *
 * @param {number} ttlSeconds - Time-to-live in seconds
 * @param {Function} [keyFn] - Optional custom key generator (req) => string
 */
function cacheMiddleware(ttlSeconds = 60, keyFn = defaultKeyGenerator) {
  return async (req, res, next) => {
    // Only cache GET and HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    // Never cache responses for requests carrying an Authorization header unless bound to user
    if (req.headers.authorization && !req.user?.id) {
      return next();
    }

    let cacheKey = keyFn(req);
    if (req.user?.id) {
      cacheKey += `:user=${req.user.id}`;
    }

    // 1. Check if item already exists in cache (Cache Hit)
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(cached.status || 200).json(cached.body);
      }
    } catch (err) {
      // Fail-open: proceed to origin if cache read encounters an error
    }

    // 2. Cache Stampede Protection: check if another request is currently computing this key
    if (inFlightRequests.has(cacheKey)) {
      try {
        const result = await inFlightRequests.get(cacheKey);
        res.setHeader('X-Cache', 'HIT');
        return res.status(result.status).json(result.body);
      } catch (err) {
        // If the in-flight request failed, proceed to try fresh
      }
    }

    // 3. Initiate single-flight computation
    let resolveInFlight;
    let rejectInFlight;
    const inFlightPromise = new Promise((resolve, reject) => {
      resolveInFlight = resolve;
      rejectInFlight = reject;
    });
    // Attach no-op catch handler to prevent unhandledRejection if no secondary caller is waiting
    inFlightPromise.catch(() => {});
    inFlightRequests.set(cacheKey, inFlightPromise);

    // 4. Intercept res.json to capture response body and status
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      const statusCode = res.statusCode || 200;

      // Only cache successful 2xx responses (never cache error responses 4xx, 5xx)
      if (statusCode >= 200 && statusCode < 300) {
        cacheService.set(cacheKey, { status: statusCode, body }, ttlSeconds).catch(() => {});
        resolveInFlight({ status: statusCode, body });
        res.setHeader('X-Cache', 'MISS');
      } else {
        rejectInFlight(new Error(`Non-cacheable status: ${statusCode}`));
      }

      inFlightRequests.delete(cacheKey);
      return originalJson(body);
    };

    // Clean up if connection closes prematurely
    res.on('close', () => {
      if (inFlightRequests.has(cacheKey)) {
        inFlightRequests.delete(cacheKey);
      }
    });

    next();
  };
}

module.exports = cacheMiddleware;
module.exports.defaultKeyGenerator = defaultKeyGenerator;
module.exports.inFlightRequests = inFlightRequests;
