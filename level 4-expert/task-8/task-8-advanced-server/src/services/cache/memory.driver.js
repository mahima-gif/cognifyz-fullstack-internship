/**
 * In-Memory Cache Driver
 * Provides TTL caching, key invalidation by prefix, and hit/miss statistics.
 * Acts as the zero-dependency fallback for environments without Redis.
 */
class MemoryCacheDriver {
  constructor() {
    this.store = new Map(); // key -> { value, expiresAt }
    this.hits = 0;
    this.misses = 0;
    this.mode = 'memory';

    // Periodic cleanup of expired keys every 30 seconds
    this.cleanupTimer = setInterval(() => this.purgeExpired(), 30000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Retrieves a cached item
   * @param {string} key
   * @returns {Promise<{ status: number, body: any } | null>}
   */
  async get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return null;
    }

    this.hits += 1;
    return entry.value;
  }

  /**
   * Sets a cache entry with TTL
   * @param {string} key
   * @param {{ status: number, body: any }} value
   * @param {number} ttlSeconds
   */
  async set(key, value, ttlSeconds = 60) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Deletes a single key
   * @param {string} key
   */
  async del(key) {
    this.store.delete(key);
  }

  /**
   * Invalidates all keys matching a prefix (e.g. "cache:GET:/api/products")
   * @param {string} prefix
   */
  async delByPrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clears all cache entries and resets metrics
   */
  async clear() {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Purges expired keys from memory
   */
  purgeExpired() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Returns cache metrics
   */
  async getStats() {
    this.purgeExpired();
    const total = this.hits + this.misses;
    const hitRatio = total > 0 ? (this.hits / total).toFixed(2) : '0.00';

    return {
      mode: this.mode,
      hits: this.hits,
      misses: this.misses,
      hitRatio: parseFloat(hitRatio),
      keysCount: this.store.size,
    };
  }

  async close() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.store.clear();
  }
}

module.exports = MemoryCacheDriver;
