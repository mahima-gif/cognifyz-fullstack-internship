/**
 * Authentication Gatekeeper Middleware.
 * Ensures that incoming requests to protected routes possess an active, valid session.
 */
function requireAuth(req, res, next) {
  // Passport provides req.isAuthenticated()
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // Support direct req.user check if set by session or demo login
  if (req.user) {
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in with GitHub to access this resource.',
    errors: ['Unauthorized']
  });
}

module.exports = requireAuth;
