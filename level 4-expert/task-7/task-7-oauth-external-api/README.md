# 🌐 CityPulse Dashboard — Full-Stack API Showcase & OAuth 2.0 Integration

[![Node.js Version](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Task Level](https://img.shields.io/badge/Cognifyz-Level%204%20(Expert)-orange.svg)](https://cognifyz.com/)
[![Tests](https://img.shields.io/badge/Tests-29%20Passing-brightgreen.svg)]()

**CityPulse Dashboard** is an enterprise-grade full-stack project built for **Task 7 (Level 4: Expert)** of the Cognifyz Technologies Full Stack Development internship: *"Advanced API Usage and External API Integration."*

This upgraded **API Showcase** turns the dashboard into a visual, interactive demonstration where an examiner or reviewer can visibly witness all three required internship steps working in real time:
- **Step 1**: Investigate concepts like OAuth for secure API authentication (GitHub OAuth 2.0 Authorization Code Grant, CSRF `state` protection, server-side token usage for GitHub User & Repo APIs).
- **Step 2**: Integrate external APIs (Open-Meteo Geocoding & 5-Day Forecast, REST Countries Geopolitical Metadata, and GitHub REST API).
- **Step 3**: Implement advanced API features (dual-tier rate limiting with 25-request burst testing, in-memory LRU TTL caching with sub-millisecond `X-Cache: HIT` telemetry, on-demand controlled error simulations, and an authenticated 25-request ring buffer log).

---

## 📑 Table of Contents

1. [What Changed (Showcase Upgrade)](#-what-changed-showcase-upgrade)
2. [Why Server-Side OAuth Tokens are Essential](#-why-server-side-oauth-tokens-are-essential)
3. [Showcase Architecture & The 5 Panels](#-showcase-architecture--the-5-panels)
4. [Interactive 3-Minute Demo Script](#-interactive-3-minute-demo-script)
5. [Complete API Documentation Table](#-complete-api-documentation-table)
6. [How to Register a GitHub OAuth App](#-how-to-register-a-github-oauth-app)
7. [Getting Started & Installation](#-getting-started--installation)
8. [Automated Test Suite (29 Tests)](#-automated-test-suite-29-tests)

---

## 🚀 What Changed (Showcase Upgrade)

| Component | Previous Baseline | Upgraded API Showcase |
| :--- | :--- | :--- |
| **OAuth 2.0 Usage** | Used only for initial login | Stored server-side in session to actively query **GitHub Profile API** and **GitHub Repositories API** |
| **Token Security** | Minimal session serialization | Hardened invariant: Access token **NEVER** reaches browser, devtools, or logs |
| **Rate Limiting** | Passive background middleware | Live quota progress meters + **25-Request Concurrent Burst Test Button** saturating limits to trigger HTTP 429 with `Retry-After` countdown |
| **Error Handling** | Only triggered on broken inputs | **Interactive 5-Error Simulation Console** (`400 Bad Input`, `404 Not Found`, `504 Timeout`, `502 Upstream Crash`, `503 Rate Limit`) |
| **Request Observability** | Console logs only | Authenticated **In-Memory Ring Buffer (last 25 calls)** table showing timestamp, path, status badge, latency (ms), and cache state |
| **UI Experience** | Simple weather cards | Responsive **5-Panel Sticky Showcase** with visual OAuth flow diagram, responsive meters, and cache badges |

---

## 🔒 Why Server-Side OAuth Tokens are Essential

A common security vulnerability in novice OAuth implementations is passing the OAuth access token to the browser (e.g. storing it in `localStorage`, `sessionStorage`, or frontend state).

### The Risks of Client-Side Tokens:
1. **Cross-Site Scripting (XSS) Vulnerability**: Any compromised third-party npm package, CDN script, or injection bug can read `localStorage` or `document.cookie` and exfiltrate the user's GitHub token to an attacker's command-and-control server.
2. **Permanent Scope Hijacking**: Once an attacker steals a client token, they can impersonate the user against the GitHub API directly from any machine until the token is revoked.

### The CityPulse Server-Side Defense:
- **Delegated Confidential Client Flow**: The OAuth Authorization Code is exchanged for the access token solely over a secure back-channel connection (`POST https://github.com/login/oauth/access_token`) between CityPulse's Express server and GitHub.
- **Session-Only Confinement**: The token is stored exclusively inside the server's encrypted session memory (`express-session`). The client browser receives only a cryptographically signed, random session identifier (`citypulse.sid`) marked:
  - `httpOnly: true`: Unreadable by client JavaScript (`document.cookie` returns nothing).
  - `sameSite: 'lax'`: Defends against Cross-Site Request Forgery (CSRF).
  - `secure: true`: Enforced automatically over HTTPS in production.
- **Zero Token Leakage Guarantee**: The access token is completely absent from all API endpoints (`/api/me`, `/api/github/profile`, `/api/github/repos`, error handlers, and request logs).

---

## 🖥️ Showcase Architecture & The 5 Panels

```text
CityPulse Dashboard (Sticky Navigation)
 ├── Panel 1: Step 1 - OAuth 2.0 Authentication & GitHub API
 │    ├── GitHub User Profile (via server-held OAuth token)
 │    ├── Visual OAuth 2.0 Authorization Code Flow Diagram (Pure HTML/CSS)
 │    └── 6 Most Recent Public Repositories (/api/github/repos)
 │
 ├── Panel 2: Step 2 - External API Integration (Multi-Source)
 │    ├── Source 1: GitHub API (api.github.com)
 │    ├── Source 2: Open-Meteo Weather & 5-Day Forecast (open-meteo.com)
 │    ├── Source 3: REST Countries Geopolitical Metadata (restcountries.com)
 │    └── Session-Persisted Search History Chips
 │
 ├── Panel 3: Step 3 - Rate Limiting & Quota Defense
 │    ├── Live Quota Progress Meters (Strict 20/min & General 100/15min)
 │    ├── Reset Countdown Timers (seconds)
 │    └── Automated 25-Request Burst Test Button (Live 429 & Retry-After demonstration)
 │
 ├── Panel 4: Step 3 - Controlled Error Handling & Security Shielding
 │    ├── 400 Bad Input Simulation
 │    ├── 404 City Not Found Simulation
 │    ├── 504 Gateway Timeout Simulation
 │    ├── 502 Upstream 500 Crash Simulation
 │    ├── 503 Upstream 429 Rate Limit Simulation
 │    └── Real Nonexistent City Test with JSON Inspector & Security Check
 │
 └── Panel 5: Step 3 - In-Memory TTL Cache & Live Request Ring Buffer
      ├── Live Cache Metrics (/api/health: hits, misses, hit ratio %, uptime)
      └── Live Ring Buffer Table (last 25 authenticated API calls with latency & badges)
```

---

## 🎬 Interactive 3-Minute Demo Script

Follow this script during your internship video submission:

### 1. Landing Page & OAuth Login (0:00 - 0:45)
- Open `http://localhost:3000`.
- Show the landing page and explain the 3 requirements from Cognifyz Task 7.
- Click **"Continue with GitHub"** (or **"⚡ Try Demo Login"** if presenting before app registration).
- Explain that the client browser receives a secure, `httpOnly` session cookie while the token stays on the server.

### 2. Panel 1: Step 1 - OAuth 2.0 Authentication (0:45 - 1:20)
- Highlight the **GitHub User Profile card**: note that it was fetched using the stored OAuth token and displays granted scopes (`read:user`).
- Walk through the **Authorization Code Grant visualizer diagram** (explain why the random `state` parameter prevents CSRF attacks).
- Show the **Recent Public Repositories** loaded directly through the proxy.

### 3. Panel 2: Step 2 - External APIs & Caching (1:20 - 1:55)
- In the city search bar, search for **Paris** or **Tokyo**.
- Point out the three data sources:
  1. Open-Meteo (current temperature, weather emoji, 5-day daily forecast).
  2. REST Countries (capital, population, currencies, languages, flag).
  3. GitHub API metadata.
- Note the first request shows **`X-Cache: MISS`** with latency ~200-500ms.
- Click the same city again: observe the badge turns green to **`⚡ CACHE HIT (SERVED FROM MEMORY)`** with latency dropping to **< 3ms**!

### 4. Panel 3: Step 3 - Rate Limiting & Burst Test (1:55 - 2:25)
- Point to the live quota gauges (Strict limiter: 20/min; General limiter: 100/15min).
- Click **"🚀 Fire 25 Concurrent Requests"**.
- Watch the live burst counter: the first 20 requests succeed (HTTP 200), and the remaining 5 are immediately stopped with **HTTP 429 Too Many Requests**.
- Point out the `Retry-After` countdown timer that appears automatically.

### 5. Panel 4: Step 3 - Error Handling (2:25 - 2:45)
- Click each of the error simulation buttons (**400**, **404**, **504**, **502**, **503**).
- Point to the JSON error inspector box: show that the client receives a standardized, friendly JSON contract and **no stack traces, internal URLs, or passwords are leaked**.
- Click **"Real Weather 404 Check"** to show real-world error handling.

### 6. Panel 5: Step 3 - Cache & Request Log (2:45 - 3:00)
- Scroll to Panel 5: highlight the live in-memory cache hit ratio and metrics.
- Point to the **Request Ring Buffer Table**: show that all previous actions were recorded with exact duration in ms, status code badges, and cache results.
- Show `npm test` running in the terminal with **29 passing tests**.

---

## 📊 Complete API Documentation Table

All endpoints return a uniform JSON shape:
```json
{
  "success": true,
  "data": {},
  "message": "Optional human description",
  "errors": null
}
```

| Method | Endpoint | Auth | Purpose | Success (200) | Handled Errors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | ❌ Public | Uptime & cache statistics | `{ uptime, cache: { hits, misses, hitRate, size } }` | `500` |
| `GET` | `/api/config` | ❌ Public | Client UI feature flags | `{ demoMode: boolean, isOAuthConfigured: boolean }` | `500` |
| `GET` | `/auth/github` | ❌ Public | Initiates GitHub OAuth code flow | Redirects 302 to GitHub consent screen | `503` (if unconfigured) |
| `GET` | `/auth/github/callback` | ❌ Public | Code exchange & session setup | Redirects 302 to `/dashboard.html` | `401 / 503` |
| `POST` | `/auth/demo-login` | ❌ Public | Testing session (disabled in prod) | `{ id, username, displayName }` | `403` (in production) |
| `POST` | `/auth/logout` | ✅ Yes | Terminates session & clears cookie | `{ success: true, message: "Logged out" }` | `500` |
| `GET` | `/api/me` | ✅ Yes | Current authenticated user | `{ id, username, displayName, avatarUrl }` | `401` |
| `GET` | `/api/github/profile` | ✅ Yes | User profile via OAuth token | `{ login, name, bio, publicRepos, followers, scopes }` | `401, 503` |
| `GET` | `/api/github/repos` | ✅ Yes | 6 public repos via OAuth token | `[ { name, description, language, stars, url } ]` | `401, 503` |
| `GET` | `/api/limits` | ✅ Yes | Active quota state | `{ general: { limit, remaining }, strict: { limit, remaining } }` | `401` |
| `GET` | `/api/demo/error` | ✅ Yes | Controlled error simulation | Triggers specific production error | `400, 404, 502, 503, 504` |
| `GET` | `/api/request-log` | ✅ Yes | Ring buffer of last 25 calls | `[ { method, path, statusCode, durationMs, cache } ]` | `401` |
| `GET` | `/api/search-history` | ✅ Yes | Last 10 session searches | `[ { city, country, searchedAt } ]` | `401` |
| `GET` | `/api/weather` | ✅ Yes | Geocoding, weather & country | `{ city, coordinates, current, forecast, country }` | `400, 401, 404, 429, 502, 504` |
| `GET` | `/api/country/:code` | ✅ Yes | Standalone country metadata | `{ name, capital, population, currencies, flag }` | `400, 401, 404, 429` |

---

## 🔑 How to Register a GitHub OAuth App

1. Visit [GitHub Developer Settings > OAuth Apps](https://github.com/settings/developers).
2. Click **New OAuth App**:
   - **Application name**: `CityPulse Dashboard`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
3. Click **Register application**.
4. Copy your **Client ID** and click **Generate a new client secret** to copy your **Client Secret**.
5. Paste them into `task-7-oauth-external-api/.env`:
   ```env
   GITHUB_CLIENT_ID=your_github_client_id_here
   GITHUB_CLIENT_SECRET=your_github_client_secret_here
   ```
6. Restart the server (`npm start`).

---

## ⚡ Getting Started & Installation

```powershell
# 1. Enter the project directory
cd task-7-oauth-external-api

# 2. Install dependencies
npm install

# 3. Start the application
npm start
```
Visit `http://localhost:3000` in your browser.

---

## 🧪 Automated Test Suite (29 Tests)

Run the test suite with external APIs mocked:
```powershell
npm test
```

### Verified Test Categories:
- **Authentication & Security (Tests 1, 12, 15, 22)**: 401 on unauthenticated access; access tokens strictly excluded from all response payloads.
- **Input Validation (Test 2)**: 400 Bad Request on malformed cities and units.
- **External API Aggregation (Tests 3, 9, 13)**: Clean shape mapping, graceful degradation when REST Countries fails.
- **In-Memory Caching (Tests 4, 23-29)**: `X-Cache: HIT/MISS` verification, LRU capacity eviction, TTL expiration.
- **Error Mapping & Resilience (Tests 5, 6, 7, 8, 10, 17, 18, 20)**: Timeout (504), Upstream 500 retry (502), Rate limit mapping (503), token expiration (401), zero stack trace leaks.
- **Advanced Telemetry (Tests 11, 14, 16, 19, 21)**: Rate limit saturation (429), `/api/limits`, `/api/health`, sanitized request log ring buffer.
