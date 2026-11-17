const { detectRedisMode } = require('../../config/redis');
const MemoryCacheDriver = require('./memory.driver');
const RedisCacheDriver = require('./redis.driver');

let activeDriver = null;
let initPromise = null;

/**
 * Initializes and returns the active cache driver based on environment availability
 * @returns {Promise<MemoryCacheDriver | RedisCacheDriver>}
 */
async function initCacheService() {
  if (activeDriver) {
    return activeDriver;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const { mode, client } = await detectRedisMode();
    if (mode === 'redis') {
      activeDriver = new RedisCacheDriver(client);
    } else {
      activeDriver = new MemoryCacheDriver();
    }
    return activeDriver;
  })();

  return initPromise;
}

/**
 * Synchronous proxy interface to the active cache driver.
 * Automatically ensures initialization.
 */
const cacheService = {
  async get(key) {
    const driver = await initCacheService();
    return driver.get(key);
  },

  async set(key, value, ttlSeconds) {
    const driver = await initCacheService();
    return driver.set(key, value, ttlSeconds);
  },

  async del(key) {
    const driver = await initCacheService();
    return driver.del(key);
  },

  async delByPrefix(prefix) {
    const driver = await initCacheService();
    return driver.delByPrefix(prefix);
  },

  async clear() {
    const driver = await initCacheService();
    return driver.clear();
  },

  async getStats() {
    const driver = await initCacheService();
    return driver.getStats();
  },

  async close() {
    if (activeDriver) {
      await activeDriver.close();
      activeDriver = null;
      initPromise = null;
    }
  },

  getDriver() {
    return activeDriver;
  },

  /**
   * For testing or forced driver swap
   */
  setDriver(customDriver) {
    activeDriver = customDriver;
  },
};

module.exports = cacheService;
module.exports.initCacheService = initCacheService;
