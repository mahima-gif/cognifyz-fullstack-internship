const { createRedisClient } = require('../../config/redis');

/**
 * Redis Cache Driver
 * Implements server-side caching backed by Redis / ioredis.
 * Includes fail-open semantics: if Redis goes down, operations fail open (serve from source)
 * without crashing, logging a single warning rather than spamming every request.
 */
class RedisCacheDriver {
  /**
   * @param {import('ioredis').Redis} [client]
   */
  constructor(client) {
    this.client = client || createRedisClient();
    this.mode = 'redis';
    this.hits = 0;
    this.misses = 0;
    this.offlineWarningLogged = false;

    // Reset warning flag when connection recovers
    this.client.on('connect', () => {
      this.offlineWarningLogged = false;
    });

    this.client.on('error', (err) => {
      this.logOfflineOnce(err);
    });
  }

  logOfflineOnce(err) {
    if (!this.offlineWarningLogged) {
      console.warn(`[Redis Cache Driver] Redis offline/unreachable: ${err.message}. Failing open (bypassing cache).`);
      this.offlineWarningLogged = true;
    }
  }

  /**
   * @param {string} key
   * @returns {Promise<{ status: number, body: any } | null>}
   */
  async get(key) {
    try {
      const raw = await this.client.get(key);
      if (!raw) {
        this.misses += 1;
        return null;
      }
      this.hits += 1;
      return JSON.parse(raw);
    } catch (err) {
      this.logOfflineOnce(err);
      this.misses += 1;
      return null; // Fail-open: treat as miss
    }
  }

  /**
   * @param {string} key
   * @param {{ status: number, body: any }} value
   * @param {number} ttlSeconds
   */
  async set(key, value, ttlSeconds = 60) {
    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, 'EX', ttlSeconds);
    } catch (err) {
      this.logOfflineOnce(err);
    }
  }

  /**
   * @param {string} key
   */
  async del(key) {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logOfflineOnce(err);
    }
  }

  /**
   * Invalidate keys matching a prefix using SCAN (never KEYS in production)
   * @param {string} prefix
   */
  async delByPrefix(prefix) {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          100
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      this.logOfflineOnce(err);
    }
  }

  /**
   * Clears all cache-prefixed keys (leaves queue and other keys untouched)
   */
  async clear() {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          'cache:*',
          'COUNT',
          100
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
      this.hits = 0;
      this.misses = 0;
    } catch (err) {
      this.logOfflineOnce(err);
    }
  }

  /**
   * Returns cache metrics
   */
  async getStats() {
    let keyCount = 0;
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          'cache:*',
          'COUNT',
          100
        );
        cursor = nextCursor;
        keyCount += keys.length;
      } while (cursor !== '0');
    } catch (err) {
      this.logOfflineOnce(err);
    }

    const total = this.hits + this.misses;
    const hitRatio = total > 0 ? (this.hits / total).toFixed(2) : '0.00';

    return {
      mode: this.mode,
      hits: this.hits,
      misses: this.misses,
      hitRatio: parseFloat(hitRatio),
      keysCount: keyCount,
    };
  }

  async close() {
    try {
      await this.client.quit();
    } catch (_) {
      try {
        this.client.disconnect();
      } catch (__) {}
    }
  }
}

module.exports = RedisCacheDriver;
