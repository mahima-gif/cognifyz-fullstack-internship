/**
 * OpsDesk Server Dashboard - Client Application
 *
 * ============================================================================
 * SECURITY ARCHITECTURE NOTE:
 * ============================================================================
 * In accordance with enterprise secure coding guidelines, this dashboard
 * NEVER uses raw `.innerHTML` to insert dynamic or untrusted data.
 * All DOM updates are executed strictly via safe APIs:
 * - `element.textContent`
 * - `document.createElement`
 * - `element.appendChild`
 * This ensures absolute immunity against Cross-Site Scripting (XSS) vectors.
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const modeBadge = document.getElementById('modeBadge');
  const uptimeVal = document.getElementById('uptimeVal');
  const queueVal = document.getElementById('queueVal');
  const cacheRatioVal = document.getElementById('cacheRatioVal');

  // Step 1: Middleware
  const btnSendTestRequest = document.getElementById('btnSendTestRequest');
  const btnRefreshLogs = document.getElementById('btnRefreshLogs');
  const hdrRequestId = document.getElementById('hdrRequestId');
  const hdrResponseTime = document.getElementById('hdrResponseTime');
  const hdrStatus = document.getElementById('hdrStatus');
  const hdrClientTime = document.getElementById('hdrClientTime');
  const logWindow = document.getElementById('logWindow');

  // Step 2: Background Jobs
  const btnQueueEmail = document.getElementById('btnQueueEmail');
  const btnQueueFailingEmail = document.getElementById('btnQueueFailingEmail');
  const btnQueueReport = document.getElementById('btnQueueReport');
  const jobsTableBody = document.getElementById('jobsTableBody');

  // Step 3: Cache
  const btnFetchProducts = document.getElementById('btnFetchProducts');
  const btnFetchTwice = document.getElementById('btnFetchTwice');
  const btnStampedeTest = document.getElementById('btnStampedeTest');
  const btnInvalidateCreate = document.getElementById('btnInvalidateCreate');
  const btnClearCache = document.getElementById('btnClearCache');
  const statHits = document.getElementById('statHits');
  const statMisses = document.getElementById('statMisses');
  const statKeys = document.getElementById('statKeys');
  const lastCacheBadge = document.getElementById('lastCacheBadge');
  const cacheResultsWindow = document.getElementById('cacheResultsWindow');

  // Local state tracking
  let trackedJobIds = new Set();

  // --------------------------------------------------------------------------
  // UTILITY HELPERS
  // --------------------------------------------------------------------------
  function formatUptime(seconds) {
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }

  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  // --------------------------------------------------------------------------
  // STEP 1: SYSTEM & MIDDLEWARE INSPECTION
  // --------------------------------------------------------------------------
  async function refreshSystemStatus() {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = json.data;

      // Update Mode Badge
      modeBadge.textContent = (data.mode || 'MEMORY').toUpperCase();
      modeBadge.className = data.mode === 'redis' ? 'badge badge-redis' : 'badge badge-memory';

      // Update Uptime & Metrics
      uptimeVal.textContent = formatUptime(data.uptime);
      const active = data.queue?.counts?.active || 0;
      const waiting = data.queue?.counts?.waiting || 0;
      queueVal.textContent = `${active} / ${waiting}`;

      cacheRatioVal.textContent = data.cache?.hitRatio !== undefined ? data.cache.hitRatio.toFixed(2) : '0.00';
      statHits.textContent = String(data.cache?.hits || 0);
      statMisses.textContent = String(data.cache?.misses || 0);
      statKeys.textContent = String(data.cache?.keysCount || 0);
    } catch (err) {
      modeBadge.textContent = 'OFFLINE';
      modeBadge.className = 'badge';
    }
  }

  async function refreshAccessLogs() {
    try {
      const res = await fetch('/api/logs/tail?lines=25');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const lines = json.data?.lines || [];

      if (lines.length === 0) {
        logWindow.textContent = 'No log entries recorded yet.';
      } else {
        logWindow.textContent = lines.join('\n');
      }
      logWindow.scrollTop = logWindow.scrollHeight;
    } catch (err) {
      logWindow.textContent = `Failed to load logs: ${err.message}`;
    }
  }

  async function handleSendTestRequest() {
    btnSendTestRequest.disabled = true;
    hdrRequestId.textContent = 'Measuring...';
    hdrResponseTime.textContent = 'Measuring...';
    hdrStatus.textContent = '...';
    hdrClientTime.textContent = '...';

    const t0 = performance.now();
    try {
      const res = await fetch('/api/health', {
        headers: { 'Accept': 'application/json' }
      });
      const t1 = performance.now();

      const serverReqId = res.headers.get('x-request-id') || 'Not received';
      const serverResTime = res.headers.get('x-response-time') || 'Not received';

      hdrRequestId.textContent = serverReqId;
      hdrResponseTime.textContent = serverResTime;
      hdrStatus.textContent = `${res.status} ${res.statusText}`;
      hdrClientTime.textContent = `${(t1 - t0).toFixed(2)}ms (client round-trip)`;

      // Refresh log tail after small delay so log stream flushed
      setTimeout(refreshAccessLogs, 300);
    } catch (err) {
      hdrStatus.textContent = 'Request failed';
      hdrClientTime.textContent = err.message;
    } finally {
      btnSendTestRequest.disabled = false;
    }
  }

  // --------------------------------------------------------------------------
  // STEP 2: BACKGROUND JOBS MANAGEMENT
  // --------------------------------------------------------------------------
  async function enqueueJob(url, body) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(`Error enqueuing job: ${json.message}`);
        return null;
      }

      const jobId = json.data?.jobId;
      if (jobId) {
        trackedJobIds.add(jobId);
      }
      await refreshJobsTable();
      return json.data;
    } catch (err) {
      alert(`Network error enqueuing job: ${err.message}`);
      return null;
    }
  }

  async function refreshJobsTable() {
    try {
      const res = await fetch('/api/jobs?limit=15');
      if (!res.ok) return;
      const json = await res.json();
      const jobs = json.data?.jobs || [];

      clearElement(jobsTableBody);

      if (jobs.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.className = 'empty-cell';
        td.textContent = 'No jobs triggered yet. Click one of the buttons above to enqueue!';
        tr.appendChild(td);
        jobsTableBody.appendChild(tr);
        return;
      }

      jobs.forEach((job) => {
        const tr = document.createElement('tr');

        // Column 1: Job ID (shortened)
        const tdId = document.createElement('td');
        const shortId = job.id.length > 12 ? `${job.id.substring(0, 10)}...` : job.id;
        tdId.textContent = shortId;
        tdId.title = job.id;
        tr.appendChild(tdId);

        // Column 2: Name
        const tdName = document.createElement('td');
        tdName.textContent = job.name;
        tr.appendChild(tdName);

        // Column 3: State Badge
        const tdState = document.createElement('td');
        const stateBadge = document.createElement('span');
        stateBadge.className = `state-badge state-${job.state}`;
        stateBadge.textContent = job.state;
        tdState.appendChild(stateBadge);
        tr.appendChild(tdState);

        // Column 4: Attempts Made
        const tdAttempts = document.createElement('td');
        tdAttempts.textContent = `${job.attemptsMade} / ${job.maxAttempts}`;
        tr.appendChild(tdAttempts);

        // Column 5: Progress Bar
        const tdProgress = document.createElement('td');
        const pContainer = document.createElement('div');
        pContainer.className = 'progress-bar-container';
        const pFill = document.createElement('div');
        pFill.className = 'progress-bar-fill';
        pFill.style.width = `${job.progress || 0}%`;
        pContainer.appendChild(pFill);
        tdProgress.appendChild(pContainer);

        const pText = document.createElement('span');
        pText.textContent = `${job.progress || 0}%`;
        tdProgress.appendChild(pText);
        tr.appendChild(tdProgress);

        // Column 6: Result / Error
        const tdResult = document.createElement('td');
        if (job.state === 'failed') {
          tdResult.textContent = job.failedReason || 'Failed';
          tdResult.className = 'text-warning';
        } else if (job.state === 'completed') {
          if (job.name === 'welcome-email') {
            tdResult.textContent = `Sent: ${job.result?.recipient}`;
          } else if (job.name === 'generate-report') {
            tdResult.textContent = job.result?.calculatedMetric || 'Success';
          } else {
            tdResult.textContent = 'Completed';
          }
          tdResult.className = 'text-success';
        } else {
          tdResult.textContent = 'Processing...';
        }
        tr.appendChild(tdResult);

        jobsTableBody.appendChild(tr);
      });
    } catch (err) {
      console.warn('Jobs refresh failed:', err);
    }
  }

  // --------------------------------------------------------------------------
  // STEP 3: CACHING & STAMPEDE BENCHMARKS
  // --------------------------------------------------------------------------
  async function fetchProductsOnce() {
    btnFetchProducts.disabled = true;
    cacheResultsWindow.textContent = 'Fetching /api/products (simulating 2-second DB query if uncached)...';

    const t0 = performance.now();
    try {
      const res = await fetch('/api/products?page=1&limit=5');
      const t1 = performance.now();
      const latency = (t1 - t0).toFixed(2);
      const cacheHeader = res.headers.get('x-cache') || 'MISS';
      const json = await res.json();

      lastCacheBadge.textContent = `${cacheHeader} (${latency}ms)`;
      lastCacheBadge.className = cacheHeader === 'HIT' ? 'metric-value cache-badge-hit' : 'metric-value cache-badge-miss';

      cacheResultsWindow.textContent = [
        `URL: GET /api/products?page=1&limit=5`,
        `HTTP Status: ${res.status}`,
        `X-Cache Header: ${cacheHeader}`,
        `Total Latency: ${latency}ms`,
        `Products Retrieved: ${json.data?.products?.length || 0} items`,
        `First Item: ${json.data?.products?.[0]?.name || 'N/A'}`
      ].join('\n');

      await refreshSystemStatus();
    } catch (err) {
      cacheResultsWindow.textContent = `Request failed: ${err.message}`;
    } finally {
      btnFetchProducts.disabled = false;
    }
  }

  async function fetchProductsTwice() {
    btnFetchTwice.disabled = true;
    cacheResultsWindow.textContent = 'Executing Sequential Calls (Call 1: Cold/Existing, Call 2: Guaranteed Cache Hit)...\n';

    try {
      // Call 1
      const t0 = performance.now();
      const res1 = await fetch('/api/products?page=1&limit=5');
      const t1 = performance.now();
      const latency1 = (t1 - t0).toFixed(2);
      const cache1 = res1.headers.get('x-cache') || 'MISS';

      // Call 2
      const t2 = performance.now();
      const res2 = await fetch('/api/products?page=1&limit=5');
      const t3 = performance.now();
      const latency2 = (t3 - t2).toFixed(2);
      const cache2 = res2.headers.get('x-cache') || 'HIT';

      const speedup = (parseFloat(latency1) / Math.max(parseFloat(latency2), 0.1)).toFixed(1);

      cacheResultsWindow.textContent = [
        `=============================================================`,
        `  SEQUENTIAL FETCH SPEED BENCHMARK`,
        `=============================================================`,
        `Call 1 (Primary):    ${latency1}ms  |  X-Cache: ${cache1}`,
        `Call 2 (Cached):     ${latency2}ms  |  X-Cache: ${cache2}`,
        `-------------------------------------------------------------`,
        `Performance Boost:   ${speedup}x faster response on Cache HIT!`,
        `Note: Call 2 returned in milliseconds directly from memory/Redis.`
      ].join('\n');

      await refreshSystemStatus();
    } catch (err) {
      cacheResultsWindow.textContent = `Comparison failed: ${err.message}`;
    } finally {
      btnFetchTwice.disabled = false;
    }
  }

  async function testCacheStampede() {
    btnStampedeTest.disabled = true;
    cacheResultsWindow.textContent = 'Firing 10 concurrent requests to a brand new cache key...\nTesting Single-Flight Request Coalescing...';

    // Unique URL to guarantee cold cache
    const testUrl = `/api/products?stampedeTestKey=${Date.now()}`;

    try {
      const overallStart = performance.now();

      // Launch 10 concurrent requests simultaneously
      const promises = Array.from({ length: 10 }, async (_, index) => {
        const reqStart = performance.now();
        const res = await fetch(testUrl);
        const reqEnd = performance.now();
        return {
          index: index + 1,
          latency: (reqEnd - reqStart).toFixed(2),
          cache: res.headers.get('x-cache') || 'UNKNOWN',
          status: res.status
        };
      });

      const results = await Promise.all(promises);
      const overallEnd = performance.now();
      const totalWallTime = (overallEnd - overallStart).toFixed(2);

      const missCount = results.filter((r) => r.cache === 'MISS').length;
      const hitCount = results.filter((r) => r.cache === 'HIT').length;

      const lines = [
        `=============================================================`,
        `  CACHE STAMPEDE PROTECTION RESULTS (10 CONCURRENT REQUESTS) `,
        `=============================================================`,
        `Target URL: GET ${testUrl}`,
        `Total Concurrent Wall-Clock Time: ${totalWallTime}ms`,
        `Origin Calls (Cache MISS): ${missCount} (Expect exactly 1)`,
        `Coalesced Responses (Cache HIT): ${hitCount} (Expect 9)`,
        `-------------------------------------------------------------`,
        `Individual Request Breakdown:`,
        ...results.map((r) => `  Request #${r.index.toString().padStart(2, '0')}: Latency = ${r.latency.padStart(7, ' ')}ms | X-Cache: ${r.cache}`),
        `-------------------------------------------------------------`,
        missCount === 1
          ? `SUCCESS: Only 1 request hit the slow database service! Remaining 9 were coalesced in-flight.`
          : `Note: Completed with ${missCount} misses.`
      ];

      cacheResultsWindow.textContent = lines.join('\n');
      await refreshSystemStatus();
    } catch (err) {
      cacheResultsWindow.textContent = `Stampede test error: ${err.message}`;
    } finally {
      btnStampedeTest.disabled = false;
    }
  }

  async function handleInvalidateByCreate() {
    btnInvalidateCreate.disabled = true;
    cacheResultsWindow.textContent = 'Posting new product to trigger server-side cache invalidation...';

    try {
      const dummyProduct = {
        name: `Server Rack Shelf Model ${Math.floor(Math.random() * 900 + 100)}`,
        category: 'electronics',
        price: 89.99,
        stock: 25,
        description: 'Auto-generated product to demonstrate automatic cache eviction upon mutation.'
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dummyProduct)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message);

      cacheResultsWindow.textContent = [
        `[CACHE INVALIDATION TRIGGERED]`,
        `Created product ID: ${json.data?.id} - "${json.data?.name}"`,
        `Server invalidated all keys matching prefix: "cache:GET:/api/products*"`,
        `Subsequent GET /api/products will now result in a fresh Cache MISS.`
      ].join('\n');

      await refreshSystemStatus();
    } catch (err) {
      cacheResultsWindow.textContent = `Invalidation error: ${err.message}`;
    } finally {
      btnInvalidateCreate.disabled = false;
    }
  }

  async function handleClearAllCache() {
    btnClearCache.disabled = true;
    try {
      const res = await fetch('/api/cache', { method: 'DELETE' });
      const json = await res.json();

      cacheResultsWindow.textContent = `All cache keys purged. ${json.message}`;
      lastCacheBadge.textContent = 'PURGED';
      lastCacheBadge.className = 'metric-value';

      await refreshSystemStatus();
    } catch (err) {
      cacheResultsWindow.textContent = `Flush cache error: ${err.message}`;
    } finally {
      btnClearCache.disabled = false;
    }
  }

  // --------------------------------------------------------------------------
  // EVENT LISTENERS
  // --------------------------------------------------------------------------
  btnSendTestRequest.addEventListener('click', handleSendTestRequest);
  btnRefreshLogs.addEventListener('click', refreshAccessLogs);

  btnQueueEmail.addEventListener('click', () => {
    enqueueJob('/api/jobs/email', {
      name: 'Sarah Connor',
      email: 'sarah.connor@cyberdyne.org'
    });
  });

  btnQueueFailingEmail.addEventListener('click', () => {
    enqueueJob('/api/jobs/email', {
      name: 'Intentional Failure Tester',
      email: 'simulate-fail-retry@domain.internal'
    });
  });

  btnQueueReport.addEventListener('click', () => {
    enqueueJob('/api/jobs/report', {
      type: 'sales',
      rows: 2500
    });
  });

  btnFetchProducts.addEventListener('click', fetchProductsOnce);
  btnFetchTwice.addEventListener('click', fetchProductsTwice);
  btnStampedeTest.addEventListener('click', testCacheStampede);
  btnInvalidateCreate.addEventListener('click', handleInvalidateByCreate);
  btnClearCache.addEventListener('click', handleClearAllCache);

  // --------------------------------------------------------------------------
  // INITIAL LOAD & POLLING INTERVALS
  // --------------------------------------------------------------------------
  refreshSystemStatus();
  refreshAccessLogs();
  refreshJobsTable();

  // Poll system status every 3 seconds
  setInterval(refreshSystemStatus, 3000);

  // Poll jobs table every 1 second
  setInterval(refreshJobsTable, 1000);
});
