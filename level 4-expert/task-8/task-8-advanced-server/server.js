const http = require('http');
const app = require('./app');
const env = require('./src/config/env');
const cacheService = require('./src/services/cache');
const queueService = require('./src/services/queue');

let server = null;
let isShuttingDown = false;

async function startServer() {
  try {
    // Initialize cache and queue drivers (handles mode detection)
    const cacheDriver = await cacheService.getStats();
    const queueDriver = await queueService.getJobs(1);
    const activeMode = cacheDriver.mode;

    console.log('====================================================');
    console.log('   OpsDesk Advanced Server - Cognitive Level 4      ');
    console.log(`   Active Mode: ${activeMode.toUpperCase()}`);
    console.log('====================================================');

    if (activeMode === 'memory') {
      // In MEMORY mode, the worker runs inside the same process
      await queueService.startWorker();
      console.log('[Queue] In-process worker started automatically (concurrency: 2).');
    } else {
      console.log('[Queue] Running in REDIS mode. Ensure standalone worker is running: "npm run worker"');
    }

    server = http.createServer(app);

    server.listen(env.port, () => {
      console.log(`[Server] OpsDesk HTTP server listening on http://localhost:${env.port}`);
      console.log(`[Server] Dashboard available at http://localhost:${env.port}/`);
      console.log(`[Server] Health endpoint: http://localhost:${env.port}/api/health`);
    });

    // Graceful shutdown registration
    const handleShutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);

      // 10-second force-kill watchdog
      const forceTimeout = setTimeout(() => {
        console.error('[Server] Graceful shutdown timed out. Forcing process exit.');
        process.exit(1);
      }, 10000);
      if (forceTimeout.unref) forceTimeout.unref();

      if (server) {
        server.close(async () => {
          console.log('[Server] HTTP connection listener stopped.');

          try {
            await queueService.close();
            console.log('[Queue] Queue service and worker closed.');

            await cacheService.close();
            console.log('[Cache] Cache service connections closed.');

            console.log('[Server] Graceful shutdown completed cleanly.');
            process.exit(0);
          } catch (err) {
            console.error('[Server] Error during resource cleanup:', err);
            process.exit(1);
          }
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

    process.on('uncaughtException', (err) => {
      console.error('[Process] Uncaught Exception:', err.stack || err);
      handleShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      console.error('[Process] Unhandled Promise Rejection:', reason);
      handleShutdown('unhandledRejection');
    });

    return server;
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
