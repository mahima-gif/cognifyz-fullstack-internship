/**
 * GitHub API Service.
 *
 * Interacts with GitHub REST API using the user's OAuth 2.0 access token stored securely
 * in the server session. The raw token is NEVER sent to the client browser.
 *
 * Resilience & Caching:
 * - Uses shared httpClient (5s timeout, 5xx retry).
 * - Caches responses for 5 minutes (300,000 ms) in the in-memory TTL cache.
 * - In DEMO_MODE or when no real token is present, returns clearly marked sample data ("demo": true).
 */

const { httpClient, mapAxiosError } = require('./httpClient');
const AppError = require('../utils/AppError');
const { cache } = require('../utils/cache');
const { DEMO_MODE } = require('../config/env');

const GITHUB_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Normalizes cache key for GitHub profile
 */
function getProfileCacheKey(userId) {
  return `github:profile:${userId || 'anonymous'}`;
}

/**
 * Normalizes cache key for GitHub repos
 */
function getReposCacheKey(userId) {
  return `github:repos:${userId || 'anonymous'}`;
}

/**
 * Generate realistic sample data for demo mode or pre-OAuth setup.
 */
function getDemoProfile(user) {
  return {
    login: user.username || 'octocat-demo',
    name: user.displayName || 'Demo Explorer',
    avatarUrl: user.avatarUrl || 'https://avatars.githubusercontent.com/u/583231?v=4',
    bio: 'Full stack explorer demonstrating OAuth 2.0, external APIs, rate limiting & caching.',
    publicRepos: 8,
    followers: 42,
    following: 15,
    profileUrl: 'https://github.com/octocat',
    scopes: ['read:user'],
    demo: true
  };
}

function getDemoRepos() {
  return [
    {
      name: 'citypulse-dashboard',
      description: 'Advanced API usage with GitHub OAuth 2.0, Open-Meteo, REST Countries & in-memory caching.',
      language: 'JavaScript',
      stars: 34,
      url: 'https://github.com/octocat/citypulse-dashboard'
    },
    {
      name: 'oauth2-security-kit',
      description: 'Production-ready OAuth 2.0 Authorization Code flow with state-backed CSRF protection.',
      language: 'TypeScript',
      stars: 89,
      url: 'https://github.com/octocat/oauth2-security-kit'
    },
    {
      name: 'resilient-http-client',
      description: 'Shared Axios client with exponential backoff retries and error normalization.',
      language: 'JavaScript',
      stars: 52,
      url: 'https://github.com/octocat/resilient-http-client'
    },
    {
      name: 'in-memory-lru-cache',
      description: 'Zero-dependency TTL in-memory cache with O(1) eviction for high-throughput APIs.',
      language: 'JavaScript',
      stars: 41,
      url: 'https://github.com/octocat/in-memory-lru-cache'
    },
    {
      name: 'open-meteo-pulse',
      description: 'Lightweight client for Open-Meteo geocoding and 5-day weather forecasting.',
      language: 'Python',
      stars: 19,
      url: 'https://github.com/octocat/open-meteo-pulse'
    },
    {
      name: 'geo-countries-service',
      description: 'REST Countries metadata parser and visualizer for web applications.',
      language: 'HTML',
      stars: 14,
      url: 'https://github.com/octocat/geo-countries-service'
    }
  ];
}

/**
 * Map GitHub-specific error statuses.
 */
function handleGitHubError(error) {
  if (error instanceof AppError) return error;

  if (error.response) {
    const status = error.response.status;

    if (status === 401) {
      return new AppError('GitHub access token has expired or is invalid. Please log in again.', 401);
    }

    if (status === 403 || status === 429) {
      const retryAfter = parseInt(error.response.headers?.['retry-after'], 10) || 60;
      return new AppError(
        'GitHub API rate limit exceeded. Please wait a moment before trying again.',
        503,
        null,
        retryAfter
      );
    }

    if (status >= 500) {
      return new AppError(`GitHub API is temporarily unavailable (HTTP ${status}).`, 502);
    }
  }

  return mapAxiosError(error, 'GitHub API');
}

/**
 * Fetch authenticated GitHub user profile using stored OAuth token.
 *
 * @param {Object} user - Authenticated user object from req.user
 * @returns {Promise<{ data: Object, fromCache: boolean }>}
 */
async function getGitHubProfile(user) {
  const userId = user?.id || 'demo';
  const cacheKey = getProfileCacheKey(userId);

  // Check 5-minute cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return { data: cached, fromCache: true };
  }

  const token = user?.accessToken;

  // Use demo data if token is not present or in DEMO_MODE with mock token
  const isDemo = !token || token.startsWith('demo_') || (DEMO_MODE && !user?.accessToken);
  if (isDemo) {
    const demoData = getDemoProfile(user || {});
    cache.set(cacheKey, demoData, GITHUB_CACHE_TTL_MS);
    return { data: demoData, fromCache: false };
  }

  try {
    const response = await httpClient.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'CityPulse-Dashboard/1.0'
      }
    });

    const raw = response.data;

    // Parse granted scopes from GitHub's X-OAuth-Scopes response header
    const scopeHeader = response.headers?.['x-oauth-scopes'] || '';
    const scopes = scopeHeader
      ? scopeHeader.split(',').map((s) => s.trim()).filter(Boolean)
      : ['read:user'];

    const profileData = {
      login: raw.login,
      name: raw.name || raw.login,
      avatarUrl: raw.avatar_url || '',
      bio: raw.bio || 'No bio provided on GitHub.',
      publicRepos: raw.public_repos ?? 0,
      followers: raw.followers ?? 0,
      following: raw.following ?? 0,
      profileUrl: raw.html_url || `https://github.com/${raw.login}`,
      scopes,
      demo: false
    };

    cache.set(cacheKey, profileData, GITHUB_CACHE_TTL_MS);
    return { data: profileData, fromCache: false };
  } catch (error) {
    throw handleGitHubError(error);
  }
}

/**
 * Fetch 6 most recently updated public repositories for the authenticated user.
 *
 * @param {Object} user - Authenticated user object from req.user
 * @returns {Promise<{ data: Array<Object>, fromCache: boolean }>}
 */
async function getGitHubRepos(user) {
  const userId = user?.id || 'demo';
  const cacheKey = getReposCacheKey(userId);

  // Check 5-minute cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return { data: cached, fromCache: true };
  }

  const token = user?.accessToken;

  const isDemo = !token || token.startsWith('demo_') || (DEMO_MODE && !user?.accessToken);
  if (isDemo) {
    const demoRepos = getDemoRepos();
    cache.set(cacheKey, demoRepos, GITHUB_CACHE_TTL_MS);
    return { data: demoRepos, fromCache: false };
  }

  try {
    const response = await httpClient.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'CityPulse-Dashboard/1.0'
      },
      params: {
        sort: 'updated',
        per_page: 6,
        type: 'all'
      }
    });

    const rawList = Array.isArray(response.data) ? response.data : [];
    const repos = rawList.slice(0, 6).map((repo) => ({
      name: repo.name,
      description: repo.description || 'No description provided.',
      language: repo.language || 'Plain Text',
      stars: repo.stargazers_count ?? 0,
      url: repo.html_url || ''
    }));

    cache.set(cacheKey, repos, GITHUB_CACHE_TTL_MS);
    return { data: repos, fromCache: false };
  } catch (error) {
    throw handleGitHubError(error);
  }
}

module.exports = {
  getGitHubProfile,
  getGitHubRepos,
  getProfileCacheKey,
  getReposCacheKey,
  GITHUB_CACHE_TTL_MS
};
