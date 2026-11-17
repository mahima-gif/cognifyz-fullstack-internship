const fs = require('fs');
const path = require('path');

const logDir = path.resolve(__dirname, '../../logs');
const logFile = path.join(logDir, 'access.log');

// Ensure log directory exists
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (err) {
  console.error('[Logger] Failed to create log directory:', err.message);
}

// Dedicated append stream for high-performance non-blocking writes
const accessLogStream = fs.createWriteStream(logFile, { flags: 'a' });

/**
 * Strips sensitive query parameter values (e.g. token, password, apiKey) from the URL
 * @param {string} originalUrl
 * @returns {string} Sanitized URL
 */
function sanitizeUrl(originalUrl) {
  try {
    const urlObj = new URL(originalUrl, 'http://localhost');
    const sensitiveKeys = ['token', 'secret', 'password', 'key', 'apikey', 'auth', 'access_token'];

    urlObj.searchParams.forEach((value, key) => {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        urlObj.searchParams.set(key, '[REDACTED]');
      }
    });

    return urlObj.pathname + (urlObj.search ? urlObj.search : '');
  } catch (_) {
    return originalUrl;
  }
}

/**
 * Middleware: requestLogger
 * Logs incoming requests to console and logs/access.log on response completion.
 * Never logs bodies, cookies, or authorization tokens.
 */
function requestLoggerMiddleware(req, res, next) {
  const start = req._startTime || process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = (Number(end - start) / 1_000_000).toFixed(2);
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '-';
    const method = req.method;
    const cleanUrl = sanitizeUrl(req.originalUrl || req.url);
    const statusCode = res.statusCode;
    const reqId = req.id || '-';
    const timestamp = new Date().toISOString();

    const logEntry = `[${timestamp}] [${reqId}] ${ip} ${method} ${cleanUrl} ${statusCode} ${durationMs}ms`;

    // Console output (suppressed in test mode unless debug is set)
    if (process.env.NODE_ENV !== 'test') {
      console.log(logEntry);
    }

    // Append to access log file
    try {
      accessLogStream.write(logEntry + '\n');
    } catch (err) {
      console.error('[Logger] Failed writing to access.log:', err.message);
    }
  });

  next();
}

module.exports = requestLoggerMiddleware;
module.exports.logFile = logFile;
module.exports.sanitizeUrl = sanitizeUrl;
