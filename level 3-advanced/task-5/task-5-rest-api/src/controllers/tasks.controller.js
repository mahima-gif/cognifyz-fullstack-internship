/**
 * Tasks Controller Layer
 * 
 * Handles incoming HTTP requests, invokes the Tasks Service,
 * and formats standardized RESTful JSON responses.
 */

const tasksService = require('../services/tasks.service');

/**
 * GET /api/tasks
 * Query params: status, priority, search, sort, order, page, limit
 */
async function getTasks(req, res, next) {
  try {
    const { status, priority, search, sort, order, page, limit } = req.query;
    const result = await tasksService.queryTasks({
      status,
      priority,
      search,
      sort,
      order,
      page,
      limit
    });

    res.status(200).json({
      success: true,
      data: {
        tasks: result.tasks,
        pagination: result.pagination
      },
      message: 'Tasks retrieved successfully.',
      errors: []
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tasks/stats
 * Aggregates task metrics: total, pending, in-progress, completed, overdue
 */
async function getTaskStats(req, res, next) {
  try {
    const stats = await tasksService.getTaskStats();
    res.status(200).json({
      success: true,
      data: stats,
      message: 'Task statistics retrieved successfully.',
      errors: []
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tasks/:id
 * Retrieve a single task by UUID
 */
async function getTaskById(req, res, next) {
  try {
    const task = await tasksService.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        data: null,
        message: `Task with ID ${req.params.id} was not found.`,
        errors: [
          {
            field: 'id',
            message: 'No task exists with the specified UUID.'
          }
        ]
      });
    }

    res.status(200).json({
      success: true,
      data: task,
      message: 'Task retrieved successfully.',
      errors: []
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/tasks
 * Create a new task resource
 */
async function createTask(req, res, next) {
  try {
    const task = await tasksService.createTask(req.body);
    // REST standard: return Location header referencing the created resource URI
    res.setHeader('Location', `/api/tasks/${task.id}`);
    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully.',
      errors: []
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/tasks/:id
 * Complete replacement of a task resource
 */
async function updateTask(req, res, next) {
  try {
    const updated = await tasksService.updateTask(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({
        success: false,
        data: null,
        message: `Task with ID ${req.params.id} was not found.`,
        errors: [
          {
            field: 'id',
            message: 'Cannot update non-existent task.'
          }
        ]
      });
    }

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Task updated (replaced) successfully.',
      errors: []
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/tasks/:id
 * Partial update of a task resource
 */
async function patchTask(req, res, next) {
  try {
    const patched = await tasksService.patchTask(req.params.id, req.body);
    if (!patched) {
      return res.status(404).json({
        success: false,
        data: null,
        message: `Task with ID ${req.params.id} was not found.`,
        errors: [
          {
            field: 'id',
            message: 'Cannot update non-existent task.'
          }
        ]
      });
    }

    res.status(200).json({
      success: true,
      data: patched,
      message: 'Task partially updated successfully.',
      errors: []
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/tasks/:id
 * Remove a task resource
 */
async function deleteTask(req, res, next) {
  try {
    const deleted = await tasksService.deleteTask(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        data: null,
        message: `Task with ID ${req.params.id} was not found.`,
        errors: [
          {
            field: 'id',
            message: 'Cannot delete non-existent task.'
          }
        ]
      });
    }

    res.status(200).json({
      success: true,
      data: null,
      message: 'Task deleted successfully.',
      errors: []
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTasks,
  getTaskStats,
  getTaskById,
  createTask,
  updateTask,
  patchTask,
  deleteTask
};

