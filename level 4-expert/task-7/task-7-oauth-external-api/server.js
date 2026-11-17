/**
 * Server Entrypoint.
 * Boots the Express server on configured PORT.
 */

const app = require('./app');
const { PORT, NODE_ENV } = require('./src/config/env');

const server = app.listen(PORT, () => {
  console.log('======================================================================');
  console.log(`🚀 CityPulse Dashboard running in [${NODE_ENV}] mode`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log('======================================================================');
});

// Graceful shutdown handling
function gracefulShutdown(signal) {
  console.log(`\n[${signal}] Received shutdown signal. Closing HTTP server gracefully...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });

  // Force exit after 5 seconds if connections fail to close
  setTimeout(() => {
    console.error('Forcefully terminating process after 5s timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
