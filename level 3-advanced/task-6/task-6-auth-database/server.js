require('dotenv').config();
const app = require('./app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

/**
 * Bootstrap Server:
 * 1. Establish database connection with MongoDB
 * 2. Bind and listen on configured HTTP port
 */
const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Start Express Server
  const server = app.listen(PORT, () => {
    console.log('\x1b[36m====================================================\x1b[0m');
    console.log(`\x1b[32m[SecureTasks Server]\x1b[0m Running on http://localhost:${PORT}`);
    console.log(`\x1b[32m[Environment]\x1b[0m ${process.env.NODE_ENV || 'development'}`);
    console.log(`\x1b[32m[Client Portal]\x1b[0m Login: http://localhost:${PORT}/login.html`);
    console.log('\x1b[36m====================================================\x1b[0m');
  });

  // Graceful shutdown handling
  const shutdown = (signal) => {
    console.log(`\n\x1b[33m[Process]\x1b[0m Received ${signal}. Gracefully shutting down...`);
    server.close(() => {
      console.log('\x1b[32m[Server]\x1b[0m HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
