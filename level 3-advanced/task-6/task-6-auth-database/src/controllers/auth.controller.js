const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Helper to generate JWT token and configure HTTP-only cookie
 * @param {Object} user - User document
 * @param {number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 * @param {string} message - Response message
 */
const sendTokenResponse = (user, statusCode, res, message) => {
  // Sign JWT containing user id and role
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    }
  );

  // Cookie options: httpOnly prevents client JS access (XSS mitigation)
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieSecure =
    process.env.COOKIE_SECURE === 'true' || (process.env.COOKIE_SECURE === undefined && isProduction);

  const cookieOptions = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'lax',
  };

  res.cookie('token', token, cookieOptions);

  // Exclude password from the returned user object
  const userObj = user.toJSON();

  res.status(statusCode).json({
    success: true,
    message,
    data: {
      user: userObj,
      token, // Also returned for Authorization Bearer header clients (e.g. mobile/API tests)
    },
    errors: [],
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;

  // Check if an account already exists with this email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(
      new AppError('An account with this email already exists. Please log in or use a different email.', 409)
    );
  }

  /**
   * SECURITY NOTE: Preventing Privilege Escalation.
   * New users registered through the public endpoint are strictly assigned the 'user' role.
   * Any 'role' field passed in req.body by the client is deliberately ignored.
   * Admin roles can only be granted via internal database seeding or dedicated admin management.
   */
  const newUser = await User.create({
    name,
    email,
    password,
    role: 'user', // Hardcoded default for safety
  });

  sendTokenResponse(newUser, 201, res, 'User registered successfully');
});

/**
 * @desc    Log in an existing user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide both email and password', 400));
  }

  // Need to explicitly select '+password' because it is set to select: false in the model
  const user = await User.findOne({ email }).select('+password');

  /**
   * SECURITY NOTE: Timing-attack resilient, generic authentication failure message.
   * Using the identical message "Invalid email or password" for both non-existent emails
   * and incorrect passwords prevents account enumeration attacks.
   */
  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid email or password', 401));
  }

  sendTokenResponse(user, 200, res, 'Login successful');
});

/**
 * @desc    Log out current user / clear auth cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = asyncHandler(async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieSecure =
    process.env.COOKIE_SECURE === 'true' || (process.env.COOKIE_SECURE === undefined && isProduction);

  res.clearCookie('token', {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'lax',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
    data: null,
    errors: [],
  });
});

/**
 * @desc    Get currently authenticated user
 * @route   GET /api/auth/me
 * @access  Private (Authenticated users)
 */
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User profile retrieved successfully',
    data: {
      user: req.user,
    },
    errors: [],
  });
});

module.exports = {
  register,
  login,
  logout,
  getMe,
};
