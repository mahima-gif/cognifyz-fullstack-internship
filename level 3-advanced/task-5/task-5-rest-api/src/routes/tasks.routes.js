/**
 * Tasks Router
 * 
 * Maps HTTP verbs and URI paths to controller actions and validation middlewares.
 */

const express = require('express');
const router = express.Router();

const tasksController = require('../controllers/tasks.controller');
const {
  validateTaskId,
  validateTaskCreate,
  validateTaskReplace,
  validateTaskPatch
} = require('../middleware/validateTask');

// Collection routes
router.get('/', tasksController.getTasks);
router.post('/', validateTaskCreate, tasksController.createTask);

/**
 * ROUTE ORDER EXPLANATION:
 * 
 * Why /stats MUST be defined BEFORE /:id:
 * Express matches routes sequentially in the order they are registered.
 * If router.get('/:id') were defined before router.get('/stats'), Express would treat
 * the literal string 'stats' as an :id parameter value (id = 'stats').
 * The request would then hit validateTaskId (failing with 400 Bad Request because 'stats'
 * is not a UUID) or hit getTaskById instead of getTaskStats.
 * 
 * By declaring static / specific sub-paths like '/stats' before dynamic parameterized
 * routes like '/:id', Express properly evaluates the exact match first.
 */
router.get('/stats', tasksController.getTaskStats);

// Item routes (parameterized by :id)
router.get('/:id', validateTaskId, tasksController.getTaskById);
router.put('/:id', validateTaskId, validateTaskReplace, tasksController.updateTask);
router.patch('/:id', validateTaskId, validateTaskPatch, tasksController.patchTask);
router.delete('/:id', validateTaskId, tasksController.deleteTask);

module.exports = router;

