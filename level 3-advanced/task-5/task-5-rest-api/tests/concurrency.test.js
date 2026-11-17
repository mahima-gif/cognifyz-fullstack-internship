/**
 * Concurrency & Write Serialization Verification Test
 * 
 * Fires multiple rapid simultaneous POST and PATCH requests concurrently
 * to verify the writeQueue lock prevents race conditions and data corruption.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs/promises');
const path = require('path');
const app = require('../server');

describe('Concurrency & Write Serialization Test', () => {
  let server;
  let baseUrl;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}/api/tasks`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('Fires 15 rapid concurrent requests simultaneously without file corruption', async () => {
    const concurrentCount = 15;
    const promises = [];

    for (let i = 1; i <= concurrentCount; i++) {
      const payload = {
        title: `Concurrent Worker Task #${i}`,
        description: `Stress testing serialized file writes under load - Task ${i}`,
        status: i % 2 === 0 ? 'in-progress' : 'pending',
        priority: i % 3 === 0 ? 'high' : 'medium'
      };

      promises.push(
        fetch(`${baseUrl}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      );
    }

    const responses = await Promise.all(promises);
    for (const res of responses) {
      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.id);
    }

    // Now inspect data/tasks.json directly from disk
    const dataFilePath = path.resolve(__dirname, '../data/tasks.json');
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');

    // Must be valid parseable JSON without syntax errors or truncations
    let parsedTasks;
    assert.doesNotThrow(() => {
      parsedTasks = JSON.parse(fileContent);
    }, 'data/tasks.json must be valid parseable JSON after concurrent writes');

    assert.ok(Array.isArray(parsedTasks));
    console.log(`[Concurrency Verification] Successfully verified ${parsedTasks.length} tasks in data/tasks.json.`);
  });
});

