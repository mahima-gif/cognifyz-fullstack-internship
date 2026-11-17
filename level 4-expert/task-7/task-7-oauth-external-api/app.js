/**
 * Express Application Configuration and Factory.
 * Builds and exports the app for both server startup and automated testing.
 */

const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { SESSION_SECRET, NODE_ENV, CLIENT_ORIGIN } = require('./src/config/env');
const passport = require('./src/config/passport');
const { generalLimiter } = require('./src/middleware/rateLimiters');
const { requestLog } = require('./src/utils/requestLog');
const authRoutes = require('./src/routes/auth.routes');
const apiRoutes = require('./src/routes/api.routes');
const notFound = require('./src/middleware/notFound');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// Trust reverse proxy headers (e.g. Nginx, Heroku, Cloudflare) for accurate rate limiting and secure cookies
app.set('trust proxy', 1);

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: [
          "'self'",
          'data:',
          'https://avatars.githubusercontent.com',
          'https://*.githubusercontent.com',
          'https://flagcdn.com',
          'https://upload.wikimedia.org'
        ],
        connectSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// Cross-Origin Resource Sharing (CORS) with RateLimit and Cache headers exposed
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposedHeaders: [
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
      'RateLimit-Policy',
      'Retry-After',
      'X-Cache'
    ]
  })
);

// HTTP Request Logger
if (NODE_ENV !== 'test') {
  app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Management with express-session
app.use(
  session({
    name: 'citypulse.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // Prevents client-side scripts from reading the cookie (anti-XSS)
      sameSite: 'lax', // CSRF defense while permitting OAuth redirect flow
      secure: NODE_ENV === 'production', // Requires HTTPS in production
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Passport Authentication Middleware
app.use(passport.initialize());
app.use(passport.session());

// Ring-buffer request logger for authenticated /api requests
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.user?.id) {
      const sanitizedPath = (req.originalUrl || req.url || '').split('?')[0];

      // Avoid recording the request log polling endpoint itself
      if (sanitizedPath === '/api/request-log') return;

      const durationMs = Date.now() - start;
      requestLog.addEntry(req.user.id, {
        method: req.method,
        path: sanitizedPath,
        statusCode: res.statusCode,
        durationMs,
        cache: res.get('X-Cache') || 'none'
      });
    }
  });
  next();
});

// Static Files (Frontend UI)
app.use(express.static(path.join(__dirname, 'public')));

// General API Rate Limiting applied to /api/*
app.use('/api', generalLimiter);

// Route Mounting
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

// Catch-All 404 for undefined endpoints
app.use(notFound);

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
