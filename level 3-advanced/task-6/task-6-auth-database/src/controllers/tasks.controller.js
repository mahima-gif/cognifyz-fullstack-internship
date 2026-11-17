const Task = require('../models/Task');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Whitelist allowed task fields to protect against Mass Assignment attacks.
 * Under no circumstances can client modify 'owner' or other internal fields.
 */
const filterTaskFields = (body) => {
  const allowed = ['title', 'description', 'status', 'priority', 'dueDate'];
  const filtered = {};
  for (const field of allowed) {
    if (body[field] !== undefined) {
      filtered[field] = body[field];
    }
  }
  return filtered;
};

/**
 * @desc    Get all tasks for current authenticated user (with filtering, search, sort, pagination)
 * @route   GET /api/tasks
 * @access  Private
 */
const getTasks = asyncHandler(async (req, res) => {
  const { status, priority, search, sort = '-createdAt', page = 1, limit = 10 } = req.query;

  // Build query: regular users only see their own tasks
  const query = { owner: req.user._id };

  // Filter by status if provided
  if (status && ['pending', 'in-progress', 'completed'].includes(status)) {
    query.status = status;
  }

  // Filter by priority if provided
  if (priority && ['low', 'medium', 'high'].includes(priority)) {
    query.priority = priority;
  }

  // Search by title or description using case-insensitive regex
  if (search && search.trim() !== '') {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { title: { $regex: escapedSearch, $options: 'i' } },
      { description: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  // Pagination calculation
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (parsedPage - 1) * parsedLimit;

  // Execute query with pagination and sorting
  const [tasks, total] = await Promise.all([
    Task.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parsedLimit)
      .populate('owner', 'name email'),
    Task.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / parsedLimit) || 1;

  res.status(200).json({
    success: true,
    message: 'Tasks retrieved successfully',
    data: {
      tasks,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages,
      },
    },
    errors: [],
  });
});

/**
 * @desc    Get aggregate statistics of tasks for the authenticated user
 * @route   GET /api/tasks/stats
 * @access  Private
 */
const getTaskStats = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;

  const [total, pending, inProgress, completed, low, medium, high] = await Promise.all([
    Task.countDocuments({ owner: ownerId }),
    Task.countDocuments({ owner: ownerId, status: 'pending' }),
    Task.countDocuments({ owner: ownerId, status: 'in-progress' }),
    Task.countDocuments({ owner: ownerId, status: 'completed' }),
    Task.countDocuments({ owner: ownerId, priority: 'low' }),
    Task.countDocuments({ owner: ownerId, priority: 'medium' }),
    Task.countDocuments({ owner: ownerId, priority: 'high' }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Task statistics retrieved successfully',
    data: {
      stats: {
        total,
        byStatus: {
          pending,
          'in-progress': inProgress,
          completed,
        },
        byPriority: {
          low,
          medium,
          high,
        },
      },
    },
    errors: [],
  });
});

/**
 * @desc    Get a single task by ID
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTaskById = asyncHandler(async (req, res, next) => {
  // Authorization check: Admins can view any task; normal users can only query their own
  const filter = { _id: req.params.id };
  if (req.user.role !== 'admin') {
    filter.owner = req.user._id;
  }

  const task = await Task.findOne(filter).populate('owner', 'name email');

  /**
   * SECURITY NOTE: Information Disclosure Prevention.
   * If a user requests a task that exists but belongs to another user,
   * we return 404 (Not Found) rather than 403 (Forbidden).
   * Returning 403 would reveal that the resource ID exists in the database.
   */
  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Task retrieved successfully',
    data: { task },
    errors: [],
  });
});

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private
 */
const createTask = asyncHandler(async (req, res, next) => {
  // Prevent mass-assignment: only extract whitelisted fields
  const safeData = filterTaskFields(req.body);

  if (!safeData.title || safeData.title.trim() === '') {
    return next(new AppError('Task title is required', 400));
  }

  /**
   * SECURITY NOTE: Ownership is immutably tied to the authenticated user's ID
   * from req.user._id (derived securely from the verified JWT), ignoring any
   * 'owner' field the client might attempt to supply in req.body.
   */
  const newTask = await Task.create({
    ...safeData,
    owner: req.user._id,
  });

  const populatedTask = await Task.findById(newTask._id).populate('owner', 'name email');

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: { task: populatedTask },
    errors: [],
  });
});

/**
 * @desc    Update a task (full or partial update)
 * @route   PUT /api/tasks/:id, PATCH /api/tasks/:id
 * @access  Private
 */
const updateTask = asyncHandler(async (req, res, next) => {
  const filter = { _id: req.params.id };
  if (req.user.role !== 'admin') {
    filter.owner = req.user._id;
  }

  // Prevent mass assignment
  const safeData = filterTaskFields(req.body);

  const updatedTask = await Task.findOneAndUpdate(
    filter,
    { $set: safeData },
    { new: true, runValidators: true }
  ).populate('owner', 'name email');

  if (!updatedTask) {
    return next(new AppError('Task not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Task updated successfully',
    data: { task: updatedTask },
    errors: [],
  });
});

/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
const deleteTask = asyncHandler(async (req, res, next) => {
  const filter = { _id: req.params.id };
  if (req.user.role !== 'admin') {
    filter.owner = req.user._id;
  }

  const deletedTask = await Task.findOneAndDelete(filter);

  if (!deletedTask) {
    return next(new AppError('Task not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Task deleted successfully',
    data: null,
    errors: [],
  });
});

module.exports = {
  getTasks,
  getTaskStats,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
