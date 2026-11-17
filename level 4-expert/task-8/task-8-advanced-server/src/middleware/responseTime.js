/**
 * Middleware: responseTime
 * Accurately tracks response duration using process.hrtime.bigint()
 * Injects the X-Response-Time header before headers are sent to the client.
 */
function responseTimeMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  req._startTime = start;

  // Intercept writeHead to set header before it is transmitted
  const originalWriteHead = res.writeHead;
  let headerSet = false;

  res.writeHead = function (...args) {
    if (!headerSet && !res.headersSent) {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
      headerSet = true;
    }
    return originalWriteHead.apply(this, args);
  };

  next();
}

module.exports = responseTimeMiddleware;
