/**
 * Authentication Routes.
 * Implements GitHub OAuth 2.0 Authorization Code flow and Session Management.
 * Mounted at /auth in app.js.
 */

const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { isOAuthConfigured, DEMO_MODE, NODE_ENV } = require('../config/env');

/**
 * GET /auth/github
 * Initiates the GitHub OAuth 2.0 Authorization Code Grant flow.
 * Redirects the user's browser to GitHub's consent screen.
 */
router.get('/github', (req, res, next) => {
  if (!isOAuthConfigured) {
    return res.status(503).json({
      success: false,
      message:
        'GitHub OAuth is not configured. Please supply GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env, or enable DEMO_MODE=true for testing. See README.md for details.',
      errors: ['OAuth credentials missing']
    });
  }

  // Passport initiates OAuth flow with CSRF state verification
  passport.authenticate('github', {
    scope: ['read:user'],
    state: true
  })(req, res, next);
});

/**
 * GET /auth/github/callback
 * GitHub redirects the user here with the temporary authorization code and state token.
 * Passport validates state, exchanges code for access token, fetches profile, and creates session.
 */
router.get(
  '/github/callback',
  (req, res, next) => {
    if (!isOAuthConfigured) {
      return res.status(503).json({
        success: false,
        message: 'GitHub OAuth is not configured on this server.',
        errors: ['Service Unavailable']
      });
    }

    passport.authenticate('github', {
      failureRedirect: '/?error=auth_failed'
    })(req, res, next);
  },
  (req, res) => {
    // Successful authentication -> redirect to private dashboard
    res.redirect('/dashboard.html');
  }
);

/**
 * POST /auth/logout
 * Destroys the active server session and purges the session cookie from the client browser.
 */
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    if (req.session) {
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          return next(destroyErr);
        }
        res.clearCookie('citypulse.sid', { path: '/' });
        return res.status(200).json({
          success: true,
          message: 'Session terminated. Logged out successfully.'
        });
      });
    } else {
      res.clearCookie('citypulse.sid', { path: '/' });
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
      });
    }
  });
});

/**
 * GET & POST /auth/demo-login
 * Development & Testing convenience route: logs in as a mock demo user when DEMO_MODE=true.
 * Strictly blocked when NODE_ENV=production.
 */
function handleDemoLogin(req, res, next) {
  if (!DEMO_MODE || NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Demo login is disabled on this server or in production mode.',
      errors: ['Forbidden']
    });
  }

  const demoUser = {
    id: 'demo-user-1001',
    username: 'octocat-demo',
    displayName: 'Demo Explorer',
    avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
    accessToken: 'demo_access_token_mock_server_only'
  };

  req.login(demoUser, (err) => {
    if (err) {
      return next(err);
    }

    // Prefer JSON response when requested via AJAX, API client, or POST request
    const wantsJson =
      req.xhr ||
      req.is('json') ||
      req.headers['accept']?.includes('application/json') ||
      (req.method === 'POST' && !req.headers['content-type']?.includes('application/x-www-form-urlencoded'));

    if (wantsJson) {
      // The access token must stay on the server and NEVER be sent to the browser
      return res.status(200).json({
        success: true,
        message: 'Demo login successful',
        data: {
          id: demoUser.id,
          username: demoUser.username,
          displayName: demoUser.displayName,
          avatarUrl: demoUser.avatarUrl
        }
      });
    }

    // Direct browser navigation link (e.g. clicking <a href="/auth/demo-login">) -> redirect to dashboard
    return res.redirect('/dashboard.html');
  });
}

router.get('/demo-login', handleDemoLogin);
router.post('/demo-login', handleDemoLogin);

module.exports = router;
