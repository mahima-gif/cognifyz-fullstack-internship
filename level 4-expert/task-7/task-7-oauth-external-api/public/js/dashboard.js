/**
 * Dashboard Controller (ES Module).
 * Coordinates Step 1 (OAuth & GitHub), Step 2 (External APIs), and Step 3 (Limits, Errors, Cache, Logs).
 */

import {
  fetchCurrentUser,
  fetchConfig,
  fetchGitHubProfile,
  fetchGitHubRepos,
  fetchWeather,
  fetchSearchHistory,
  fetchLimits,
  fetchHealth,
  fetchRequestLog,
  triggerDemoError,
  logout
} from './api.js';

import {
  renderUserProfile,
  renderGitHubProfile,
  renderGitHubRepos,
  renderWeatherAndCountry,
  renderSearchHistory,
  renderRateLimits,
  renderBurstTestResults,
  renderErrorInspector,
  renderCacheMetrics,
  renderRequestLogTable,
  showAlert,
  clearAlerts
} from './ui.js';

let currentSearchedCity = 'London';
let isExecutingBurst = false;

/**
 * Execute weather search for a city and selected units.
 */
async function performSearch(city, explicitUnits = null) {
  const cleanCity = (city || '').trim();
  if (!cleanCity) {
    showAlert('Please enter a valid city name.', 'error');
    return;
  }

  const units =
    explicitUnits ||
    document.querySelector('input[name="units"]:checked')?.value ||
    'metric';

  const btn = document.getElementById('search-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');

  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Fetching...';
  if (btnSpinner) btnSpinner.classList.remove('hidden');

  try {
    const response = await fetchWeather(cleanCity, units);
    currentSearchedCity = cleanCity;
    renderWeatherAndCountry(response.data, response.xCache, response.durationMs);

    // Refresh telemetry and logs
    refreshAuxiliaryData();
  } catch (error) {
    handleSearchError(error);
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Explore City';
    if (btnSpinner) btnSpinner.classList.add('hidden');
  }
}

/**
 * Maps search errors to user-friendly notifications.
 */
function handleSearchError(error) {
  const status = error.status;

  if (status === 401) {
    window.location.href = '/index.html?error=session_expired';
    return;
  }

  if (status === 400) {
    const errorDetails =
      Array.isArray(error.errors) && error.errors.length > 0
        ? error.errors.join(' ')
        : error.message;
    showAlert(`Input validation error: ${errorDetails}`, 'error');
    return;
  }

  if (status === 404) {
    showAlert(`City not found: ${error.message || 'Please check spelling and try again.'}`, 'error');
    return;
  }

  if (status === 429) {
    const retrySec = error.retryAfter || 60;
    showAlert(
      `Rate limit exceeded: ${error.message || 'Maximum 20 weather queries per minute.'}`,
      'rate-limit',
      retrySec
    );
    return;
  }

  if (status === 504) {
    showAlert('Upstream Open-Meteo API timed out after 5000ms (504 Gateway Timeout).', 'error');
    return;
  }

  if (status === 502) {
    showAlert('Upstream Open-Meteo service returned an invalid response (502 Bad Gateway).', 'error');
    return;
  }

  if (status === 503) {
    const retrySec = error.retryAfter || 30;
    showAlert(
      `Upstream service rate limit reached (503 Service Unavailable).`,
      'rate-limit',
      retrySec
    );
    return;
  }

  showAlert(error.message || 'An error occurred contacting the server.', 'error');
}

/**
 * Load Step 1 GitHub profile and public repositories using stored OAuth token.
 */
async function loadGitHubData() {
  try {
    const profileRes = await fetchGitHubProfile();
    if (profileRes.success && profileRes.data) {
      renderGitHubProfile(profileRes.data, profileRes.xCache);
    }
  } catch (err) {
    const loading = document.getElementById('github-profile-loading');
    if (loading) {
      loading.textContent = `Failed to load GitHub profile: ${err.message}`;
    }
  }

  try {
    const reposRes = await fetchGitHubRepos();
    if (reposRes.success && reposRes.data) {
      renderGitHubRepos(reposRes.data, reposRes.xCache);
    }
  } catch (err) {
    const loading = document.getElementById('github-repos-loading');
    if (loading) {
      loading.textContent = `Failed to load GitHub repositories: ${err.message}`;
    }
  }
}

/**
 * Refresh auxiliary data (rate limits, cache health, request log, search history).
 */
async function refreshAuxiliaryData() {
  // 1. Rate limits
  try {
    const limitsRes = await fetchLimits();
    if (limitsRes.success) {
      renderRateLimits(limitsRes.data);
    }
  } catch (_) {}

  // 2. Cache health
  try {
    const healthRes = await fetchHealth();
    if (healthRes.success) {
      renderCacheMetrics(healthRes.data);
    }
  } catch (_) {}

  // 3. Request log
  try {
    const logRes = await fetchRequestLog();
    if (logRes.success) {
      renderRequestLogTable(logRes.data);
    }
  } catch (_) {}

  // 4. Search history
  try {
    const histRes = await fetchSearchHistory();
    if (histRes.success && histRes.data) {
      renderSearchHistory(histRes.data, (selectedCity) => {
        const input = document.getElementById('city-input');
        if (input) input.value = selectedCity;
        performSearch(selectedCity);
      });
    }
  } catch (_) {}
}

/**
 * Execute 25-request burst test on strict rate limiter.
 */
async function executeBurstTest() {
  if (isExecutingBurst) return;
  isExecutingBurst = true;

  const btn = document.getElementById('run-burst-btn');
  const btnText = document.getElementById('burst-btn-text');
  const spinner = document.getElementById('burst-spinner');

  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Firing 25 Parallel Requests...';
  if (spinner) spinner.classList.remove('hidden');

  let okCount = 0;
  let rateLimitedCount = 0;
  let cacheHitCount = 0;

  // Dispatch 25 parallel requests to strict rate limiter (/api/weather)
  const burstPromises = Array.from({ length: 25 }, async () => {
    try {
      const res = await fetchWeather('London', 'metric');
      okCount += 1;
      if (String(res.xCache).toUpperCase() === 'HIT') {
        cacheHitCount += 1;
      }
    } catch (err) {
      if (err.status === 429) {
        rateLimitedCount += 1;
      }
    }
  });

  await Promise.all(burstPromises);

  renderBurstTestResults({
    total: 25,
    okCount,
    rateLimitedCount,
    cacheHitCount
  });

  if (btn) btn.disabled = false;
  if (btnText) btnText.textContent = '🚀 Fire 25 Concurrent Requests Again';
  if (spinner) spinner.classList.add('hidden');
  isExecutingBurst = false;

  // Refresh rate limits and log table
  refreshAuxiliaryData();
}

/**
 * Execute controlled error simulation button click.
 */
async function executeErrorSimulation(type) {
  clearAlerts();

  try {
    const res = await triggerDemoError(type);
    // Unexpected 200 on an error trigger
    renderErrorInspector(200, 'Request unexpectedly succeeded.', res);
  } catch (err) {
    renderErrorInspector(err.status, err.message, err.rawJson || {
      success: false,
      message: err.message,
      errors: err.errors || [err.message]
    });
  }

  // Refresh logs and limits to show the recorded error status code
  refreshAuxiliaryData();
}

/**
 * Initialize Showcase Dashboard.
 */
async function init() {
  // 1. Authenticate user
  let currentUser = null;
  try {
    const userRes = await fetchCurrentUser();
    if (!userRes.success || !userRes.data) {
      window.location.href = '/index.html?error=unauthorized';
      return;
    }
    currentUser = userRes.data;
  } catch (_) {
    window.location.href = '/index.html?error=unauthorized';
    return;
  }

  // 2. Check config for DEMO_MODE badge
  let isDemoMode = false;
  try {
    const configRes = await fetchConfig();
    isDemoMode = Boolean(configRes.data?.demoMode);
  } catch (_) {}

  renderUserProfile(currentUser, isDemoMode);

  // 3. Load Step 1 GitHub Data
  loadGitHubData();

  // 4. Initial search (Step 2)
  const cityInput = document.getElementById('city-input');
  if (cityInput) {
    cityInput.value = 'London';
    performSearch('London');
  }

  // 5. Initial auxiliary telemetry (Step 3)
  refreshAuxiliaryData();

  // 6. Bind search form
  const form = document.getElementById('search-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      performSearch(cityInput.value);
    });
  }

  // 7. Bind units toggle
  const unitRadios = document.querySelectorAll('input[name="units"]');
  unitRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (currentSearchedCity) {
        performSearch(currentSearchedCity, radio.value);
      }
    });
  });

  // 8. Bind quick chips
  const quickChips = document.querySelectorAll('.chip-btn[data-city]');
  quickChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const city = chip.getAttribute('data-city');
      if (city) {
        if (cityInput) cityInput.value = city;
        performSearch(city);
      }
    });
  });

  // 9. Bind burst test button
  const burstBtn = document.getElementById('run-burst-btn');
  if (burstBtn) {
    burstBtn.addEventListener('click', executeBurstTest);
  }

  // 10. Bind error simulation buttons
  const errorBtns = document.querySelectorAll('.btn-error-sim[data-error]');
  errorBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-error');
      if (type) executeErrorSimulation(type);
    });
  });

  // 11. Bind real 404 test button
  const real404Btn = document.getElementById('test-real-404-btn');
  if (real404Btn) {
    real404Btn.addEventListener('click', async () => {
      try {
        await fetchWeather('NonExistentCityXYZ', 'metric');
      } catch (err) {
        renderErrorInspector(err.status, err.message, err.rawJson || {
          success: false,
          message: err.message,
          errors: err.errors || [err.message]
        });
      }
      refreshAuxiliaryData();
    });
  }

  // 12. Bind manual refresh buttons
  document.getElementById('refresh-limits-btn')?.addEventListener('click', refreshAuxiliaryData);
  document.getElementById('refresh-cache-btn')?.addEventListener('click', refreshAuxiliaryData);
  document.getElementById('refresh-log-btn')?.addEventListener('click', refreshAuxiliaryData);

  // 13. Bind logout
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    try {
      await logout();
    } catch (_) {}
    window.location.href = '/index.html';
  });
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
