const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

/**
 * Rate Limiting for Authentication Endpoints:
 * Protects against brute-force password guessing and credential stuffing attacks.
 * Limits each IP to 10 attempts per 15-minute window.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  skip: () => process.env.NODE_ENV === 'test', // Do not throttle test suites
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    data: null,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    errors: [],
  },
});

/**
 * Validation Rules for Registration
 */
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters long'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
  validate,
];

/**
 * Validation Rules for Login
 */
const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate,
];

// Public Auth Routes (Rate Limited)
router.post('/register', authLimiter, registerValidation, authController.register);
router.post('/login', authLimiter, loginValidation, authController.login);
router.post('/logout', authController.logout);

// Protected Auth Route
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
