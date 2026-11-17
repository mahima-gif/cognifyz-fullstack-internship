/**
 * Verification script executing all curl/API examples from README against live server
 */

async function run() {
  const c = async (label, url, opt = {}) => {
    try {
      const res = await fetch(url, opt);
      console.log(`${label} -> HTTP ${res.status}`);
      return res;
    } catch (e) {
      console.error(`${label} -> ERROR: ${e.message}`);
    }
  };

  console.log('--- Testing README Endpoint Examples ---');
  await c('1. GET /api/tasks (list with query params)', 'http://localhost:3000/api/tasks?status=pending&priority=high&page=1&limit=5&sort=createdAt&order=desc');
  await c('2. GET /api/tasks/stats', 'http://localhost:3000/api/tasks/stats');

  const postRes = await c('3. POST /api/tasks (create valid)', 'http://localhost:3000/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Implement Redis Cache Layer',
      description: 'Add in-memory caching for high frequency stats queries.',
      status: 'pending',
      priority: 'high',
      dueDate: '2026-12-01T18:00:00.000Z'
    })
  });
  const postJson = await postRes.json();
  const createdId = postJson.data.id;

  await c('4. GET /api/tasks/:id (retrieve created)', `http://localhost:3000/api/tasks/${createdId}`);

  await c('5. PUT /api/tasks/:id (full replacement)', `http://localhost:3000/api/tasks/${createdId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Implement Redis Cache Layer - Revised',
      description: 'Updated with Redis Cluster failover details.',
      status: 'in-progress',
      priority: 'high',
      dueDate: '2026-12-05T18:00:00.000Z'
    })
  });

  await c('6. PATCH /api/tasks/:id (partial update)', `http://localhost:3000/api/tasks/${createdId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'completed'
    })
  });

  await c('7. DELETE /api/tasks/:id', `http://localhost:3000/api/tasks/${createdId}`, {
    method: 'DELETE'
  });

  await c('8. POST /api/tasks (Malformed JSON)', 'http://localhost:3000/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"title": "Broken JSON missing brace'
  });
}

run();

