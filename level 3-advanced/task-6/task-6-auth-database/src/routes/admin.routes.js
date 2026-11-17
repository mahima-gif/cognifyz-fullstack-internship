const express = require('express');
const adminController = require('../controllers/admin.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validate');

const router = express.Router();

// Enforce both authentication AND admin role authorization across all admin routes
router.use(verifyToken, requireRole('admin'));

// Manage Users
router.get('/users', adminController.getAllUsers);
router.delete('/users/:id', validateObjectId('id'), adminController.deleteUser);

// Manage All Tasks across the system
router.get('/tasks', adminController.getAllTasks);

module.exports = router;
