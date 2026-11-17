/**
 * User & Session Controller.
 * Handles current user identity, session-based search history, and public app configuration.
 */

const { DEMO_MODE, isOAuthConfigured } = require('../config/env');

/**
 * GET /api/me
 * Returns profile details for currently authenticated user.
 */
function getCurrentUser(req, res) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated',
      errors: ['Unauthorized']
    });
  }

  res.status(200).json({
    success: true,
    data: {
      id: req.user.id,
      username: req.user.username,
      displayName: req.user.displayName || req.user.username,
      avatarUrl: req.user.avatarUrl || ''
    }
  });
}

/**
 * GET /api/search-history
 * Returns the last 10 search queries performed during the active session.
 */
function getSearchHistory(req, res) {
  const history = req.session?.searchHistory || [];
  res.status(200).json({
    success: true,
    data: history
  });
}

/**
 * GET /api/config
 * Public endpoint informing the frontend of OAuth status and Demo Mode availability.
 */
function getClientConfig(req, res) {
  res.status(200).json({
    success: true,
    data: {
      demoMode: DEMO_MODE,
      isOAuthConfigured
    }
  });
}

module.exports = {
  getCurrentUser,
  getSearchHistory,
  getClientConfig
};
