const helmet = require('helmet');
const cors = require('cors');
const env = require('../config/env');

/**
 * Configures security headers (Helmet) and CORS
 */
function createSecurityMiddleware() {
  const helmetMiddleware = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  const corsMiddleware = cors({
    origin: env.corsOrigin === '*' ? true : env.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-Id', 'X-Response-Time', 'X-Cache'],
  });

  return [helmetMiddleware, corsMiddleware];
}

module.exports = createSecurityMiddleware;
