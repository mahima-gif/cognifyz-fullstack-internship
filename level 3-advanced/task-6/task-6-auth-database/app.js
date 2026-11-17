require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const sanitizeInput = require('./src/middleware/sanitize');
const errorHandler = require('./src/middleware/errorHandler');
const notFound = require('./src/middleware/notFound');

const authRoutes = require('./src/routes/auth.routes');
const tasksRoutes = require('./src/routes/tasks.routes');
const adminRoutes = require('./src/routes/admin.routes');

// ============================================================================
// SECURITY STARTUP CHECK: JWT_SECRET STRENGTH VERIFICATION
// ============================================================================
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  console.error('\x1b[31m[CRITICAL SECURITY FATAL ERROR]\x1b[0m');
  console.error('JWT_SECRET is either missing or too weak (less than 32 characters).');
  console.error('Cryptographic signing requires a strong secret key to prevent forgery.');
  console.error('Please configure a secure JWT_SECRET in your .env file and restart.');
  process.exit(1);
}

const app = express();

// ============================================================================
// SECURITY & UTILITY MIDDLEWARES
// ============================================================================

// 1. Helmet: Sets secure HTTP response headers to protect against common web vulnerabilities
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  })
);

// 2. CORS: Restrict cross-origin access and enable credentials for cookies
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5000';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin static frontend)
      if (!origin || origin === allowedOrigin) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy does not allow access from ${origin}`));
      }
    },
    credentials: true, // Allow cookies across requests
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. Morgan: HTTP request logging (disabled during automated testing)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 4. Body Parser with 10kb size limit to mitigate Denial of Service (DoS) payload flooding
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. Cookie Parser: Parses incoming cookie header and populates req.cookies
app.use(cookieParser());

// 6. NoSQL Injection Sanitization: Strips keys starting with '$' or containing '.'
app.use(sanitizeInput);

// ============================================================================
// STATIC ASSETS SERVING
// ============================================================================
app.use(express.static(path.join(__dirname, 'public')));

// Root route convenience redirect
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ============================================================================
// API ROUTES
// ============================================================================
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SecureTasks API is healthy and operational',
    data: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    errors: [],
  });
});

// ============================================================================
// 404 AND ERROR HANDLING MIDDLEWARE
// ============================================================================
// Catch 404 and forward to error handler
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
