const path = require('path');
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Configure MongoMemoryServer download directory inside workspace to avoid sandbox EPERM
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(__dirname, '..', '.cache', 'mongodb-binaries');

const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'super_test_secret_key_minimum_32_characters_long_12345';
process.env.JWT_EXPIRES_IN = '1h';
process.env.COOKIE_SECURE = 'false';

const app = require('../app');
const User = require('../src/models/User');
const Task = require('../src/models/Task');

let mongoServer;
let userAToken, userAId;
let userBToken, userBId;
let adminToken, adminId;

describe('Tasks & Authorization API Tests (/api/tasks & /api/admin)', () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Task.deleteMany({});

    // 1. Create User A
    const userA = await User.create({
      name: 'User Alpha',
      email: 'user.a@example.com',
      password: 'Password123!',
      role: 'user',
    });
    userAId = userA._id.toString();
    userAToken = jwt.sign({ id: userA._id, role: userA.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 2. Create User B
    const userB = await User.create({
      name: 'User Beta',
      email: 'user.b@example.com',
      password: 'Password123!',
      role: 'user',
    });
    userBId = userB._id.toString();
    userBToken = jwt.sign({ id: userB._id, role: userB.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 3. Create Admin
    const admin = await User.create({
      name: 'Admin Boss',
      email: 'admin.boss@example.com',
      password: 'Password123!',
      role: 'admin',
    });
    adminId = admin._id.toString();
    adminToken = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  test('1. POST /api/tasks - Creates a task for User A; prevents owner mass-assignment', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Alpha Task 1',
        description: 'First task for Alpha',
        priority: 'high',
        status: 'pending',
        owner: userBId, // Attempted mass assignment: should be ignored!
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.task.title, 'Alpha Task 1');
    assert.equal(res.body.data.task.owner._id, userAId, 'Task owner must remain User A');

    const taskInDb = await Task.findById(res.body.data.task._id);
    assert.equal(taskInDb.owner.toString(), userAId);
  });

  test('2. GET /api/tasks - Retrieves only the authenticated user tasks with pagination', async () => {
    // Create 2 tasks for User A, 1 task for User B
    await Task.create([
      { title: 'Alpha Task 1', owner: userAId },
      { title: 'Alpha Task 2', owner: userAId },
      { title: 'Beta Task 1', owner: userBId },
    ]);

    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.tasks.length, 2);
    assert.equal(res.body.data.pagination.total, 2);
    assert.ok(res.body.data.tasks.every((t) => t.owner._id === userAId));
  });

  test('3. GET /api/tasks/stats - Aggregates task counts by status and priority', async () => {
    await Task.create([
      { title: 'Task Alpha 1', status: 'pending', priority: 'low', owner: userAId },
      { title: 'Task Alpha 2', status: 'in-progress', priority: 'medium', owner: userAId },
      { title: 'Task Alpha 3', status: 'completed', priority: 'high', owner: userAId },
      { title: 'Task Beta 1', status: 'completed', priority: 'high', owner: userBId },
    ]);

    const res = await request(app)
      .get('/api/tasks/stats')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.equal(res.status, 200);
    const { stats } = res.body.data;
    assert.equal(stats.total, 3);
    assert.equal(stats.byStatus.pending, 1);
    assert.equal(stats.byStatus['in-progress'], 1);
    assert.equal(stats.byStatus.completed, 1);
    assert.equal(stats.byPriority.low, 1);
    assert.equal(stats.byPriority.medium, 1);
    assert.equal(stats.byPriority.high, 1);
  });

  test('4. GET /api/tasks/:id - User A can read their own task; User B receives 404 (Information Disclosure Protection)', async () => {
    const taskA = await Task.create({
      title: 'Alpha Private Task',
      owner: userAId,
    });

    // User A accesses their own task -> 200
    const resA = await request(app)
      .get(`/api/tasks/${taskA._id}`)
      .set('Authorization', `Bearer ${userAToken}`);

    assert.equal(resA.status, 200);
    assert.equal(resA.body.data.task.title, 'Alpha Private Task');

    // User B attempts to access User A's task -> MUST return 404, not 403
    const resB = await request(app)
      .get(`/api/tasks/${taskA._id}`)
      .set('Authorization', `Bearer ${userBToken}`);

    assert.equal(resB.status, 404);
    assert.equal(resB.body.message, 'Task not found');
  });

  test('5. PUT & PATCH /api/tasks/:id - User A can update; User B updating User A task receives 404', async () => {
    const taskA = await Task.create({
      title: 'Original Title',
      status: 'pending',
      owner: userAId,
    });

    // User B tries to update User A's task -> 404
    const resB = await request(app)
      .put(`/api/tasks/${taskA._id}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ title: 'Hacked Title' });

    assert.equal(resB.status, 404);

    // User A updates their own task -> 200
    const resA = await request(app)
      .put(`/api/tasks/${taskA._id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Updated Title', status: 'completed' });

    assert.equal(resA.status, 200);
    assert.equal(resA.body.data.task.title, 'Updated Title');
    assert.equal(resA.body.data.task.status, 'completed');
  });

  test('6. DELETE /api/tasks/:id - User A can delete; User B deleting User A task receives 404', async () => {
    const taskA = await Task.create({
      title: 'To Be Deleted',
      owner: userAId,
    });

    // User B tries to delete User A's task -> 404
    const resB = await request(app)
      .delete(`/api/tasks/${taskA._id}`)
      .set('Authorization', `Bearer ${userBToken}`);

    assert.equal(resB.status, 404);

    // Verify task is still in DB
    const stillExists = await Task.findById(taskA._id);
    assert.ok(stillExists);

    // User A deletes their own task -> 200
    const resA = await request(app)
      .delete(`/api/tasks/${taskA._id}`)
      .set('Authorization', `Bearer ${userAToken}`);

    assert.equal(resA.status, 200);

    // Verify task is deleted
    const deleted = await Task.findById(taskA._id);
    assert.equal(deleted, null);
  });

  test('7. Malformed ObjectId handling - Returns 400 Bad Request instead of 500 CastError', async () => {
    const res = await request(app)
      .get('/api/tasks/not-a-valid-object-id')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('Invalid id format'));
  });

  test('8. Authorization / RBAC - Normal user calling admin routes receives 403 Forbidden', async () => {
    const resUsers = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.equal(resUsers.status, 403);
    assert.equal(resUsers.body.success, false);
    assert.ok(resUsers.body.message.includes('Access denied'));

    const resTasks = await request(app)
      .get('/api/admin/tasks')
      .set('Authorization', `Bearer ${userAToken}`);

    assert.equal(resTasks.status, 403);
  });

  test('9. Admin access - Admin calling admin routes receives 200 OK', async () => {
    await Task.create([
      { title: 'Alpha Task', owner: userAId },
      { title: 'Beta Task', owner: userBId },
    ]);

    const resUsers = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(resUsers.status, 200);
    assert.equal(resUsers.body.data.users.length, 3); // User A, User B, Admin

    // Verify each user has taskCount
    const userAEntry = resUsers.body.data.users.find((u) => u._id.toString() === userAId);
    assert.equal(userAEntry.taskCount, 1);

    const resTasks = await request(app)
      .get('/api/admin/tasks')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(resTasks.status, 200);
    assert.equal(resTasks.body.data.tasks.length, 2);
  });

  test('10. Admin delete user - Cascades to delete all user tasks; prevents self-deletion', async () => {
    // Create 2 tasks for User B
    await Task.create([
      { title: 'Beta Task 1', owner: userBId },
      { title: 'Beta Task 2', owner: userBId },
    ]);

    // Admin attempts to delete themselves -> 400
    const selfDeleteRes = await request(app)
      .delete(`/api/admin/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(selfDeleteRes.status, 400);
    assert.ok(selfDeleteRes.body.message.includes('cannot delete your own account'));

    // Admin deletes User B -> 200
    const deleteRes = await request(app)
      .delete(`/api/admin/users/${userBId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.data.deletedTasksCount, 2);

    // Verify User B is deleted
    const userBInDb = await User.findById(userBId);
    assert.equal(userBInDb, null);

    // Verify User B's tasks are cascaded and deleted
    const tasksRemaining = await Task.find({ owner: userBId });
    assert.equal(tasksRemaining.length, 0);
  });
});
