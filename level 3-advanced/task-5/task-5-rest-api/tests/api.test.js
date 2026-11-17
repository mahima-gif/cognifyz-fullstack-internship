/**
 * Automated API Test Suite
 * 
 * Tests all TaskFlow REST API endpoints using Node.js built-in test runner (node:test)
 * and assert module (node:assert). Spawns the Express server on an ephemeral port.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../server');

describe('TaskFlow REST API Test Suite', () => {
  let server;
  let baseUrl;
  let createdTaskId = null;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await new Promise((resolve) => {
      // Explicitly bind to 127.0.0.1 on ephemeral port (0)
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}/api/tasks`;
        console.log(`[Test Server] Running on ${baseUrl}`);
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('1. GET /api/tasks - list tasks with default pagination', async () => {
    const res = await fetch(`${baseUrl}`);
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data.tasks));
    assert.ok(json.data.pagination);
    assert.ok(typeof json.data.pagination.total === 'number');
    assert.strictEqual(json.data.pagination.page, 1);
  });

  test('2. GET /api/tasks - filter by status and priority', async () => {
    const res = await fetch(`${baseUrl}?status=pending&priority=high`);
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    json.data.tasks.forEach(t => {
      assert.strictEqual(t.status, 'pending');
      assert.strictEqual(t.priority, 'high');
    });
  });

  test('3. GET /api/tasks - case-insensitive search in title or description', async () => {
    const res = await fetch(`${baseUrl}?search=schema`);
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.tasks.length > 0);
    const match = json.data.tasks[0];
    const inTitle = match.title.toLowerCase().includes('schema');
    const inDesc = (match.description || '').toLowerCase().includes('schema');
    assert.ok(inTitle || inDesc);
  });

  test('4. GET /api/tasks - sort and order (order=asc by title)', async () => {
    const res = await fetch(`${baseUrl}?sort=title&order=asc&limit=10`);
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    const titles = json.data.tasks.map(t => t.title.toLowerCase());
    const sortedTitles = [...titles].sort((a, b) => a.localeCompare(b));
    assert.deepStrictEqual(titles, sortedTitles);
  });

  test('5. GET /api/tasks - pagination limits and pages', async () => {
    const res = await fetch(`${baseUrl}?page=1&limit=2`);
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.tasks.length <= 2);
    assert.strictEqual(json.data.pagination.limit, 2);
    assert.strictEqual(json.data.pagination.page, 1);
  });

  test('6. GET /api/tasks/stats - retrieve task metric counters', async () => {
    const res = await fetch(`${baseUrl}/stats`);
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(typeof json.data.total === 'number');
    assert.ok(typeof json.data.pending === 'number');
    assert.ok(typeof json.data['in-progress'] === 'number');
    assert.ok(typeof json.data.completed === 'number');
    assert.ok(typeof json.data.overdue === 'number');
  });

  test('7. POST /api/tasks - create valid task (201 Created and Location header)', async () => {
    const newTask = {
      title: 'Automated Test Created Task',
      description: 'Created by node:test suite to verify POST endpoint',
      status: 'pending',
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000).toISOString()
    };

    const res = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask)
    });

    assert.strictEqual(res.status, 201);
    const locationHeader = res.headers.get('location');
    assert.ok(locationHeader && locationHeader.startsWith('/api/tasks/'));

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.title, newTask.title);
    assert.strictEqual(json.data.status, newTask.status);
    assert.strictEqual(json.data.priority, newTask.priority);
    assert.ok(json.data.id);
    assert.ok(json.data.createdAt);
    assert.ok(json.data.updatedAt);

    createdTaskId = json.data.id;
  });

  test('8. POST /api/tasks - validation failure (missing title and invalid priority)', async () => {
    const badTask = {
      title: 'No', // Too short (must be >= 3 chars)
      priority: 'urgent' // Invalid priority
    };

    const res = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(badTask)
    });

    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.data, null);
    assert.ok(Array.isArray(json.errors));
    assert.ok(json.errors.some(e => e.field === 'title'));
    assert.ok(json.errors.some(e => e.field === 'priority'));
  });

  test('9. GET /api/tasks/:id - retrieve created task by UUID', async () => {
    assert.ok(createdTaskId, 'createdTaskId should be present');
    const res = await fetch(`${baseUrl}/${createdTaskId}`);
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.id, createdTaskId);
    assert.strictEqual(json.data.title, 'Automated Test Created Task');
  });

  test('10. PUT /api/tasks/:id - full replacement update', async () => {
    assert.ok(createdTaskId, 'createdTaskId should be present');
    const replacement = {
      title: 'Automated Test Fully Replaced Task',
      description: 'Replaced description via PUT',
      status: 'in-progress',
      priority: 'medium',
      dueDate: null
    };

    const res = await fetch(`${baseUrl}/${createdTaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(replacement)
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.id, createdTaskId);
    assert.strictEqual(json.data.title, replacement.title);
    assert.strictEqual(json.data.status, 'in-progress');
    assert.strictEqual(json.data.priority, 'medium');
  });

  test('11. PATCH /api/tasks/:id - partial update (status toggle)', async () => {
    assert.ok(createdTaskId, 'createdTaskId should be present');
    const patchPayload = {
      status: 'completed'
    };

    const res = await fetch(`${baseUrl}/${createdTaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchPayload)
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.id, createdTaskId);
    assert.strictEqual(json.data.status, 'completed');
    assert.strictEqual(json.data.title, 'Automated Test Fully Replaced Task');
  });

  test('12. DELETE /api/tasks/:id - delete task', async () => {
    assert.ok(createdTaskId, 'createdTaskId should be present');
    const res = await fetch(`${baseUrl}/${createdTaskId}`, {
      method: 'DELETE'
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data, null);

    // Verify task is now gone
    const verifyRes = await fetch(`${baseUrl}/${createdTaskId}`);
    assert.strictEqual(verifyRes.status, 404);
  });

  test('13. GET /api/tasks/:id - 404 for missing UUID', async () => {
    const nonExistentId = '99999999-9999-4999-8999-999999999999';
    const res = await fetch(`${baseUrl}/${nonExistentId}`);
    assert.strictEqual(res.status, 404);

    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.data, null);
    assert.ok(json.message.includes('not found'));
  });

  test('14. GET /api/tasks/:id - 400 for invalid UUID format', async () => {
    const res = await fetch(`${baseUrl}/not-a-valid-uuid-1234`);
    assert.strictEqual(res.status, 400);

    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.ok(json.errors.some(e => e.field === 'id'));
  });

  test('15. POST /api/tasks - 400 for malformed JSON payload', async () => {
    const res = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"title": "Broken JSON, missing closing brace'
    });

    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.ok(json.message.includes('Malformed JSON'));
  });
});
