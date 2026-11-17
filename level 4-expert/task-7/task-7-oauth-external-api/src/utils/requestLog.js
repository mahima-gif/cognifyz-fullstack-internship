/**
 * In-Memory Request Log Ring Buffer.
 *
 * Stores the last 25 API requests per authenticated user.
 * Records method, path, status code, duration in ms, and cache status (HIT/MISS/none).
 *
 * Security Guarantee:
 * Strictly does NOT record query parameters, cookies, request bodies, or OAuth tokens.
 */

class RequestLogManager {
  /**
   * @param {number} [maxEntries=25]
   */
  constructor(maxEntries = 25) {
    this.maxEntries = maxEntries;
    this.userLogs = new Map();
  }

  /**
   * Record a completed API request in the user's ring buffer.
   *
   * @param {string} userId - Authenticated user identifier
   * @param {Object} entry
   * @param {string} entry.method - HTTP method (GET, POST, etc.)
   * @param {string} entry.path - Sanitized route path without query strings
   * @param {number} entry.statusCode - HTTP status code
   * @param {number} entry.durationMs - Request duration in milliseconds
   * @param {string} [entry.cache='none'] - X-Cache header value (HIT, MISS, none)
   */
  addEntry(userId, entry) {
    if (!userId) return;

    if (!this.userLogs.has(userId)) {
      this.userLogs.set(userId, []);
    }

    const list = this.userLogs.get(userId);
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      method: entry.method || 'GET',
      path: entry.path || '/',
      statusCode: entry.statusCode || 200,
      durationMs: Math.max(1, Math.round(entry.durationMs || 1)),
      cache: entry.cache || 'none'
    };

    // Prepend to show newest first
    list.unshift(item);

    // Enforce ring buffer ceiling
    if (list.length > this.maxEntries) {
      list.length = this.maxEntries;
    }
  }

  /**
   * Retrieve entries for a given user.
   * @param {string} userId
   * @returns {Array<Object>}
   */
  getEntries(userId) {
    if (!userId) return [];
    return this.userLogs.get(userId) || [];
  }

  /**
   * Clear all records (useful in tests).
   */
  clear() {
    this.userLogs.clear();
  }
}

const requestLog = new RequestLogManager(25);

module.exports = {
  RequestLogManager,
  requestLog
};
