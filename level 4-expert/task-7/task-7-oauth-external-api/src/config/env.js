/**
 * Environment configuration and startup validation.
 * Centralizes all environment variable access and enforces safety invariants.
 */
const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT, 10) || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || `http://localhost:${PORT}`;
const GITHUB_CALLBACK_URL =
  process.env.GITHUB_CALLBACK_URL || `http://localhost:${PORT}/auth/github/callback`;

// 1. SESSION_SECRET Validation:
// In production and development alike, weak session secrets make session forgery and HMAC bypass trivial.
// We strictly enforce a minimum length of 32 characters.
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.trim().length < 32) {
  const errMsg =
    '[FATAL CONFIG ERROR] SESSION_SECRET must be defined in .env and be at least 32 characters long for secure HMAC signing.';
  // In tests, if not set, we can allow a default only if NODE_ENV === 'test'
  if (NODE_ENV === 'test') {
    process.env.SESSION_SECRET = 'test_default_session_secret_at_least_32_characters_long_for_safety';
  } else {
    console.error(errMsg);
    throw new Error(errMsg);
  }
}

// 2. GitHub OAuth Credentials Check:
// If missing, we do NOT crash the app — this allows running tests and local demos without registering an app first.
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ? process.env.GITHUB_CLIENT_ID.trim() : '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ? process.env.GITHUB_CLIENT_SECRET.trim() : '';
const isOAuthConfigured = Boolean(
  GITHUB_CLIENT_ID &&
  GITHUB_CLIENT_SECRET &&
  !GITHUB_CLIENT_ID.includes('your_github') &&
  !GITHUB_CLIENT_SECRET.includes('your_github')
);

if (!isOAuthConfigured && NODE_ENV !== 'test') {
  console.warn('\x1b[33m%s\x1b[0m', '----------------------------------------------------------------------');
  console.warn('\x1b[33m%s\x1b[0m', '[NOTICE] GitHub OAuth is NOT fully configured (GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET missing).');
  console.warn('\x1b[33m%s\x1b[0m', '  - Real /auth/github calls will respond with a friendly HTTP 503.');
  console.warn('\x1b[33m%s\x1b[0m', '  - Use DEMO_MODE=true for testing the dashboard without GitHub credentials.');
  console.warn('\x1b[33m%s\x1b[0m', '  - See README.md for instructions on registering a GitHub OAuth App.');
  console.warn('\x1b[33m%s\x1b[0m', '----------------------------------------------------------------------');
}

// 3. Demo Mode Configuration:
// Demo mode is explicitly disabled in production for security.
let DEMO_MODE = process.env.DEMO_MODE === 'true';
if (DEMO_MODE && NODE_ENV === 'production') {
  console.warn('[SECURITY WARNING] DEMO_MODE=true was requested, but refused because NODE_ENV=production. Demo mode disabled.');
  DEMO_MODE = false;
}

module.exports = {
  NODE_ENV,
  PORT,
  SESSION_SECRET: process.env.SESSION_SECRET || SESSION_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_CALLBACK_URL,
  CLIENT_ORIGIN,
  DEMO_MODE,
  isOAuthConfigured
};
