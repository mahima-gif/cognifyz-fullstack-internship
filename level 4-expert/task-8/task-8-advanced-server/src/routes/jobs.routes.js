const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const {
  enqueueEmailJob,
  enqueueReportJob,
  getJobStatus,
  listRecentJobs,
} = require('../controllers/jobs.controller');

const router = express.Router();

// Email Job validation schema
const emailValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required and cannot be blank'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('A valid email address is required'),
];

// Report Job validation schema
const reportValidation = [
  body('type')
    .isIn(['sales', 'users'])
    .withMessage('Report type must be either "sales" or "users"'),
  body('rows')
    .isInt({ min: 100, max: 5000 })
    .withMessage('Rows must be an integer between 100 and 5000'),
];

// Routes
router.post('/email', validate(emailValidation), enqueueEmailJob);
router.post('/report', validate(reportValidation), enqueueReportJob);
router.get('/', listRecentJobs);
router.get('/:id', getJobStatus);

module.exports = router;
