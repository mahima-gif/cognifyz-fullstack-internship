const fs = require('fs');
const cacheService = require('../services/cache');
const queueService = require('../services/queue');
const { logFile } = require('../middleware/requestLogger');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Controller: Health check endpoint
 * GET /api/health
 */
const getHealth = asyncHandler(async (req, res) => {
  const queueData = await queueService.getJobs(1);
  const cacheStats = await cacheService.getStats();

  res.status(200).json({
    success: true,
    data: {
      status: 'UP',
      uptime: process.uptime(),
      mode: cacheStats.mode, // 'redis' | 'memory'
      timestamp: new Date().toISOString(),
      queue: {
        mode: queueData.mode,
        counts: queueData.counts,
      },
      cache: cacheStats,
    },
    message: 'System operational',
    errors: [],
  });
});

/**
 * Controller: Cache statistics
 * GET /api/cache/stats
 */
const getCacheStats = asyncHandler(async (req, res) => {
  const stats = await cacheService.getStats();

  res.status(200).json({
    success: true,
    data: stats,
    message: 'Cache statistics retrieved',
    errors: [],
  });
});

/**
 * Controller: Flush all cache keys (Admin / Demo utility)
 * DELETE /api/cache
 */
const clearCache = asyncHandler(async (req, res) => {
  await cacheService.clear();

  res.status(200).json({
    success: true,
    data: { cleared: true },
    message: 'Cache successfully flushed and hit/miss counters reset',
    errors: [],
  });
});

/**
 * Controller: Access log tail reader
 * GET /api/logs/tail?lines=20
 */
const getLogTail = asyncHandler(async (req, res) => {
  const linesRequested = parseInt(req.query.lines, 10) || 20;
  const maxLines = Math.min(Math.max(1, linesRequested), 100);

  let lines = [];
  try {
    if (fs.existsSync(logFile)) {
      const content = await fs.promises.readFile(logFile, 'utf8');
      const allLines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      lines = allLines.slice(-maxLines);
    }
  } catch (err) {
    console.warn('[LogTail] Could not read access log:', err.message);
  }

  res.status(200).json({
    success: true,
    data: {
      count: lines.length,
      lines,
    },
    message: `Retrieved last ${lines.length} log lines`,
    errors: [],
  });
});

module.exports = {
  getHealth,
  getCacheStats,
  clearCache,
  getLogTail,
};
