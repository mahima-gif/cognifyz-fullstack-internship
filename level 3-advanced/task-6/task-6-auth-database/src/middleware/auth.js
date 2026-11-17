const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * verifyToken Middleware
 * Authenticates incoming requests by checking JWT token from either:
 * 1. HTTP-Only Cookie ('token')
 * 2. Authorization header ('Bearer <token>')
 *
 * Rejects with 401 Unauthorized if token is missing, invalid, expired,
 * or if the user account referenced in the token no longer exists.
 */
const verifyToken = asyncHandler(async (req, res, next) => {
  let token = null;

  // 1. Check HTTP-only cookie first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Alternatively check Authorization Bearer header
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Reject if no token was supplied
  if (!token) {
    return next(
      new AppError('Authentication required. Please log in to access this resource.', 401)
    );
  }

  // 3. Verify JWT signature and expiration
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again.', 401));
    }
    return next(new AppError('Invalid authentication token. Please log in again.', 401));
  }

  // 4. Ensure user still exists in database
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401)
    );
  }

  // Grant access: attach user to request object
  req.user = currentUser;
  next();
});

/**
 * requireRole Middleware
 * Role-Based Access Control (RBAC) authorization check.
 * Ensures the authenticated user possesses at least one of the specified roles.
 *
 * @param  {...string} roles - e.g. 'admin', 'user'
 * @returns {Function} Express middleware
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError('Access denied: You do not have permission to perform this action.', 403)
      );
    }
    next();
  };
};

module.exports = {
  verifyToken,
  requireRole,
};
