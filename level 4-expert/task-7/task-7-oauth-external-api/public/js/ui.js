/**
 * UI Renderer and DOM Manipulation Module (ES Module).
 *
 * Security Invariant:
 * All dynamic data received from external APIs (GitHub, Open-Meteo, REST Countries) and user
 * inputs are strictly populated into the DOM via `element.textContent` or explicit DOM node
 * construction (`document.createElement`).
 * We NEVER use `innerHTML` for dynamic external content to prevent Cross-Site Scripting (DOM XSS).
 * Even if an attacker places a malicious payload in a GitHub username or city name, `textContent`
 * ensures the browser treats it exclusively as literal text.
 */

let activeRateLimitTimer = null;

/**
 * Update top navbar user profile and demo badge.
 */
export function renderUserProfile(user, isDemoMode = false) {
  const avatarEl = document.getElementById('user-avatar');
  const nameEl = document.getElementById('user-display-name');
  const handleEl = document.getElementById('user-username');
  const demoBadge = document.getElementById('demo-mode-badge');

  if (avatarEl && user.avatarUrl) {
    avatarEl.src = user.avatarUrl;
  }
  if (nameEl) {
    nameEl.textContent = user.displayName || user.username || 'Explorer';
  }
  if (handleEl) {
    handleEl.textContent = `@${user.username || 'user'}`;
  }
  if (demoBadge) {
    if (isDemoMode) {
      demoBadge.classList.remove('hidden');
    } else {
      demoBadge.classList.add('hidden');
    }
  }
}

/**
 * PANEL 1: Render GitHub User Profile (via OAuth Access Token).
 */
export function renderGitHubProfile(profile, xCache = 'MISS') {
  const loading = document.getElementById('github-profile-loading');
  const content = document.getElementById('github-profile-content');
  const cacheBadge = document.getElementById('github-profile-cache');

  if (loading) loading.classList.add('hidden');
  if (content) content.classList.remove('hidden');

  if (cacheBadge) {
    const isHit = String(xCache).toUpperCase() === 'HIT';
    cacheBadge.textContent = isHit ? '⚡ CACHE HIT' : '🌐 MISS';
    cacheBadge.className = `badge-cache ${isHit ? 'hit' : 'miss'}`;
  }

  const avatar = document.getElementById('gh-avatar');
  if (avatar && profile.avatarUrl) avatar.src = profile.avatarUrl;

  document.getElementById('gh-name').textContent = profile.name || profile.login;

  const loginLink = document.getElementById('gh-login');
  loginLink.textContent = `@${profile.login}`;
  loginLink.href = profile.profileUrl || '#';

  document.getElementById('gh-bio').textContent = profile.bio || 'No bio provided.';
  document.getElementById('gh-repos-count').textContent = profile.publicRepos ?? 0;
  document.getElementById('gh-followers').textContent = profile.followers ?? 0;
  document.getElementById('gh-following').textContent = profile.following ?? 0;

  // Render granted OAuth scopes
  const scopesContainer = document.getElementById('gh-scopes-badges');
  if (scopesContainer) {
    scopesContainer.innerHTML = '';
    const scopes = Array.isArray(profile.scopes) ? profile.scopes : ['read:user'];
    scopes.forEach((scope) => {
      const pill = document.createElement('span');
      pill.className = 'scope-pill';
      pill.textContent = scope;
      scopesContainer.appendChild(pill);
    });
  }
}

/**
 * PANEL 1: Render User Public Repositories (via OAuth Access Token).
 */
export function renderGitHubRepos(repos, xCache = 'MISS') {
  const loading = document.getElementById('github-repos-loading');
  const grid = document.getElementById('github-repos-grid');
  const cacheBadge = document.getElementById('github-repos-cache');

  if (loading) loading.classList.add('hidden');
  if (grid) grid.classList.remove('hidden');

  if (cacheBadge) {
    const isHit = String(xCache).toUpperCase() === 'HIT';
    cacheBadge.textContent = isHit ? '⚡ CACHE HIT' : '🌐 MISS';
    cacheBadge.className = `badge-cache ${isHit ? 'hit' : 'miss'}`;
  }

  if (!grid) return;
  grid.innerHTML = '';

  if (!Array.isArray(repos) || repos.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'card-desc';
    emptyMsg.textContent = 'No public repositories found for this account.';
    grid.appendChild(emptyMsg);
    return;
  }

  repos.forEach((repo) => {
    const card = document.createElement('div');
    card.className = 'repo-card';

    const header = document.createElement('div');
    header.className = 'repo-header';

    const titleLink = document.createElement('a');
    titleLink.className = 'repo-name';
    titleLink.textContent = repo.name;
    titleLink.href = repo.url;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener noreferrer';

    const stars = document.createElement('span');
    stars.className = 'repo-stars';
    stars.textContent = `★ ${repo.stars}`;

    header.appendChild(titleLink);
    header.appendChild(stars);

    const desc = document.createElement('p');
    desc.className = 'repo-desc';
    desc.textContent = repo.description || 'No description provided.';

    const footer = document.createElement('div');
    footer.className = 'repo-footer';
    footer.textContent = `Language: ${repo.language || 'Plain Text'}`;

    card.appendChild(header);
    card.appendChild(desc);
    card.appendChild(footer);

    grid.appendChild(card);
  });
}

/**
 * PANEL 2: Render Weather & Country Enriched Data.
 */
export function renderWeatherAndCountry(data, xCache = 'MISS', durationMs = 0) {
  // Update telemetry bar
  const heading = document.getElementById('result-city-heading');
  const cacheBadge = document.getElementById('weather-cache-badge');
  const latencyPill = document.getElementById('weather-response-time');

  if (heading) {
    heading.textContent = `${data.city}, ${data.country?.name?.common || data.countryCode}`;
  }

  if (cacheBadge) {
    const isHit = String(xCache).toUpperCase() === 'HIT';
    cacheBadge.textContent = isHit ? '⚡ CACHE HIT' : '🌐 CACHE MISS';
    cacheBadge.className = `badge-cache ${isHit ? 'hit' : 'miss'}`;
  }

  if (latencyPill) {
    latencyPill.textContent = `Response Time: ${durationMs} ms`;
  }

  // Current weather
  const current = data.current || {};
  const units = data.units || { temperature: '°C', windSpeed: 'km/h' };

  document.getElementById('weather-emoji').textContent = current.emoji || '☀️';
  document.getElementById('current-temp').textContent =
    current.temperature !== null ? Math.round(current.temperature) : '--';
  document.getElementById('current-temp-unit').textContent = units.temperature || '°C';
  document.getElementById('weather-desc').textContent = current.description || 'Clear';
  document.getElementById('current-feels-like').textContent =
    current.feelsLike !== null ? Math.round(current.feelsLike) : '--';
  document.getElementById('feels-unit').textContent = units.temperature || '°C';

  document.getElementById('current-humidity').textContent =
    current.humidity !== null ? `${current.humidity}%` : '--%';
  document.getElementById('current-wind').textContent =
    current.windSpeed !== null ? `${current.windSpeed} ${units.windSpeed}` : '--';

  const coords = data.coordinates || {};
  document.getElementById('geo-lat').textContent =
    coords.latitude !== undefined ? Number(coords.latitude).toFixed(4) : '--';
  document.getElementById('geo-lon').textContent =
    coords.longitude !== undefined ? Number(coords.longitude).toFixed(4) : '--';

  // Country metadata (handles graceful degradation if null)
  const countryContent = document.getElementById('country-content');
  const countryUnavailable = document.getElementById('country-unavailable');
  const country = data.country;

  if (country) {
    countryContent.classList.remove('hidden');
    countryUnavailable.classList.add('hidden');

    document.getElementById('country-flag-emoji').textContent = country.flagEmoji || '🏳️';
    const flagImg = document.getElementById('country-flag-img');
    if (country.flagUrl) {
      flagImg.src = country.flagUrl;
      flagImg.alt = country.flagAlt || `Flag of ${country.name?.common || 'country'}`;
      flagImg.classList.remove('hidden');
    } else {
      flagImg.classList.add('hidden');
    }

    document.getElementById('country-common-name').textContent = country.name?.common || data.countryCode;
    document.getElementById('country-official-name').textContent = country.name?.official || '';
    document.getElementById('country-capital').textContent = country.capital || 'N/A';
    document.getElementById('country-region').textContent = country.subregion
      ? `${country.region} (${country.subregion})`
      : country.region || 'N/A';
    document.getElementById('country-population').textContent =
      typeof country.population === 'number' ? country.population.toLocaleString() : 'N/A';

    const currenciesStr = Array.isArray(country.currencies) && country.currencies.length > 0
      ? country.currencies.map((c) => `${c.name} (${c.symbol || c.code})`).join(', ')
      : 'N/A';
    document.getElementById('country-currencies').textContent = currenciesStr;

    const languagesStr = Array.isArray(country.languages) && country.languages.length > 0
      ? country.languages.join(', ')
      : 'N/A';
    document.getElementById('country-languages').textContent = languagesStr;
  } else {
    // Degraded state: country metadata failed upstream
    countryContent.classList.add('hidden');
    countryUnavailable.classList.remove('hidden');
  }

  // 5-Day forecast cards
  const forecastContainer = document.getElementById('forecast-cards-container');
  if (forecastContainer) {
    forecastContainer.innerHTML = '';
    const forecastList = Array.isArray(data.forecast) ? data.forecast : [];

    forecastList.forEach((day) => {
      const card = document.createElement('div');
      card.className = 'forecast-card';

      let formattedDate = day.date;
      try {
        const d = new Date(day.date + 'T00:00:00');
        formattedDate = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      } catch (_) {}

      const dateEl = document.createElement('span');
      dateEl.className = 'forecast-date';
      dateEl.textContent = formattedDate;

      const emojiEl = document.createElement('span');
      emojiEl.className = 'forecast-emoji';
      emojiEl.textContent = day.emoji || '☀️';

      const descEl = document.createElement('span');
      descEl.className = 'forecast-desc';
      descEl.textContent = day.description || 'Clear';

      const tempsEl = document.createElement('div');
      tempsEl.className = 'forecast-temps';

      const maxSpan = document.createElement('span');
      maxSpan.className = 'forecast-max';
      maxSpan.textContent = day.tempMax !== null ? `↑ ${Math.round(day.tempMax)}${units.temperature}` : '--';

      const minSpan = document.createElement('span');
      minSpan.className = 'forecast-min';
      minSpan.textContent = day.tempMin !== null ? `↓ ${Math.round(day.tempMin)}${units.temperature}` : '--';

      tempsEl.appendChild(maxSpan);
      tempsEl.appendChild(minSpan);

      card.appendChild(dateEl);
      card.appendChild(emojiEl);
      card.appendChild(descEl);
      card.appendChild(tempsEl);

      forecastContainer.appendChild(card);
    });
  }
}

/**
 * PANEL 2: Render session search history chips.
 */
export function renderSearchHistory(historyItems, onSelectCity) {
  const container = document.getElementById('history-list');
  if (!container) return;
  container.innerHTML = '';

  if (!Array.isArray(historyItems) || historyItems.length === 0) {
    const emptySpan = document.createElement('span');
    emptySpan.className = 'empty-history-text';
    emptySpan.textContent = 'No cities searched during this session yet.';
    container.appendChild(emptySpan);
    return;
  }

  historyItems.forEach((item) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'history-chip';

    const citySpan = document.createElement('span');
    citySpan.textContent = item.city;

    const countryCodeSpan = document.createElement('span');
    countryCodeSpan.className = 'mono-text';
    countryCodeSpan.textContent = item.countryCode ? `(${item.countryCode})` : '';

    chip.appendChild(citySpan);
    if (item.countryCode) chip.appendChild(countryCodeSpan);

    chip.addEventListener('click', () => {
      if (typeof onSelectCity === 'function') onSelectCity(item.city);
    });

    container.appendChild(chip);
  });
}

/**
 * PANEL 3: Render Live Rate Limit Gauges.
 */
export function renderRateLimits(limits) {
  if (!limits) return;

  // 1. Strict Limiter (Max 20/min)
  const strict = limits.strict || { limit: 20, remaining: 20, resetSeconds: 60 };
  const strictPct = Math.max(0, Math.min(100, (strict.remaining / strict.limit) * 100));

  const strictBar = document.getElementById('strict-progress-bar');
  const strictText = document.getElementById('strict-quota-text');
  const strictReset = document.getElementById('strict-reset-text');

  if (strictBar) {
    strictBar.style.width = `${strictPct}%`;
    strictBar.className = `progress-bar-fill ${strictPct > 40 ? 'fill-green' : strictPct > 15 ? 'fill-amber' : 'fill-red'}`;
  }
  if (strictText) {
    strictText.textContent = `${strict.remaining} / ${strict.limit} remaining`;
  }
  if (strictReset) {
    strictReset.textContent = `Reset in: ${strict.resetSeconds}s`;
  }

  // 2. General Limiter (Max 100/15min)
  const general = limits.general || { limit: 100, remaining: 100, resetSeconds: 900 };
  const generalPct = Math.max(0, Math.min(100, (general.remaining / general.limit) * 100));

  const generalBar = document.getElementById('general-progress-bar');
  const generalText = document.getElementById('general-quota-text');
  const generalReset = document.getElementById('general-reset-text');

  if (generalBar) {
    generalBar.style.width = `${generalPct}%`;
    generalBar.className = `progress-bar-fill ${generalPct > 40 ? 'fill-blue' : generalPct > 15 ? 'fill-amber' : 'fill-red'}`;
  }
  if (generalText) {
    generalText.textContent = `${general.remaining} / ${general.limit} remaining`;
  }
  if (generalReset) {
    generalReset.textContent = `Reset in: ${general.resetSeconds}s`;
  }
}

/**
 * PANEL 3: Render Burst Test Statistics.
 */
export function renderBurstTestResults(results) {
  const box = document.getElementById('burst-results-box');
  if (box) box.classList.remove('hidden');

  document.getElementById('burst-count-200').textContent = results.okCount ?? 0;
  document.getElementById('burst-count-429').textContent = results.rateLimitedCount ?? 0;
  document.getElementById('burst-count-cache').textContent = results.cacheHitCount ?? 0;

  const msgEl = document.getElementById('burst-status-message');
  if (msgEl) {
    msgEl.textContent = `Burst completed: ${results.total} requests dispatched. ${results.rateLimitedCount} were rejected with HTTP 429 once strict threshold (20 req/min) was saturated.`;
  }
}

/**
 * PANEL 4: Render Error Inspector.
 */
export function renderErrorInspector(status, message, jsonBody) {
  const inspector = document.getElementById('error-inspector');
  if (inspector) inspector.classList.remove('hidden');

  const statusBadge = document.getElementById('inspector-status-badge');
  if (statusBadge) {
    statusBadge.textContent = String(status);
    statusBadge.className = `badge-status status-${status}`;
  }

  document.getElementById('inspector-message').textContent = message || 'Error triggered.';
  document.getElementById('inspector-json').textContent = JSON.stringify(jsonBody, null, 2);
}

/**
 * PANEL 5: Render In-Memory TTL Cache Statistics.
 */
export function renderCacheMetrics(healthData) {
  const cache = healthData?.cache || {};
  document.getElementById('cache-stat-size').textContent = `${cache.size ?? 0} / ${cache.maxSize ?? 150}`;
  document.getElementById('cache-stat-hits').textContent = cache.hits ?? 0;
  document.getElementById('cache-stat-misses').textContent = cache.misses ?? 0;
  document.getElementById('cache-stat-ratio').textContent = cache.hitRate ?? '0.0%';
  document.getElementById('cache-stat-uptime').textContent = healthData?.uptime ?? '0s';
}

/**
 * PANEL 5: Render Live Request Ring Buffer Table.
 */
export function renderRequestLogTable(logs) {
  const tbody = document.getElementById('log-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!Array.isArray(logs) || logs.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'table-empty';
    cell.textContent = 'No API calls recorded in this session yet.';
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  logs.forEach((item) => {
    const tr = document.createElement('tr');

    // Time (HH:MM:SS)
    const tdTime = document.createElement('td');
    tdTime.className = 'mono-text';
    tdTime.textContent = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : '--';

    // Method
    const tdMethod = document.createElement('td');
    const methodBadge = document.createElement('span');
    methodBadge.className = 'badge-subtle';
    methodBadge.textContent = item.method;
    tdMethod.appendChild(methodBadge);

    // Path
    const tdPath = document.createElement('td');
    tdPath.className = 'mono-text';
    tdPath.textContent = item.path;

    // Status
    const tdStatus = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = `badge-status status-${item.statusCode}`;
    statusBadge.textContent = item.statusCode;
    tdStatus.appendChild(statusBadge);

    // Latency
    const tdLatency = document.createElement('td');
    tdLatency.className = 'mono-text';
    tdLatency.textContent = `${item.durationMs}ms`;

    // Cache
    const tdCache = document.createElement('td');
    const cacheBadge = document.createElement('span');
    const cacheVal = String(item.cache || 'none').toUpperCase();
    if (cacheVal === 'HIT') {
      cacheBadge.className = 'badge-cache hit';
      cacheBadge.textContent = 'HIT';
    } else if (cacheVal === 'MISS') {
      cacheBadge.className = 'badge-cache miss';
      cacheBadge.textContent = 'MISS';
    } else {
      cacheBadge.className = 'badge-subtle';
      cacheBadge.textContent = '-';
    }
    tdCache.appendChild(cacheBadge);

    tr.appendChild(tdTime);
    tr.appendChild(tdMethod);
    tr.appendChild(tdPath);
    tr.appendChild(tdStatus);
    tr.appendChild(tdLatency);
    tr.appendChild(tdCache);

    tbody.appendChild(tr);
  });
}

/**
 * Display alert banner with live countdown for HTTP 429.
 */
export function showAlert(message, type = 'error', retryAfterSeconds = null) {
  const container = document.getElementById('status-container');
  if (!container) return;

  if (activeRateLimitTimer) {
    clearInterval(activeRateLimitTimer);
    activeRateLimitTimer = null;
  }
  container.innerHTML = '';

  const banner = document.createElement('div');
  banner.className = `alert-banner ${type === 'rate-limit' ? 'rate-limit' : type === 'warning' ? 'warning' : 'error'}`;

  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  banner.appendChild(messageSpan);

  if (type === 'rate-limit' && retryAfterSeconds && retryAfterSeconds > 0) {
    let remaining = retryAfterSeconds;
    const timerBadge = document.createElement('span');
    timerBadge.className = 'rate-limit-timer';
    timerBadge.textContent = `Retry available in ${remaining}s`;
    banner.appendChild(timerBadge);

    activeRateLimitTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(activeRateLimitTimer);
        activeRateLimitTimer = null;
        timerBadge.textContent = 'Limit reset! You may retry now.';
        timerBadge.style.color = '#34d399';
      } else {
        timerBadge.textContent = `Retry available in ${remaining}s`;
      }
    }, 1000);
  }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'chip-btn';
  closeBtn.textContent = '✕';
  closeBtn.style.marginLeft = 'auto';
  closeBtn.addEventListener('click', () => {
    if (activeRateLimitTimer) {
      clearInterval(activeRateLimitTimer);
      activeRateLimitTimer = null;
    }
    banner.remove();
  });
  banner.appendChild(closeBtn);

  container.appendChild(banner);
}

export function clearAlerts() {
  const container = document.getElementById('status-container');
  if (container) {
    if (activeRateLimitTimer) {
      clearInterval(activeRateLimitTimer);
      activeRateLimitTimer = null;
    }
    container.innerHTML = '';
  }
}
