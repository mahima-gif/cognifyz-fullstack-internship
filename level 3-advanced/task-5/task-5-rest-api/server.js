/**
 * TaskFlow Server Application
 * 
 * Express HTTP Server exposing RESTful API endpoints for task management
 * and serving the client-side front-end application.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');

const tasksRouter = require('./src/routes/tasks.routes');
const notFoundHandler = require('./src/middleware/notFound');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// Middleware Pipeline
// ==========================================

// Enable Cross-Origin Resource Sharing
app.use(cors());

// HTTP request logger (skip during automated test runs)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Parse JSON request payloads
app.use(express.json());

// Serve static frontend assets from /public directory
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// API Routes
// ==========================================

// Mount Tasks resource router under /api/tasks
app.use('/api/tasks', tasksRouter);

// Catch-all 404 handler for unmatched /api routes
app.all('/api/*', notFoundHandler);

// Fallback for non-API requests (serve index.html for Single Page feel)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// Global Error Handling Middleware
// ==========================================
app.use(errorHandler);

// ==========================================
// Server Activation
// ==========================================
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[TaskFlow Server] Server is running on http://localhost:${PORT}`);
    console.log(`[TaskFlow Server] REST API available at http://localhost:${PORT}/api/tasks`);
    console.log(`[TaskFlow Server] API Stats available at http://localhost:${PORT}/api/tasks/stats`);
  });
}

// Export app for test suites (allows testing on ephemeral ports)
module.exports = app;

