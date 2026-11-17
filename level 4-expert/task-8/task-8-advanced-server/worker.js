/**
 * Standalone Worker Process for Redis Mode
 * Command: npm run worker
 *
 * In REDIS mode, this standalone process runs independently from the HTTP API server,
 * fetching jobs directly from Redis, enforcing concurrency limits, handling retries,
 * and recording job progress.
 */
const { detectRedisMode } = require('./src/config/redis');
const BullMQQueueDriver = require('./src/services/queue/bullmq.driver');

async function startStandaloneWorker() {
  console.log('====================================================');
  console.log('   OpsDesk Background Worker Process (Redis Mode)   ');
  console.log('====================================================');

  const { mode } = await detectRedisMode();
  if (mode !== 'redis') {
    console.error('[Worker] Fatal: Redis is not reachable or REDIS_URL is not set.');
    console.error('[Worker] The standalone worker requires a running Redis instance.');
    console.error('[Worker] For in-memory mode, run "npm start" (worker is embedded automatically).');
    process.exit(1);
  }

  const driver = new BullMQQueueDriver();
  await driver.startWorker();

  console.log('[Worker] Connected to Redis. Worker listening for background jobs (concurrency: 2)...');

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n[Worker] Received ${signal}. Shutting down worker gracefully...`);
    try {
      await driver.close();
      console.log('[Worker] Closed worker and Redis connections cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('[Worker] Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('uncaughtException', (err) => {
    console.error('[Worker] Uncaught exception:', err);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[Worker] Unhandled rejection:', reason);
  });
}

if (require.main === module) {
  startStandaloneWorker();
}

module.exports = startStandaloneWorker;
