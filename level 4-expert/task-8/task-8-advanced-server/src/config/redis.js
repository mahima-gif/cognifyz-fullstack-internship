const Redis = require('ioredis');
const env = require('./env');

let cachedMode = null;
let probeClient = null;

/**
 * Creates an ioredis instance with appropriate configuration
 * for BullMQ (maxRetriesPerRequest: null) and general usage.
 * @param {object} [customOptions={}]
 * @returns {Redis}
 */
function createRedisClient(customOptions = {}) {
  const url = env.redisUrl || 'redis://127.0.0.1:6379';
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: 2000,
    retryStrategy(times) {
      // Reconnect with backoff capped at 2 seconds
      return Math.min(times * 100, 2000);
    },
    ...customOptions,
  });
}

/**
 * Checks whether Redis is configured and reachable.
 * Times out after 1500ms to ensure fast application startup even if Redis is offline.
 * @returns {Promise<{ mode: 'redis' | 'memory', client: Redis|null, url: string|null }>}
 */
async function detectRedisMode() {
  if (cachedMode) {
    return cachedMode;
  }

  // If REDIS_URL is explicitly empty or null, run in memory mode immediately
  if (!env.redisUrl) {
    console.log('[System] REDIS_URL not configured. Running in MEMORY mode.');
    cachedMode = { mode: 'memory', client: null, url: null };
    return cachedMode;
  }

  // Attempt a ping test with a fast timeout
  const testClient = new Redis(env.redisUrl, {
    connectTimeout: 1500,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // Do not auto-retry during probe
    lazyConnect: true,
  });

  try {
    const pingPromise = (async () => {
      await testClient.connect();
      const res = await testClient.ping();
      return res === 'PONG';
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis probe timed out (1500ms)')), 1500)
    );

    const ok = await Promise.race([pingPromise, timeoutPromise]);
    if (ok) {
      console.log(`[System] Connected to Redis at ${env.redisUrl}. Running in REDIS mode.`);
      cachedMode = { mode: 'redis', client: testClient, url: env.redisUrl };
      probeClient = testClient;
      return cachedMode;
    }
  } catch (err) {
    try {
      testClient.disconnect();
    } catch (_) {}
    console.warn(`[System] Redis not available (${err.message}), running in MEMORY mode.`);
  }

  cachedMode = { mode: 'memory', client: null, url: null };
  return cachedMode;
}

/**
 * Resets cached detection result (useful for test suites or reconnection)
 */
function resetModeCache() {
  if (probeClient) {
    try {
      probeClient.disconnect();
    } catch (_) {}
    probeClient = null;
  }
  cachedMode = null;
}

module.exports = {
  createRedisClient,
  detectRedisMode,
  resetModeCache,
};
