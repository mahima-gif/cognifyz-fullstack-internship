/**
 * Frontend API Service (ES Module).
 * Encapsulates all AJAX communications with the backend Express server using native fetch.
 *
 * Security:
 * The frontend NEVER handles, stores, or receives the GitHub OAuth access token.
 * All third-party API interactions are proxied and secured by the server.
 */

/**
 * Handle JSON API response parsing, header telemetry, and uniform error structures.
 */
async function parseResponse(response, startTime = 0) {
  const durationMs = startTime > 0 ? Math.max(1, Math.round(performance.now() - startTime)) : 0;
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let data = null;
  if (isJson) {
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }
  }

  const xCache = response.headers.get('x-cache') || response.headers.get('X-Cache') || 'MISS';
  const retryAfterHeader = response.headers.get('retry-after');

  // Parse RateLimit-* headers if available
  const rateLimitLimit = response.headers.get('ratelimit-limit');
  const rateLimitRemaining = response.headers.get('ratelimit-remaining');
  const rateLimitReset = response.headers.get('ratelimit-reset');

  const rateLimitInfo = {
    limit: rateLimitLimit ? parseInt(rateLimitLimit, 10) : null,
    remaining: rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : null,
    reset: rateLimitReset ? parseInt(rateLimitReset, 10) : null
  };

  if (!response.ok) {
    const errorObj = new Error(data?.message || `Request failed with HTTP status ${response.status}`);
    errorObj.status = response.status;
    errorObj.errors = data?.errors || [];
    errorObj.rawJson = data;
    errorObj.retryAfter = data?.retryAfter || (retryAfterHeader ? parseInt(retryAfterHeader, 10) : null);
    errorObj.xCache = xCache;
    errorObj.durationMs = durationMs;
    errorObj.rateLimit = rateLimitInfo;
    throw errorObj;
  }

  return {
    ...data,
    xCache,
    durationMs,
    rateLimit: rateLimitInfo
  };
}

/**
 * Retrieve public app configuration (demo mode status, OAuth status).
 */
export async function fetchConfig() {
  const t0 = performance.now();
  const response = await fetch('/api/config', {
    headers: { 'Accept': 'application/json' }
  });
  return parseResponse(response, t0);
}

/**
 * Retrieve current authenticated user profile.
 */
export async function fetchCurrentUser() {
  const t0 = performance.now();
  const response = await fetch('/api/me', {
    headers: { 'Accept': 'application/json' }
  });
  return parseResponse(response, t0);
}

/**
 * Fetch GitHub profile using server-side OAuth token.
 */
export async function fetchGitHubProfile() {
  const t0 = performance.now();
  const response = await fetch('/api/github/profile', {
    headers: { 'Accept': 'application/json' }
  });
  return parseResponse(response, t0);
}

/**
 * Fetch GitHub repositories using server-side OAuth token.
 */
export async function fetchGitHubRepos() {
  const t0 = performance.now();
  const response = await fetch('/api/github/repos', {
    headers: { 'Accept': 'application/json' }
  });
  return parseResponse(response, t0);
}

/**
 * Fetch weather forecast and country data for a city.
 * @param {string} city - Target city name
 * @param {string} [units='metric'] - 'metric' or 'imperial'
 */
export async function fetchWeather(city, units = 'metric') {
  const t0 = performance.now();
  const query = new URLSearchParams({ city, units });
  const response = await fetch(`/api/weather?${query.toString()}`, {
    headers: { 'Accept': 'application/json' }
  });
  return parseResponse(response, t0);
}

/**
 * Fetch country metadata by 2-letter ISO code.
 * @param {string} code - ISO alpha-2 code
 */
export async function fetchCountry(code) {
  const t0 = performance.now();
  const response = await fetch(`/api/country/${encodeURIComponent(code)}`, {
    headers: { 'Accept': 'application/json' }
  });
  return parseResponse(response, t0);
}

/**
 * Fetch session-persisted search history (last 10 queries).
 */
export async function fetchSearchHistory() {
  const t0 = performance.now();
  const response = await fetch('/api/search-history', {
    headers: { 'Accept': 'application/json' }
  });
  return parseResponse(response, t0);
}

/**
 * Fetch active rate limiter state (general and strict).
 */
export async function fetchLimits() {
  const t0 = performance.now();
  const response = await fetch('/api/limits', {
    headers: { 'Accept': 'application/json' }
  });
  return parseResponse(response, t0);
}

/**
 * Fetch live system health and cache statistics.
 */
export async function fetchHealth() {
  const t0 = performance.now();
  const response = await fetch('/api/health', {
    headers: { 'Accept': 'application/json' }
  });
  return parseResponse(response, t0);
}

/**
 * Fetch authenticated ring-buffer request log (last 25 entries).
 */
export async function fetchRequestLog() {
  const t0 = performance.now();
  const response = await fetch('/api/request-log', {
    headers: { 'Accept': 'application/json' }
  });
  return parseResponse(response, t0);
}

/**
 * Trigger controlled error simulation for demonstration.
 * @param {string} type - 'timeout' | 'upstream500' | 'upstream429' | 'notfound' | 'badinput'
 */
export async function triggerDemoError(type) {
  const t0 = performance.now();
  const response = await fetch(`/api/demo/error?type=${encodeURIComponent(type)}`, {
    headers: { 'Accept': 'application/json' }
  });
  return parseResponse(response, t0);
}

/**
 * Terminate active session and purge cookie.
 */
export async function logout() {
  const t0 = performance.now();
  const response = await fetch('/auth/logout', {
    method: 'POST',
    headers: { 'Accept': 'application/json' }
  });
  return parseResponse(response, t0);
}
