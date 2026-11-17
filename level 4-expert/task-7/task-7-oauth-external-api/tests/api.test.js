/**
 * Automated API & Integration Tests.
 * Executes using Node.js built-in test runner (node:test) with supertest.
 *
 * MOCKING STRATEGY:
 * To guarantee tests run completely offline and never hit external APIs (GitHub, Open-Meteo, REST Countries),
 * we hook into the shared `httpClient.defaults.adapter`.
 * This allows testing the full middleware chain, validation, caching, error mapping, and retry logic.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'true';
process.env.SESSION_SECRET = 'test_secret_must_be_at_least_32_characters_long_for_security';

const app = require('../app');
const { httpClient } = require('../src/services/httpClient');
const { cache } = require('../src/utils/cache');
const { requestLog } = require('../src/utils/requestLog');

describe('CityPulse API Integration Tests', () => {
  let originalAdapter;
  let mockHandler;

  beforeEach(() => {
    cache.clear();
    requestLog.clear();
    originalAdapter = httpClient.defaults.adapter;
    // Route axios requests to mockHandler
    httpClient.defaults.adapter = async (config) => {
      if (typeof mockHandler === 'function') {
        return mockHandler(config);
      }
      throw new Error(`Unhandled mock request for ${config.url}`);
    };
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
    cache.clear();
    requestLog.clear();
  });

  // Helper to establish an authenticated session agent
  async function createAuthenticatedAgent(customUser = null) {
    const agent = supertest.agent(app);
    const loginRes = await agent
      .post('/auth/demo-login')
      .set('Accept', 'application/json')
      .send();
    assert.equal(loginRes.status, 200);

    // Verify access token is NEVER leaked in demo login response
    assert.equal(loginRes.body.data.accessToken, undefined, 'Access token must NEVER be returned in response');
    const rawJson = JSON.stringify(loginRes.body);
    assert.equal(rawJson.includes('demo_access_token'), false, 'Access token string must not exist in login body');

    return agent;
  }

  // 1. Basic Auth Guard
  it('1. Unauthenticated /api/weather request should return HTTP 401', async () => {
    const res = await supertest(app).get('/api/weather?city=London');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /authentication required/i);
    assert.deepEqual(res.body.errors, ['Unauthorized']);
  });

  // 2. Input Validation
  it('2. Invalid city input (empty, numbers, special symbols) should return HTTP 400', async () => {
    const agent = await createAuthenticatedAgent();

    const res1 = await agent.get('/api/weather?city=1');
    assert.equal(res1.status, 400);
    assert.equal(res1.body.success, false);
    assert.ok(res1.body.errors.length > 0);

    const res2 = await agent.get('/api/weather?city=London&units=kelvin');
    assert.equal(res2.status, 400);
    assert.equal(res2.body.success, false);
  });

  // 3. Valid Weather & Country Aggregation
  it('3. Valid city returns clean simplified weather and country shape', async () => {
    const agent = await createAuthenticatedAgent();

    mockHandler = async (config) => {
      const url = config.url;

      if (url.includes('geocoding-api.open-meteo.com')) {
        return {
          data: {
            results: [
              {
                name: 'London',
                latitude: 51.5074,
                longitude: -0.1278,
                country: 'United Kingdom',
                country_code: 'GB'
              }
            ]
          },
          status: 200,
          headers: {},
          config
        };
      }

      if (url.includes('api.open-meteo.com/v1/forecast')) {
        return {
          data: {
            current: {
              temperature_2m: 15.4,
              apparent_temperature: 14.2,
              relative_humidity_2m: 72,
              wind_speed_10m: 11.5,
              weather_code: 3
            },
            daily: {
              time: ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'],
              weather_code: [3, 61, 1, 0, 2],
              temperature_2m_max: [16.0, 14.5, 15.0, 17.2, 16.8],
              temperature_2m_min: [9.1, 8.4, 7.9, 9.5, 10.1]
            }
          },
          status: 200,
          headers: {},
          config
        };
      }

      if (url.includes('restcountries.com')) {
        return {
          data: [
            {
              name: { common: 'United Kingdom', official: 'United Kingdom of Great Britain' },
              capital: ['London'],
              region: 'Europe',
              subregion: 'Northern Europe',
              population: 67215293,
              flag: '🇬🇧',
              flags: { png: 'https://flagcdn.com/w320/gb.png' },
              currencies: { GBP: { name: 'British pound', symbol: '£' } },
              languages: { eng: 'English' }
            }
          ],
          status: 200,
          headers: {},
          config
        };
      }

      throw new Error(`Unexpected request: ${url}`);
    };

    const res = await agent.get('/api/weather?city=London&units=metric');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.headers['x-cache'], 'MISS');

    const data = res.body.data;
    assert.equal(data.city, 'London');
    assert.equal(data.countryCode, 'GB');
    assert.equal(data.units.temperature, '°C');
    assert.equal(data.current.temperature, 15.4);
    assert.equal(data.current.description, 'Overcast');
    assert.equal(data.country.name.common, 'United Kingdom');
  });

  // 4. In-Memory Caching
  it('4. Second identical request is served from memory and returns X-Cache: HIT', async () => {
    const agent = await createAuthenticatedAgent();
    let upstreamCallCount = 0;

    mockHandler = async (config) => {
      upstreamCallCount += 1;
      const url = config.url;

      if (url.includes('geocoding-api.open-meteo.com')) {
        return {
          data: {
            results: [{ name: 'Paris', latitude: 48.8566, longitude: 2.3522, country: 'France', country_code: 'FR' }]
          },
          status: 200,
          headers: {},
          config
        };
      }
      if (url.includes('forecast')) {
        return {
          data: { current: { temperature_2m: 18.0, weather_code: 0 }, daily: { time: ['2026-11-16'], weather_code: [0], temperature_2m_max: [19], temperature_2m_min: [11] } },
          status: 200,
          headers: {},
          config
        };
      }
      if (url.includes('restcountries.com')) {
        return {
          data: [{ name: { common: 'France' }, capital: ['Paris'], region: 'Europe', population: 67390000, flag: '🇫🇷' }],
          status: 200,
          headers: {},
          config
        };
      }
    };

    const res1 = await agent.get('/api/weather?city=Paris');
    assert.equal(res1.status, 200);
    assert.equal(res1.headers['x-cache'], 'MISS');
    const initialCalls = upstreamCallCount;
    assert.ok(initialCalls > 0);

    const res2 = await agent.get('/api/weather?city=Paris');
    assert.equal(res2.status, 200);
    assert.equal(res2.headers['x-cache'], 'HIT');
    assert.equal(upstreamCallCount, initialCalls, 'No additional upstream calls should be made on cache hit');
  });

  // 5. 404 City Not Found
  it('5. City that does not exist returns HTTP 404', async () => {
    const agent = await createAuthenticatedAgent();

    mockHandler = async (config) => {
      return {
        data: { results: [] },
        status: 200,
        headers: {},
        config
      };
    };

    const res = await agent.get('/api/weather?city=NonExistentCityXYZ');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /not found/i);
  });

  // 6. Upstream Timeout (504)
  it('6. Upstream timeout returns HTTP 504 Gateway Timeout', async () => {
    const agent = await createAuthenticatedAgent();

    mockHandler = async (config) => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      timeoutError.config = config;
      throw timeoutError;
    };

    const res = await agent.get('/api/weather?city=Berlin');
    assert.equal(res.status, 504);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /timed out/i);
  });

  // 7. Upstream 500 (502 with single retry)
  it('7. Upstream 500 server error triggers single retry and then returns HTTP 502', async () => {
    const agent = await createAuthenticatedAgent();
    let callAttempts = 0;

    mockHandler = async (config) => {
      callAttempts += 1;
      const err = new Error('Internal Server Error in upstream Open-Meteo');
      err.response = { status: 500, data: 'Server crash' };
      err.config = config;
      throw err;
    };

    const res = await agent.get('/api/weather?city=Tokyo');
    assert.equal(res.status, 502);
    assert.equal(res.body.success, false);
    assert.equal(callAttempts, 2, 'Should attempt request exactly twice (1 initial + 1 retry)');
  });

  // 8. Upstream 429 -> 503
  it('8. Upstream 429 maps to HTTP 503 with retryAfter value and NO retry attempt', async () => {
    const agent = await createAuthenticatedAgent();
    let callAttempts = 0;

    mockHandler = async (config) => {
      callAttempts += 1;
      const err = new Error('Rate limit exceeded upstream');
      err.response = {
        status: 429,
        headers: { 'retry-after': '45' },
        data: 'Rate limited'
      };
      err.config = config;
      throw err;
    };

    const res = await agent.get('/api/weather?city=Rome');
    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
    assert.equal(res.body.retryAfter, 45);
    assert.equal(callAttempts, 1, 'Client errors (4xx) must NEVER be retried');
  });

  // 9. Graceful Degradation
  it('9. Graceful degradation: REST Countries failure returns weather with country: null and warnings', async () => {
    const agent = await createAuthenticatedAgent();

    mockHandler = async (config) => {
      const url = config.url;

      if (url.includes('geocoding-api.open-meteo.com')) {
        return {
          data: { results: [{ name: 'Cairo', latitude: 30.0444, longitude: 31.2357, country: 'Egypt', country_code: 'EG' }] },
          status: 200,
          headers: {},
          config
        };
      }
      if (url.includes('forecast')) {
        return {
          data: { current: { temperature_2m: 28.5, weather_code: 0 }, daily: { time: ['2026-11-16'], weather_code: [0], temperature_2m_max: [30], temperature_2m_min: [20] } },
          status: 200,
          headers: {},
          config
        };
      }
      if (url.includes('restcountries.com')) {
        const err = new Error('REST Countries service down');
        err.response = { status: 503, data: 'Service unavailable' };
        err.config = config;
        throw err;
      }
    };

    const res = await agent.get('/api/weather?city=Cairo');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.city, 'Cairo');
    assert.equal(res.body.data.country, null);
    assert.ok(Array.isArray(res.body.warnings));
    assert.match(res.body.warnings[0], /temporarily unavailable/i);
  });

  // 10. Zero Stack Trace Leaks
  it('10. Error responses never leak stack traces or internal secrets to client', async () => {
    const agent = await createAuthenticatedAgent();

    mockHandler = async () => {
      throw new Error('Secret upstream database connection failed at db://admin:password@internal-db:5432');
    };

    const res = await agent.get('/api/weather?city=Madrid');
    assert.equal(res.body.success, false);
    assert.equal(res.body.stack, undefined, 'Stack trace must not be present in response');
    const jsonString = JSON.stringify(res.body);
    assert.equal(jsonString.includes('at db://admin'), false, 'Internal database details must not leak');
  });

  // 11. Strict Rate Limiting
  it('11. Strict rate limiter returns HTTP 429 with retryAfter when limit is exceeded', async () => {
    const agent = await createAuthenticatedAgent();

    mockHandler = async (config) => {
      return {
        data: { results: [{ name: 'Oslo', latitude: 59.91, longitude: 10.75, country_code: 'NO' }] },
        status: 200,
        headers: {},
        config
      };
    };

    let lastRes;
    for (let i = 0; i < 21; i += 1) {
      lastRes = await agent
        .get('/api/weather?city=Oslo')
        .set('x-test-rate-limit', 'true');
    }

    assert.equal(lastRes.status, 429);
    assert.equal(lastRes.body.success, false);
    assert.ok(lastRes.body.retryAfter > 0);
    assert.ok(lastRes.headers['retry-after']);
    assert.match(lastRes.body.message, /rate limit/i);
  });

  // 12. OAuth Route Behavior
  it('12. OAuth route /auth/github responds with either 302 redirect or friendly 503', async () => {
    const res = await supertest(app).get('/auth/github');
    if (res.status === 503) {
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /not configured/i);
    } else {
      assert.equal(res.status, 302);
      assert.match(res.headers.location, /github\.com\/login\/oauth\/authorize/);
    }
  });

  // 13. Search History
  it('13. Session search history records past searches', async () => {
    const agent = await createAuthenticatedAgent();

    mockHandler = async (config) => {
      const url = config.url;
      if (url.includes('geocoding')) {
        return {
          data: { results: [{ name: 'Kyoto', latitude: 35.0116, longitude: 135.7681, country: 'Japan', country_code: 'JP' }] },
          status: 200,
          headers: {},
          config
        };
      }
      return {
        data: { current: {}, daily: {} },
        status: 200,
        headers: {},
        config
      };
    };

    await agent.get('/api/weather?city=Kyoto');

    const historyRes = await agent.get('/api/search-history');
    assert.equal(historyRes.status, 200);
    assert.equal(historyRes.body.success, true);
    assert.ok(Array.isArray(historyRes.body.data));
    assert.equal(historyRes.body.data[0].city, 'Kyoto');
  });

  // 14. Health and Cache Stats
  it('14. Public /api/health endpoint returns uptime and cache statistics', async () => {
    const res = await supertest(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'healthy');
    assert.ok(res.body.data.uptime);
    assert.ok(typeof res.body.data.cache.hits === 'number');
    assert.ok(typeof res.body.data.cache.misses === 'number');
    assert.ok(typeof res.body.data.cache.hitRate === 'string');
  });

  // ==========================================================================
  // NEW ENDPOINT TESTS (Showcase Additions)
  // ==========================================================================

  // 15. GitHub Profile Endpoint (Demo Mode)
  it('15. GET /api/github/profile in demo mode returns simplified profile with demo: true', async () => {
    const agent = await createAuthenticatedAgent();
    const res = await agent.get('/api/github/profile');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.demo, true);
    assert.ok(res.body.data.login);
    assert.ok(Array.isArray(res.body.data.scopes));
    assert.deepEqual(res.body.data.scopes, ['read:user']);
    // Verify token is NOT leaked
    assert.equal(res.body.data.accessToken, undefined);
  });

  // 16. GitHub Repos Endpoint (Demo Mode)
  it('16. GET /api/github/repos in demo mode returns 6 repositories with clean shape', async () => {
    const agent = await createAuthenticatedAgent();
    const res = await agent.get('/api/github/repos');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 6);
    assert.ok(res.body.data[0].name);
    assert.ok(res.body.data[0].language);
    assert.ok(typeof res.body.data[0].stars === 'number');
  });

  // 17. GitHub Profile with Real Mocked Token & 401 Expiration
  it('17. GitHub API 401 returns expired token AppError', async () => {
    const agent = await createAuthenticatedAgent();

    // Mock upstream GitHub 401
    mockHandler = async (config) => {
      const err = new Error('Bad credentials');
      err.response = { status: 401, data: { message: 'Bad credentials' } };
      err.config = config;
      throw err;
    };

    // Override service directly to simulate non-demo request
    const githubService = require('../src/services/github.service');
    cache.clear();

    await assert.rejects(
      async () => {
        await githubService.getGitHubProfile({ id: 'test_real', accessToken: 'real_github_token_xyz' });
      },
      (err) => {
        assert.equal(err.statusCode, 401);
        assert.match(err.message, /expired or is invalid/i);
        return true;
      }
    );
  });

  // 18. GitHub API 403 Rate Limit Mapping
  it('18. GitHub API 403 rate limit maps to HTTP 503 with retryAfter', async () => {
    const githubService = require('../src/services/github.service');
    cache.clear();

    mockHandler = async (config) => {
      const err = new Error('API rate limit exceeded');
      err.response = {
        status: 403,
        headers: { 'retry-after': '60', 'x-ratelimit-remaining': '0' },
        data: { message: 'API rate limit exceeded' }
      };
      err.config = config;
      throw err;
    };

    await assert.rejects(
      async () => {
        await githubService.getGitHubProfile({ id: 'test_ratelimit', accessToken: 'gh_token_abc' });
      },
      (err) => {
        assert.equal(err.statusCode, 503);
        assert.equal(err.retryAfter, 60);
        return true;
      }
    );
  });

  // 19. Rate Limits Visibility Endpoint
  it('19. GET /api/limits returns active general and strict rate limiter counters', async () => {
    const agent = await createAuthenticatedAgent();
    const res = await agent.get('/api/limits');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.general);
    assert.equal(res.body.data.general.limit, 100);
    assert.ok(typeof res.body.data.general.remaining === 'number');
    assert.ok(res.body.data.strict);
    assert.equal(res.body.data.strict.limit, 20);
    assert.ok(typeof res.body.data.strict.remaining === 'number');
  });

  // 20. Controlled Error Simulation (/api/demo/error)
  it('20. GET /api/demo/error triggers production error handling for all 5 error types', async () => {
    const agent = await createAuthenticatedAgent();

    // 400 Bad Input
    const badInputRes = await agent.get('/api/demo/error?type=badinput');
    assert.equal(badInputRes.status, 400);
    assert.equal(badInputRes.body.success, false);
    assert.ok(badInputRes.body.errors.length > 0);

    // 404 Not Found
    const notFoundRes = await agent.get('/api/demo/error?type=notfound');
    assert.equal(notFoundRes.status, 404);
    assert.equal(notFoundRes.body.success, false);

    // 504 Timeout
    const timeoutRes = await agent.get('/api/demo/error?type=timeout');
    assert.equal(timeoutRes.status, 504);
    assert.equal(timeoutRes.body.success, false);

    // 502 Upstream 500 Failure
    const upstream500Res = await agent.get('/api/demo/error?type=upstream500');
    assert.equal(upstream500Res.status, 502);
    assert.equal(upstream500Res.body.success, false);

    // 503 Upstream 429 Rate Limit
    const upstream429Res = await agent.get('/api/demo/error?type=upstream429');
    assert.equal(upstream429Res.status, 503);
    assert.equal(upstream429Res.body.success, false);
    assert.equal(upstream429Res.body.retryAfter, 30);
  });

  // 21. Request Log Ring Buffer
  it('21. GET /api/request-log records authenticated API calls without leaking query strings or secrets', async () => {
    const agent = await createAuthenticatedAgent();

    // Make a search request that creates a log entry
    mockHandler = async (config) => {
      return {
        data: { results: [{ name: 'Madrid', latitude: 40.41, longitude: -3.70, country_code: 'ES' }] },
        status: 200,
        headers: {},
        config
      };
    };

    await agent.get('/api/weather?city=Madrid&secretToken123=do_not_leak_me');

    const logRes = await agent.get('/api/request-log');
    assert.equal(logRes.status, 200);
    assert.equal(logRes.body.success, true);
    assert.ok(Array.isArray(logRes.body.data));
    assert.ok(logRes.body.data.length > 0);

    const logged = logRes.body.data[0];
    assert.equal(logged.method, 'GET');
    // Sanitized path check: NO query parameters recorded
    assert.equal(logged.path, '/api/weather');
    const rawLogged = JSON.stringify(logged);
    assert.equal(rawLogged.includes('secretToken123'), false, 'Query strings and secrets must not be recorded');
  });

  // 22. Absolute Check: Access Token is NEVER Sent in Any Response
  it('22. Absolute Security Check: Access token is never present in any client response', async () => {
    const agent = await createAuthenticatedAgent();

    const meRes = await agent.get('/api/me');
    assert.equal(meRes.body.data.accessToken, undefined);
    assert.equal(JSON.stringify(meRes.body).includes('access_token'), false);

    const profileRes = await agent.get('/api/github/profile');
    assert.equal(profileRes.body.data.accessToken, undefined);
    assert.equal(JSON.stringify(profileRes.body).includes('access_token'), false);
  });
});
