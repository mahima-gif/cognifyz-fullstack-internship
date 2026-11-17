/**
 * Automated Tests for InMemoryCache.
 * Executes using Node.js built-in test runner (node:test).
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { InMemoryCache } = require('../src/utils/cache');

describe('InMemoryCache Tests', () => {
  let cache;

  beforeEach(() => {
    cache = new InMemoryCache({ maxSize: 3, defaultTtlMs: 50 });
  });

  it('should set and get values correctly', () => {
    cache.set('key1', { temp: 22 });
    const result = cache.get('key1');
    assert.deepEqual(result, { temp: 22 });
  });

  it('should increment hits and misses accurately', () => {
    cache.set('key1', 'val1');
    assert.equal(cache.get('key1'), 'val1'); // hit
    assert.equal(cache.get('nonexistent'), null); // miss

    const stats = cache.getStats();
    assert.equal(stats.hits, 1);
    assert.equal(stats.misses, 1);
  });

  it('should evict expired entries after TTL passes', async () => {
    cache.set('expiringKey', 'temporaryData', 20); // 20ms TTL

    // Immediate read should succeed
    assert.equal(cache.get('expiringKey'), 'temporaryData');

    // Wait 35ms for entry to expire
    await new Promise((resolve) => setTimeout(resolve, 35));

    // Entry should have expired and returned null
    assert.equal(cache.get('expiringKey'), null);
    assert.equal(cache.has('expiringKey'), false);
  });

  it('should enforce maxSize and evict least recently used entry', () => {
    // Cache maxSize is 3
    cache.set('a', 1, 10000);
    cache.set('b', 2, 10000);
    cache.set('c', 3, 10000);

    // Access 'a' so 'b' becomes the least recently accessed entry
    cache.get('a');

    // Adding 4th entry exceeds maxSize (3) -> should evict 'b'
    cache.set('d', 4, 10000);

    assert.equal(cache.get('b'), null, "'b' should have been evicted");
    assert.equal(cache.get('a'), 1, "'a' was accessed and should be retained");
    assert.equal(cache.get('c'), 3, "'c' should be retained");
    assert.equal(cache.get('d'), 4, "'d' should be retained");
  });

  it('should normalize weather keys consistently regardless of case and spacing', () => {
    const key1 = InMemoryCache.normalizeWeatherKey(' London  ', 'METRIC');
    const key2 = InMemoryCache.normalizeWeatherKey('london', 'metric');
    assert.equal(key1, key2);
    assert.equal(key1, 'weather:london:metric');
  });

  it('should normalize country keys consistently', () => {
    const key1 = InMemoryCache.normalizeCountryKey(' gb ');
    const key2 = InMemoryCache.normalizeCountryKey('GB');
    assert.equal(key1, key2);
    assert.equal(key1, 'country:GB');
  });

  it('should purge all entries on clear() and reset hit/miss stats', () => {
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    cache.clear();

    const stats = cache.getStats();
    assert.equal(stats.size, 0);
    assert.equal(stats.hits, 0);
    assert.equal(stats.misses, 0);
  });
});
