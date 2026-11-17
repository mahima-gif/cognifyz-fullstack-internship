/**
 * In-Memory TTL Cache with Capacity Control and Least-Recently-Used (LRU) Eviction.
 *
 * Why caching is critical:
 * 1. Reduces latency by serving repeat requests in <1ms instead of making 200-500ms network round-trips.
 * 2. Shields external upstream APIs (Open-Meteo & REST Countries) from quota exhaustion and rate limiting.
 * 3. Improves application reliability during intermittent upstream hiccups.
 */
class InMemoryCache {
  /**
   * @param {Object} options
   * @param {number} [options.maxSize=100] - Maximum number of cached items before eviction
   * @param {number} [options.defaultTtlMs=600000] - Default TTL in milliseconds (10 minutes)
   */
  constructor({ maxSize = 100, defaultTtlMs = 10 * 60 * 1000 } = {}) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
    this.store = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Normalize weather cache key (case-insensitive city name + normalized units)
   * Example: "London", "METRIC" -> "weather:london:metric"
   */
  static normalizeWeatherKey(city, units = 'metric') {
    const cleanCity = String(city || '').trim().toLowerCase();
    const cleanUnits = String(units || 'metric').trim().toLowerCase();
    return `weather:${cleanCity}:${cleanUnits}`;
  }

  /**
   * Normalize country cache key (case-insensitive 2-letter alpha code)
   * Example: "gb" -> "country:GB"
   */
  static normalizeCountryKey(code) {
    const cleanCode = String(code || '').trim().toUpperCase();
    return `country:${cleanCode}`;
  }

  /**
   * Retrieve an item from the cache.
   * If expired, it is evicted immediately and counted as a cache miss.
   * If valid, moves the entry to the end of the Map (most recently used).
   *
   * @param {string} key
   * @returns {*|null} The cached value or null
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return null;
    }

    // Refresh LRU ordering: delete and re-insert at end of Map
    this.store.delete(key);
    entry.lastAccessedAt = now;
    this.store.set(key, entry);

    this.hits += 1;
    return entry.value;
  }

  /**
   * Check if a key exists and has not expired.
   *
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Store a value in cache with a specific TTL.
   * Performs automatic expired cleanup and LRU eviction if capacity is reached.
   *
   * @param {string} key
   * @param {*} value
   * @param {number} [ttlMs] - Time-to-live in ms (defaults to defaultTtlMs)
   */
  set(key, value, ttlMs = this.defaultTtlMs) {
    const now = Date.now();
    const expiresAt = now + (ttlMs > 0 ? ttlMs : this.defaultTtlMs);

    // If key already exists, delete it first to update insertion order
    if (this.store.has(key)) {
      this.store.delete(key);
    } else {
      // Purge expired entries first to free up space
      this.purgeExpired();

      // If still at or over capacity, evict the least recently used (first item in Map)
      if (this.store.size >= this.maxSize) {
        const oldestKey = this.store.keys().next().value;
        if (oldestKey !== undefined) {
          this.store.delete(oldestKey);
        }
      }
    }

    this.store.set(key, {
      value,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt
    });
  }

  /**
   * Purge all expired entries across the store.
   * @returns {number} Count of removed entries
   */
  purgeExpired() {
    const now = Date.now();
    let purged = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        purged += 1;
      }
    }
    return purged;
  }

  /**
   * Delete an explicit key.
   * @param {string} key
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Clear all items and reset statistics.
   */
  clear() {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Retrieve current cache statistics for monitoring / health endpoints.
   */
  getStats() {
    this.purgeExpired();
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? ((this.hits / totalRequests) * 100).toFixed(1) + '%' : '0.0%';

    return {
      size: this.store.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate
    };
  }
}

// Global cache instance for the application
const cacheInstance = new InMemoryCache({
  maxSize: 150,
  defaultTtlMs: 10 * 60 * 1000 // 10 minutes default
});

module.exports = {
  InMemoryCache,
  cache: cacheInstance
};
