const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const fs = require('fs');
const app = require('../app');
const { logFile } = require('../src/middleware/requestLogger');

process.env.NODE_ENV = 'test';

describe('Step 1: Middleware Pipeline Verification', () => {
  it('should generate and return X-Request-Id and X-Response-Time headers', async () => {
    const res = await request(app).get('/api/health');

    assert.equal(res.status, 200);
    assert.ok(res.headers['x-request-id'], 'Expected X-Request-Id header to be present');
    assert.match(
      res.headers['x-request-id'],
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      'Expected valid UUID v4 format'
    );

    assert.ok(res.headers['x-response-time'], 'Expected X-Response-Time header to be present');
    assert.match(
      res.headers['x-response-time'],
      /^[0-9.]+ms$/,
      'Expected response time formatted with "ms"'
    );
  });

  it('should preserve and reuse incoming valid X-Request-Id', async () => {
    const customTraceId = '123e4567-e89b-12d3-a456-426614174000';
    const res = await request(app)
      .get('/api/health')
      .set('X-Request-Id', customTraceId);

    assert.equal(res.status, 200);
    assert.equal(res.headers['x-request-id'], customTraceId);
  });

  it('should log request to access.log without bodies, cookies, or secrets', async () => {
    const secretQuery = '/api/health?token=supersecret123&regularParam=allowed';
    await request(app)
      .get(secretQuery)
      .set('Cookie', 'session_id=confidential_cookie_value')
      .set('Authorization', 'Bearer secret-jwt-token')
      .send({ confidentialBodyField: 'must-not-be-logged' });

    // Allow I/O stream flush
    await new Promise((r) => setTimeout(r, 100));

    assert.ok(fs.existsSync(logFile), 'access.log file should exist');
    const logContent = fs.readFileSync(logFile, 'utf8');

    // Confirm that the log entry exists with sanitized query
    assert.ok(
      logContent.includes('[REDACTED]') || logContent.includes('/api/health'),
      'Log should contain the sanitized request line'
    );

    // Confirm sensitive data is NEVER logged
    assert.ok(!logContent.includes('supersecret123'), 'Secret query parameters must be redacted');
    assert.ok(!logContent.includes('confidential_cookie_value'), 'Cookies must never be logged');
    assert.ok(!logContent.includes('secret-jwt-token'), 'Authorization headers must never be logged');
    assert.ok(!logContent.includes('confidentialBodyField'), 'Request bodies must never be logged');
  });

  it('should cleanly handle malformed JSON payloads with HTTP 400', async () => {
    const res = await request(app)
      .post('/api/jobs/email')
      .set('Content-Type', 'application/json')
      .send('{"name": "Malformed", "email": bad_json_syntax}');

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('Malformed JSON'));
    assert.ok(res.headers['x-request-id'], 'Error response must contain request ID header');
    assert.equal(res.body.requestId, res.headers['x-request-id']);
  });

  it('should reject payloads exceeding 10kb limit with HTTP 413', async () => {
    const massiveString = 'a'.repeat(15 * 1024); // 15kb payload
    const res = await request(app)
      .post('/api/jobs/email')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ name: 'Oversized', payload: massiveString }));

    assert.equal(res.status, 413);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('Payload too large'));
    assert.equal(res.body.requestId, res.headers['x-request-id']);
  });

  it('should return consistent JSON 400 for input validation failures', async () => {
    const res = await request(app)
      .post('/api/jobs/email')
      .set('Content-Type', 'application/json')
      .send({ name: '', email: 'not-an-email' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(Array.isArray(res.body.errors));
    assert.ok(res.body.errors.length >= 2, 'Should report field errors for both name and email');
  });

  it('should return standardized JSON 404 for nonexistent routes', async () => {
    const res = await request(app).get('/api/nonexistent-route-xyz');

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('Route not found'));
    assert.equal(res.body.requestId, res.headers['x-request-id']);
  });
});
