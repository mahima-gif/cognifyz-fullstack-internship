const User = require('../models/User');
const Task = require('../models/Task');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all registered users with their task counts
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
const getAllUsers = asyncHandler(async (req, res) => {
  // Use aggregation to efficiently compute task counts per user
  const usersWithCounts = await User.aggregate([
    {
      $lookup: {
        from: 'tasks',
        localField: '_id',
        foreignField: 'owner',
        as: 'tasks',
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        role: 1,
        createdAt: 1,
        updatedAt: 1,
        taskCount: { $size: '$tasks' },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  res.status(200).json({
    success: true,
    message: 'Users retrieved successfully',
    data: {
      users: usersWithCounts,
      total: usersWithCounts.length,
    },
    errors: [],
  });
});

/**
 * @desc    Delete a user and cascade-delete all their tasks
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res, next) => {
  const targetUserId = req.params.id;

  /**
   * SECURITY NOTE: Self-deletion safeguard.
   * An administrator cannot delete their own active account,
   * preventing accidental self-lockout.
   */
  if (req.user._id.toString() === targetUserId) {
    return next(
      new AppError('Administrative action prohibited: You cannot delete your own account.', 400)
    );
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Cascade delete all tasks belonging to this user
  const deleteTasksResult = await Task.deleteMany({ owner: targetUserId });

  // Delete the user record
  await User.findByIdAndDelete(targetUserId);

  res.status(200).json({
    success: true,
    message: `User '${user.email}' and their ${deleteTasksResult.deletedCount} associated task(s) were deleted successfully.`,
    data: {
      deletedUserId: targetUserId,
      deletedTasksCount: deleteTasksResult.deletedCount,
    },
    errors: [],
  });
});

/**
 * @desc    Get all tasks across all users in the system (with owner details)
 * @route   GET /api/admin/tasks
 * @access  Private/Admin
 */
const getAllTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({})
    .sort({ createdAt: -1 })
    .populate('owner', 'name email role');

  res.status(200).json({
    success: true,
    message: 'All system tasks retrieved successfully',
    data: {
      tasks,
      total: tasks.length,
    },
    errors: [],
  });
});

module.exports = {
  getAllUsers,
  deleteUser,
  getAllTasks,
};
