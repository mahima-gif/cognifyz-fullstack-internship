const crypto = require('crypto');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Middleware: requestId
 * Attaches a unique request identifier (UUID v4) to req.id and the X-Request-Id response header.
 * Reuses incoming X-Request-Id if valid UUID format to preserve distributed tracing.
 */
function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  const requestId = (incomingId && UUID_REGEX.test(incomingId))
    ? incomingId
    : crypto.randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
}

module.exports = requestIdMiddleware;
