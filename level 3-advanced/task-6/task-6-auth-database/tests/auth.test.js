const path = require('path');
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');

// Configure MongoMemoryServer download directory inside workspace to avoid sandbox EPERM
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(__dirname, '..', '.cache', 'mongodb-binaries');

const { MongoMemoryServer } = require('mongodb-memory-server');

// Set test environment variables before importing app
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'super_test_secret_key_minimum_32_characters_long_12345';
process.env.JWT_EXPIRES_IN = '1h';
process.env.COOKIE_SECURE = 'false';

const app = require('../app');
const User = require('../src/models/User');

let mongoServer;

describe('Authentication API Tests (/api/auth)', () => {
  before(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear users collection before each test
    await User.deleteMany({});
  });

  test('1. POST /register - Successfully registers user and hashes password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Johnson',
        email: 'alice@example.com',
        password: 'Password123!',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.name, 'Alice Johnson');
    assert.equal(res.body.data.user.email, 'alice@example.com');
    assert.equal(res.body.data.user.role, 'user');
    assert.ok(res.body.data.token, 'JWT token should be returned');

    // Verify password hash is NEVER present in response
    assert.equal(res.body.data.user.password, undefined);
    assert.equal(JSON.stringify(res.body).includes('Password123!'), false);

    // Verify cookie was set
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies, 'set-cookie header must be present');
    assert.ok(cookies.some((c) => c.includes('token=')), 'token cookie should be set');

    // Verify database record has hashed password (cost 12)
    const userInDb = await User.findOne({ email: 'alice@example.com' }).select('+password');
    assert.ok(userInDb, 'User must exist in DB');
    assert.notEqual(userInDb.password, 'Password123!');
    assert.ok(userInDb.password.startsWith('$2'), 'Password must be a bcrypt hash');
  });

  test('2. POST /register - Rejects duplicate email with 409 Conflict', async () => {
    await User.create({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: 'Password123!',
      role: 'user',
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Duplicate',
        email: 'alice@example.com',
        password: 'AnotherPassword123!',
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('already exists'));
  });

  test('3. POST /register - Rejects weak password with 400 Bad Request', async () => {
    // Password with only numbers, under 8 chars
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Weak User',
        email: 'weak@example.com',
        password: '12345',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.length > 0);
  });

  test('4. POST /register - Ignores client-supplied role "admin" (Privilege Escalation Protection)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Malicious Attacker',
        email: 'attacker@example.com',
        password: 'Password123!',
        role: 'admin', // Attempted mass-assignment privilege escalation
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, 'user', 'Role must default to user, ignoring client payload');

    const userInDb = await User.findOne({ email: 'attacker@example.com' });
    assert.equal(userInDb.role, 'user');
  });

  test('5. POST /login - Successfully logs in with correct credentials', async () => {
    await User.create({
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: 'Password123!',
      role: 'user',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'bob@example.com',
        password: 'Password123!',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, 'bob@example.com');
    assert.equal(res.body.data.user.password, undefined);

    const cookies = res.headers['set-cookie'];
    assert.ok(cookies.some((c) => c.includes('token=')));
  });

  test('6. POST /login - Fails with generic message for non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'Password123!',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Invalid email or password');
  });

  test('7. POST /login - Fails with identical generic message for wrong password', async () => {
    await User.create({
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: 'Password123!',
      role: 'user',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'bob@example.com',
        password: 'WrongPassword999!',
      });

    assert.equal(res.status, 401);
    // User enumeration protection: identical message to non-existent email
    assert.equal(res.body.message, 'Invalid email or password');
  });

  test('8. GET /api/auth/me - Succeeds with Authorization Bearer header', async () => {
    const user = await User.create({
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      password: 'Password123!',
      role: 'user',
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'charlie@example.com', password: 'Password123!' });

    const token = loginRes.body.data.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.data.user.email, 'charlie@example.com');
    assert.equal(meRes.body.data.user.password, undefined);
  });

  test('9. GET /api/auth/me - Succeeds with HTTP-only cookie', async () => {
    await User.create({
      name: 'Diana Prince',
      email: 'diana@example.com',
      password: 'Password123!',
      role: 'user',
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'diana@example.com', password: 'Password123!' });

    const cookies = loginRes.headers['set-cookie'];

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies);

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.data.user.email, 'diana@example.com');
  });

  test('10. GET /api/auth/me - Rejects with 401 when no token is provided', async () => {
    const res = await request(app).get('/api/auth/me');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('11. GET /api/auth/me - Rejects with 401 on malformed/invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.tampered.token');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('12. NoSQL Injection protection - Sanitizes query operators like {"$gt": ""}', async () => {
    await User.create({
      name: 'Safe User',
      email: 'safe@example.com',
      password: 'Password123!',
      role: 'user',
    });

    // Attempt NoSQL injection in login payload
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: { $gt: '' }, // Query operator injection attempt
        password: 'Password123!',
      });

    // Sanitizer removes $gt key, so email becomes empty/invalid and validator rejects with 400
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });
});
