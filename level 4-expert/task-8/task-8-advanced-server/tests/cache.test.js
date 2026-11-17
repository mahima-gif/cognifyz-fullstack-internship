const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../app');
const cacheService = require('../src/services/cache');

process.env.NODE_ENV = 'test';
process.env.TEST_FAST_DELAY = 'true';

describe('Step 3: Server-Side Caching & Stampede Protection Verification', () => {
  before(async () => {
    await cacheService.clear();
  });

  after(async () => {
    await cacheService.close();
  });

  it('should return MISS on first call and HIT on second call with faster latency', async () => {
    const testUrl = `/api/products?testRun=${Date.now()}`;

    // 1. Initial Call: Cache Miss
    const t0 = performance.now();
    const res1 = await request(app).get(testUrl);
    const t1 = performance.now();
    const latency1 = t1 - t0;

    assert.equal(res1.status, 200);
    assert.equal(res1.headers['x-cache'], 'MISS', 'First request must be a cache MISS');
    assert.ok(res1.body.data.products.length > 0);

    // 2. Subsequent Call: Cache Hit
    const t2 = performance.now();
    const res2 = await request(app).get(testUrl);
    const t3 = performance.now();
    const latency2 = t3 - t2;

    assert.equal(res2.status, 200);
    assert.equal(res2.headers['x-cache'], 'HIT', 'Second request must be a cache HIT');
    assert.deepEqual(res1.body, res2.body, 'Cached body must match original response');

    // Cache hit should be significantly faster than cache miss
    assert.ok(
      latency2 < latency1,
      `Cache hit (${latency2.toFixed(1)}ms) should be faster than cache miss (${latency1.toFixed(1)}ms)`
    );
  });

  it('should protect against cache stampede: 10 concurrent requests result in only 1 MISS', async () => {
    const stampedeKey = `/api/products?stampedeTestBatch=${Date.now()}`;

    // Launch 10 simultaneous requests
    const promises = Array.from({ length: 10 }, () => request(app).get(stampedeKey));
    const responses = await Promise.all(promises);

    const misses = responses.filter((r) => r.headers['x-cache'] === 'MISS');
    const hits = responses.filter((r) => r.headers['x-cache'] === 'HIT');

    assert.equal(responses.length, 10);
    assert.equal(misses.length, 1, 'Exactly one request should execute the database call (MISS)');
    assert.equal(hits.length, 9, 'All other 9 concurrent requests should receive coalesced response (HIT)');
  });

  it('should invalidate product cache when a new product is created', async () => {
    const listUrl = '/api/products?invalidationTest=true';

    // 1. Prime the cache
    const initialRes = await request(app).get(listUrl);
    assert.equal(initialRes.headers['x-cache'], 'MISS');

    const cachedRes = await request(app).get(listUrl);
    assert.equal(cachedRes.headers['x-cache'], 'HIT');

    // 2. Create new product (mutation triggers invalidation of cache:GET:/api/products*)
    const createRes = await request(app)
      .post('/api/products')
      .send({
        name: 'Invalidator Test Device',
        category: 'electronics',
        price: 99.99,
        stock: 10,
        description: 'Verifies cache purging'
      });
    assert.equal(createRes.status, 201);

    // 3. Next GET request must be a fresh MISS
    const afterMutationRes = await request(app).get(listUrl);
    assert.equal(
      afterMutationRes.headers['x-cache'],
      'MISS',
      'Cache must be invalidated following product creation'
    );
  });

  it('should never cache error responses (4xx, 5xx)', async () => {
    const notFoundUrl = `/api/products/9999999?testErrorCache=${Date.now()}`;

    const res1 = await request(app).get(notFoundUrl);
    assert.equal(res1.status, 404);
    assert.equal(res1.headers['x-cache'], undefined, '404 must not set X-Cache');

    const res2 = await request(app).get(notFoundUrl);
    assert.equal(res2.status, 404);
    assert.equal(res2.headers['x-cache'], undefined, 'Subsequent 404 must still not be cached');
  });

  it('should expose metrics in GET /api/cache/stats and support DELETE /api/cache', async () => {
    const statsRes = await request(app).get('/api/cache/stats');
    assert.equal(statsRes.status, 200);
    assert.ok(statsRes.body.data.mode);
    assert.ok(typeof statsRes.body.data.hits === 'number');
    assert.ok(typeof statsRes.body.data.misses === 'number');

    const clearRes = await request(app).delete('/api/cache');
    assert.equal(clearRes.status, 200);
    assert.equal(clearRes.body.data.cleared, true);

    const postClearStats = await request(app).get('/api/cache/stats');
    assert.equal(postClearStats.body.data.keysCount, 0);
  });
});
