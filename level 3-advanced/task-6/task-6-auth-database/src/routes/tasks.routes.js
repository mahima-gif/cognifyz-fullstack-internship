const express = require('express');
const { body } = require('express-validator');
const tasksController = require('../controllers/tasks.controller');
const { verifyToken } = require('../middleware/auth');
const { validate, validateObjectId } = require('../middleware/validate');

const router = express.Router();

// All task routes require authentication
router.use(verifyToken);

/**
 * Validation rules for creating a task
 */
const createTaskValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters long'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed'])
    .withMessage('Status must be pending, in-progress, or completed'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('dueDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date format'),
  validate,
];

/**
 * Validation rules for updating a task
 */
const updateTaskValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters long'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed'])
    .withMessage('Status must be pending, in-progress, or completed'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('dueDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date format'),
  validate,
];

// Collection-level routes
router.get('/', tasksController.getTasks);
router.post('/', createTaskValidation, tasksController.createTask);

/**
 * IMPORTANT ROUTING NOTE:
 * Express matches routes in the exact order they are registered.
 * We MUST define `/stats` BEFORE `/:id`.
 * If `/:id` were declared first, Express would treat the literal string 'stats'
 * as a route parameter `:id` and execute `getTaskById('stats')`, triggering
 * an invalid ObjectId cast error instead of our statistics aggregator.
 */
router.get('/stats', tasksController.getTaskStats);

// Item-level routes with ObjectId validation
router.get('/:id', validateObjectId('id'), tasksController.getTaskById);
router.put('/:id', validateObjectId('id'), updateTaskValidation, tasksController.updateTask);
router.patch('/:id', validateObjectId('id'), updateTaskValidation, tasksController.updateTask);
router.delete('/:id', validateObjectId('id'), tasksController.deleteTask);

module.exports = router;
