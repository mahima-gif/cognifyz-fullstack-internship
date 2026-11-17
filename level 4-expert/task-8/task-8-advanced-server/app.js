/**
 * ============================================================================
 * ARCHITECTURAL DESIGN: WHY MIDDLEWARE ORDER MATTERS IN EXPRESS
 * ============================================================================
 * Express executes middleware in strict sequential order from top to bottom.
 * Our deliberately ordered pipeline follows this deterministic rationale:
 *
 * 1. requestId:
 *    Must run first of all. Every subsequent middleware, error handler, and log
 *    entry depends on req.id to trace the request lifecycle end-to-end.
 *
 * 2. responseTime:
 *    Must start immediately after request initialization to benchmark the true
 *    wall-clock execution time of the full pipeline (including body parsing,
 *    security headers, route handlers, and serialization). It intercepts
 *    res.writeHead so the X-Response-Time header can be inserted before headers
 *    are sent.
 *
 * 3. requestLogger:
 *    Binds to the response 'finish' event early. Because the listener is registered
 *    early, it guarantees that all completed requests (successful or errored)
 *    are logged with their final HTTP status code, sanitized URL, and duration.
 *
 * 4. security (Helmet & CORS):
 *    Applied before request processing to enforce strict HTTP headers (CSP, HSTS,
 *    X-Content-Type-Options) and early rejection of unauthorized cross-origin preflights
 *    before CPU time is spent parsing request bodies.
 *
 * 5. bodyParsers (JSON & URL-Encoded with size limits):
 *    Parses incoming payloads only after security checks. Enforces a 10kb limit
 *    to protect against denial-of-service (DoS) memory exhaustion. Handles syntax
 *    errors (malformed JSON) and oversized payloads (413) cleanly before route handlers.
 *
 * 6. static assets (/public):
 *    Serves static front-end status dashboard (HTML, CSS, JS) efficiently.
 *
 * 7. application routes (/api/*):
 *    Executes domain controllers, input validations, job enqueuing, and caching.
 *
 * 8. notFound (404 catch-all):
 *    Placed immediately after all valid routes. If no route matched the URL, this
 *    catches the request and emits a standardized 404 JSON response.
 *
 * 9. errorHandler:
 *    Must always be registered last with four parameters (err, req, res, next).
 *    Catches all synchronous and asynchronous errors forwarded via next(err),
 *    ensuring uniform JSON error responses without leaking internal stack traces.
 * ============================================================================
 */

const express = require('express');
const path = require('path');

// Middleware imports
const requestId = require('./src/middleware/requestId');
const responseTime = require('./src/middleware/responseTime');
const requestLogger = require('./src/middleware/requestLogger');
const createSecurityMiddleware = require('./src/middleware/security');
const createBodyParsers = require('./src/middleware/bodyParsers');
const notFound = require('./src/middleware/notFound');
const errorHandler = require('./src/middleware/errorHandler');

// Route imports
const jobsRoutes = require('./src/routes/jobs.routes');
const productsRoutes = require('./src/routes/products.routes');
const systemRoutes = require('./src/routes/system.routes');

function createApp() {
  const app = express();

  // 1. Request ID attribution
  app.use(requestId);

  // 2. High-resolution Response Time measurement
  app.use(responseTime);

  // 3. Centralized non-blocking Request Logger
  app.use(requestLogger);

  // 4. Security headers (Helmet) & CORS
  const [helmetMiddleware, corsMiddleware] = createSecurityMiddleware();
  app.use(helmetMiddleware);
  app.use(corsMiddleware);

  // 5. Body Parsers with 10kb limit & syntax error handling
  const bodyParsers = createBodyParsers();
  app.use(bodyParsers);

  // 6. Serve static files for status dashboard
  app.use(express.static(path.join(__dirname, 'public')));

  // 7. API Routes
  app.use('/api/jobs', jobsRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api', systemRoutes);

  // 8. 404 Not Found Handler for unmapped routes
  app.use(notFound);

  // 9. Centralized Error Handler (must be last)
  app.use(errorHandler);

  return app;
}

const app = createApp();

module.exports = app;
module.exports.createApp = createApp;
