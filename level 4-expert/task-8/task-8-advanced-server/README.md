# OpsDesk Server: Advanced Server-Side Architecture

> **Cognifyz Technologies Full Stack Development Internship**  
> **Level 4: Expert &mdash; Task 8: Advanced Server-Side Functionality**  
> **Author:** Cognifyz Intern | Senior Backend Engineering Submission

---

## 1. Project Overview

**OpsDesk Server** is a production-grade Node.js and Express backend showcasing advanced architectural patterns:
1. **Deterministic Middleware Pipeline:** Request correlation IDs, high-resolution response timing (`process.hrtime.bigint`), non-blocking sanitized audit logging, security headers (Helmet, CORS), and defensive payload sizing (10kb limit).
2. **Resilient Background Job Queue:** Decoupled asynchronous background processing with exponential backoff retries, concurrency constraints, real-time stage progress reporting, and idempotency guarantees.
3. **Optimized Server-Side Caching Layer:** TTL caching over simulated slow database queries, query parameter normalization, proactive cache invalidation on resource mutation (using SCAN, never KEYS), and Single-Flight request coalescing for Cache Stampede protection.
4. **Adaptive Dual-Driver Strategy (Windows & Cloud Friendly):** Works out-of-the-box in **MEMORY mode** (zero external dependencies, in-process queue and cache with embedded worker) and seamlessly switches to **REDIS mode** (BullMQ + ioredis with a dedicated worker process) when Redis is reachable.
5. **Interactive Operations Dashboard:** A vanilla HTML/CSS/JavaScript status dashboard with zero third-party UI libraries, built strictly adhering to enterprise XSS prevention rules (`textContent`, `createElement`, never raw `innerHTML`).

---

## 2. System Architecture Diagram

```
                              +-------------------------------------------------------+
                              |                  CLIENT REQUEST                       |
                              |   (Browser / Dashboard / API Consumer / Supertest)    |
                              +-------------------------------------------------------+
                                                         |
                                                         v
+=========================================================================================================+
|                                    EXPRESS MIDDLEWARE PIPELINE                                          |
|                                                                                                         |
|   1. requestId       -> Attaches UUID v4 to req.id and X-Request-Id header (preserves valid incoming)    |
|   2. responseTime    -> Injects X-Response-Time header using process.hrtime.bigint() before flush       |
|   3. requestLogger   -> Captures status, IP, sanitized URL on finish; appends to logs/access.log        |
|   4. security        -> Helmet (CSP, HSTS, frameguard) + CORS (exposed correlation headers)             |
|   5. bodyParsers     -> JSON & URL-encoded parser (10kb limit) with 400 & 413 error interceptors        |
+=========================================================================================================+
                                                         |
                                 +-----------------------+-----------------------+
                                 |                                               |
                                 v                                               v
     +-----------------------------------------------+   +-----------------------------------------------+
     |              JOBS CONTROLLER                  |   |             PRODUCTS CONTROLLER               |
     |         /api/jobs/email, /api/jobs/report     |   |             GET /api/products                 |
     +-----------------------------------------------+   +-----------------------------------------------+
                                 |                                               |
                                 v                                               v
               +-----------------------------------+           +-----------------------------------+
               |       QUEUE SERVICE DRIVER        |           |       CACHE SERVICE DRIVER        |
               +-----------------------------------+           +-----------------------------------+
                                 |                                               |
                +----------------+----------------+             +----------------+----------------+
                |                                 |             |                                 |
         [REDIS URL SET]                 [REDIS UNREACHABLE]   [REDIS URL SET]          [REDIS UNREACHABLE]
                |                                 |             |                                 |
                v                                 v             v                                 v
     +--------------------+            +--------------------+  +--------------------+   +--------------------+
     |   BullMQ Driver    |            |   Memory Driver    |  |   Redis Driver     |   |   Memory Driver    |
     | (Distributed Redis |            | (In-process queue, |  | (ioredis, SCAN key |   | (In-memory Map,    |
     |  Queue & Worker)   |            |  embedded worker)  |  |  invalidation)     |   |  TTL purge timer)  |
     +--------------------+            +--------------------+  +--------------------+   +--------------------+
                |                                 |             |                                 |
                v                                 v             v                                 v
     +--------------------+            +--------------------+  +--------------------+   +--------------------+
     | Standalone Worker  |            |  Embedded Worker   |  |  Fail-Open Fallback|   | Zero-Dependency    |
     | (npm run worker)   |            |  (Inside server)   |  | (Origin on outage) |   | Local Dev & Tests  |
     +--------------------+            +--------------------+  +--------------------+   +--------------------+
```

---

## 3. Why Middleware Order Matters

Express processes middleware strictly in the order they are mounted (`app.use`). The architectural rationale for our pipeline sequence is as follows:

1. **`requestId` (First):** Must execute before all other handlers. Every downstream middleware, log statement, database transaction, and error handler relies on `req.id` to correlate and trace operations.
2. **`responseTime` (Second):** Starts its high-resolution timer (`process.hrtime.bigint()`) immediately after the request ID is bound so it accounts for the true total wall-clock duration of the request (including body parsing and security checks). It overrides `res.writeHead` so the `X-Response-Time` header can be written before response headers are flushed.
3. **`requestLogger` (Third):** Binds a listener to the Node.js `res.on('finish')` event early. This guarantees that regardless of whether a request completes normally or aborts with an uncaught error, the event fires and records the final HTTP status code and duration into `logs/access.log`.
4. **`security` (Fourth):** Configures Helmet HTTP headers and verifies CORS origins before any expensive computation or disk I/O occurs. Unauthorized cross-origin requests are rejected early.
5. **`bodyParsers` (Fifth):** Parses JSON and URL-encoded payloads with a strict 10kb ceiling. Enforcing this after security shields the server from memory-exhaustion Denial-of-Service attacks. A custom error transformer converts `SyntaxError` and payload overflow errors into clean `400` and `413` responses.
6. **`express.static` (Sixth):** Serves status dashboard assets directly without routing overhead.
7. **`routes` (Seventh):** Executes business logic, schema validations (`express-validator`), caching logic, and job dispatching.
8. **`notFound` (Eighth):** Placed after all registered routes. Unmatched URLs fall into this handler to receive a standard JSON `404` error.
9. **`errorHandler` (Ninth / Last):** The central error handling function with 4 parameters `(err, req, res, next)`. Catches all operational and unexpected errors, ensures no stack traces leak to the client, and returns the uniform error schema containing `requestId`.

---

## 4. Background Job Queue & Worker Architecture

The task queue is abstracted behind a unified interface (`queueService`) supporting two driver implementations:
- **`MemoryQueueDriver`:** An in-process event-driven queue with concurrency management, exponential backoff timers, and job state machines. Automatically spins up an embedded worker inside `server.js`.
- **`BullMQQueueDriver`:** Distributed queue backed by Redis with BullMQ. In this mode, jobs are placed onto Redis by the API server and consumed by a separate process via `npm run worker`.

### Supported Job Types
1. **`welcome-email` (`email.job.js`):** Simulates sending a transactional email with an artificial 1.5-second delay. If the recipient email contains the substring `"fail"`, it intentionally throws an error to demonstrate retry mechanisms.
2. **`generate-report` (`report.job.js`):** Simulates a resource-intensive analytics job processing between 100 and 5,000 rows. It runs across 5 distinct stages over ~5 seconds, reporting progress (0% -> 25% -> 50% -> 75% -> 100%) and returns a calculated metrics summary.

### Reliability & Retries
- **Max Attempts:** 3 attempts per job.
- **Backoff Strategy:** Exponential backoff starting at 1,000ms ($1s \rightarrow 2s \rightarrow 4s$).
- **Concurrency:** Capped at 2 concurrent workers per instance.
- **Fail-Safe Worker:** Job errors are logged to console and stored in `failedReason` without crashing the worker process.
- **Retention Limits:** Auto-cleans completed and failed jobs (`removeOnComplete: 100`, `removeOnFail: 100`) to prevent unbounded memory growth.

### Idempotency
Clients can provide an optional `Idempotency-Key` header on `POST /api/jobs/email` and `POST /api/jobs/report`.
- If a job with that key already exists, the server returns HTTP `202 Accepted` with `isDuplicate: true` and the existing job ID, ensuring duplicate background tasks are never spawned.

---

## 5. Server-Side Caching Strategy

The caching system wraps database interactions with intelligent invalidation and stampede defense:

### TTL & Key Normalization
- All GET routes cached via `cacheMiddleware(ttlSeconds)` store the HTTP status and JSON response body.
- Keys are normalized deterministically: `cache:METHOD:/pathname?sorted_query_parameters`.
  For example, `/api/products?limit=10&page=1` and `/api/products?page=1&limit=10` produce the exact same key:
  `cache:GET:/api/products?limit=10&page=1`.

### Cache Stampede Protection (Single-Flight Request Coalescing)
- **The Problem:** When a heavily requested cache key expires or is queried concurrently for the first time, multiple requests simultaneously detect a cache miss and all execute the slow 2-second database query. This causes massive CPU spikes and database connection exhaustion.
- **The Solution:** An in-memory single-flight registry tracks active in-flight requests per cache key. If 10 concurrent requests arrive for an uncached key, only the **first request** hits the slow database service. The subsequent 9 requests attach to the ongoing Promise and share the exact same result. The database is hit exactly **once**.

### Safe Key Invalidation
- Creating (`POST /api/products`), updating (`PUT /api/products/:id`), or deleting (`DELETE /api/products/:id`) a product updates the database and immediately calls `cacheService.delByPrefix('cache:GET:/api/products')`.
- In Redis mode, invalidation utilizes non-blocking `SCAN` iteration (never the dangerous `KEYS` command which blocks the single-threaded Redis event loop).

### Fail-Open Resilience
- If Redis crashes or disconnects during production, the Redis cache driver catches the error, logs a single warning message (without spamming subsequent requests), and returns `null` (cache miss), allowing the application to serve directly from the database without crashing requests.

---

## 6. API Reference

All responses conform to a unified JSON response envelope:
```json
{
  "success": true,
  "data": { ... },
  "message": "Human-readable status message",
  "errors": [],
  "requestId": "optional-uuid"
}
```

| Method | Endpoint | Description | Cache / Behavior |
|---|---|---|---|
| `GET` | `/api/health` | System health, uptime, driver mode, queue counts, cache metrics | Uncached |
| `GET` | `/api/logs/tail?lines=20` | Retrieves the latest lines from `logs/access.log` (max 100) | Uncached |
| `GET` | `/api/cache/stats` | Cache hits, misses, hit ratio, active key count, and driver mode | Uncached |
| `DELETE` | `/api/cache` | Flushes all application cache keys (Admin/Demo shortcut) | Cache purge |
| `GET` | `/api/products` | Lists products with filtering (`?category=`, `?search=`, `?page=`, `?limit=`) | Cached 60s, Stampede Protected |
| `GET` | `/api/products/:id` | Retrieves product by ID | Cached 60s |
| `POST` | `/api/products` | Creates a new product | Invalidates product cache |
| `PUT` | `/api/products/:id` | Updates an existing product | Invalidates product cache |
| `DELETE` | `/api/products/:id` | Removes a product | Invalidates product cache |
| `POST` | `/api/jobs/email` | Enqueues welcome email task (`{ name, email }`, optional `Idempotency-Key`) | Returns `202 Accepted` |
| `POST` | `/api/jobs/report` | Enqueues report task (`{ type: "sales"\|"users", rows }`, optional `Idempotency-Key`) | Returns `202 Accepted` |
| `GET` | `/api/jobs/:id` | Checks state (`waiting`, `active`, `completed`, `failed`, `delayed`), progress, attempts | Uncached |
| `GET` | `/api/jobs` | Lists 20 most recent jobs and breakdown of state counts | Uncached |

---

## 7. Setup & Execution Guide

### Option A: In-Memory Mode (Zero Setup, No Redis Required)
OpsDesk works out of the box with zero external dependencies. The queue and worker run in the same process:

```bash
# 1. Navigate into project folder
cd task-8-advanced-server

# 2. Install dependencies
npm install

# 3. Start the server (runs in MEMORY mode automatically)
npm start
```
- Open `http://localhost:4000/` in your browser to view the Operations Dashboard.
- Both the HTTP server and the task worker run together automatically inside the same process.

---

### Option B: Redis Mode

If you have Redis or Docker available:

#### 1. Start Redis
- **Via Docker Desktop:**
  ```bash
  docker compose up -d
  ```
- **Via Windows Native (Memurai or Microsoft Redis Port):**  
  Start the Memurai / Redis service on port `6379`.
- **Via WSL2:**
  ```bash
  sudo service redis-server start
  ```

#### 2. Configure Environment
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Uncomment the `REDIS_URL` line:
```env
REDIS_URL=redis://127.0.0.1:6379
```

#### 3. Run API Server and Worker in Separate Terminals
Because Redis mode is distributed, run the API server and worker as separate processes:

- **Terminal 1 (HTTP Server):**
  ```bash
  npm start
  ```
- **Terminal 2 (Standalone Background Worker):**
  ```bash
  npm run worker
  ```

---

## 8. Running Automated Tests

The automated test suite runs in pure **MEMORY mode** with zero external dependencies:
```bash
npm test
```
The test suite validates:
1. `X-Request-Id` and `X-Response-Time` headers are always generated and attached.
2. Incoming valid `X-Request-Id` headers are preserved for distributed tracing.
3. Access log appends sanitized lines and never leaks sensitive query parameters, bodies, cookies, or auth tokens.
4. Malformed JSON returns `400 Bad Request` with structured error messages.
5. Large payloads (> 10kb) are cleanly rejected with `413 Payload Too Large`.
6. Input validation returns standardized `400` errors with field-level breakdowns.
7. Background jobs return `202 Accepted` and transition to `completed`.
8. `Idempotency-Key` prevents duplicate job creation and returns existing jobs.
9. Failing email jobs retry 3 times with exponential backoff and end as `failed` without crashing.
10. Report generation jobs report multi-stage incremental progress up to 100%.
11. Cache returns `MISS` on first fetch and `HIT` on second fetch with measurable speedup.
12. 10 concurrent requests to a cold cache key trigger exactly 1 database call (Stampede Protection).
13. Creating a product purges cached product queries.
14. Error responses (4xx, 5xx) are never saved to cache.
15. Cache stats retrieval and manual cache flush (`DELETE /api/cache`).

---

## 9. 3-Minute Video Demo Script

Follow this script for a video recording or live demonstration:

### [0:00 - 0:45] Introduction & Step 1: Middleware Pipeline
1. Open terminal and run `npm start`. Point out the startup log:
   `[System] REDIS_URL not configured. Running in MEMORY mode.`
   `[Queue] In-process worker started automatically (concurrency: 2).`
2. Open `http://localhost:4000/` in the browser. Show the **Mode Badge** in the header displaying `MEMORY`.
3. In **Step 1: Middleware Pipeline**, click **"Send Test Request"**:
   - Highlight the returned `X-Request-Id` (UUID v4) and high-resolution `X-Response-Time` (e.g. `1.24ms`).
   - Click **"Refresh Access Log"** to show the real-time line in `logs/access.log`.
   - Explain why middleware order matters (`requestId > responseTime > requestLogger > security > bodyParsers`).

### [0:45 - 1:45] Step 2: Background Task Queue
1. In **Step 2: Background Task Queue**, click **"Queue Welcome Email"**:
   - Show the row appear in the table with state `active`, then transition to `completed` in ~1.5 seconds.
2. Click **"Queue Failing Email (3 Retries + Backoff)"**:
   - Point out that the job starts, fails, transitions to `delayed` with backoff ($1s, 2s, 4s$), retries up to attempt `3 / 3`, and concludes as `failed` without crashing the server process.
3. Click **"Queue Sales Report (5s Progress)"**:
   - Watch the animated progress bar update in real-time from $0\% \rightarrow 25\% \rightarrow 50\% \rightarrow 75\% \rightarrow 100\%$.
4. Mention idempotency support via `Idempotency-Key` headers.

### [1:45 - 2:45] Step 3: Caching & Cache Stampede Defense
1. In **Step 3: Server-Side Caching**, click **"Fetch Products (Single)"**:
   - Show that it takes ~2000ms with a `MISS` badge (simulating database query).
2. Click **"Fetch Twice (Miss vs Hit Comparison)"**:
   - Show the benchmark: Call 1 takes ~2000ms (`MISS`), while Call 2 returns in ~2ms (`HIT`), demonstrating a ~1000x speedup.
3. Click **"Stampede Test (10 Concurrent Calls)"**:
   - Explain the Cache Stampede (thundering herd) problem.
   - Show that out of 10 concurrent requests to a brand new key, **exactly 1 hit origin (`MISS`)** and the other **9 were coalesced in-flight (`HIT`)**.
4. Click **"Add Product (Invalidate Cache)"**:
   - Demonstrate proactive cache invalidation using `SCAN`. The next fetch will result in a fresh `MISS`.

### [2:45 - 3:00] Conclusion & Redis Mode Capability
1. Briefly summarize that OpsDesk provides full enterprise reliability: middleware traceability, background queues, and caching.
2. Mention that setting `REDIS_URL` switches the engine to Redis mode with BullMQ and a dedicated worker (`npm run worker`), with built-in fail-open resilience.

---

## 10. License & Academic Attribution
Developed as part of the **Cognifyz Technologies Full Stack Web Development Internship** (Task 8: Advanced Server-Side Functionality). Released under the ISC License.
