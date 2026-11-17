# TaskFlow — RESTful API & Front-End Interaction

> **Cognifyz Technologies Full Stack Development Internship**  
> **Level 3 (Advanced) — Task 5:** *API Integration and Front-End Interaction*  
> **Objective:** Introduce full server-client communication through a clean, robust, and standards-compliant RESTful API.

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Folder Structure](#folder-structure)
4. [Installation & Setup](#installation--setup)
5. [REST Architectural Principles](#rest-architectural-principles)
6. [API Specification & Documentation](#api-specification--documentation)
7. [cURL Command Examples](#curl-command-examples)
8. [Data Layer & Concurrency Control](#data-layer--concurrency-control)
9. [Frontend Design & Security (XSS Defense)](#frontend-design--security-xss-defense)
10. [Automated Testing](#automated-testing)

---

## 💡 Project Overview

**TaskFlow** is a modern task management system featuring a layered Node.js/Express backend exposing RESTful CRUD endpoints and an asynchronous, responsive vanilla JavaScript (ES modules) client.

The application satisfies the three core competencies of Task 5:
1. **RESTful API Endpoints**: Full CRUD support (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) with filtering, searching, sorting, pagination, and real-time statistics aggregation.
2. **Front-End Interface**: A responsive dashboard with real-time stats, dynamic task cards, modal dialogs, toast notifications, search/filter controls, and connection-recovery error handling.
3. **Data Fetching & DOM Synchronization**: Vanilla JavaScript `fetch` consuming server endpoints with async/await, centralized API abstraction, and strict XSS defense using `textContent`.

---

## 🛠 Tech Stack

- **Backend**: Node.js (v20+), Express.js
- **Persistence**: JSON file persistence (`data/tasks.json`) via `node:fs/promises` with sequential write-locking (no database required until Task 6)
- **Utilities**: `uuid` (v4 UUID generation), `cors` (Cross-Origin Resource Sharing), `morgan` (HTTP request logging)
- **Frontend**: Vanilla HTML5, CSS3 (CSS Variables, Flexbox, CSS Grid), Vanilla JavaScript (ES6 Modules)
- **Testing**: Built-in `node:test` and `node:assert` runner

---

## 📁 Folder Structure

```text
task-5-rest-api/
├── .gitignore                   # Excludes node_modules and transient artifacts
├── package.json                 # Project configuration, dependencies, and npm scripts
├── README.md                    # Comprehensive documentation and API manual
├── server.js                    # Express app initialization, middleware pipeline, static server
├── data/
│   └── tasks.json               # JSON file database seeded with initial tasks
├── src/
│   ├── routes/
│   │   └── tasks.routes.js      # RESTful route definitions and middleware bindings
│   ├── controllers/
│   │   └── tasks.controller.js  # HTTP request/response handlers and JSON response formatting
│   ├── services/
│   │   └── tasks.service.js     # Data layer: fs/promises I/O and write serialization queue
│   └── middleware/
│       ├── validateTask.js      # Payload validation rules (create, replace, patch, UUID format)
│       ├── errorHandler.js      # Global error handler (prevents stack trace disclosure)
│       └── notFound.js          # Standardized 404 handler for unknown /api routes
├── public/                      # Static assets served by Express
│   ├── index.html               # Main single-page application UI structure
│   ├── css/
│   │   └── styles.css           # Modern dark-mode responsive design system
│   └── js/
│       ├── app.js               # Application coordinator, event listeners, state management
│       ├── api.js               # Centralized fetch wrapper and error normalizer
│       └── ui.js                # DOM rendering, modals, toasts, and XSS-safe textContent
└── tests/
    ├── api.test.js              # 15 automated integration tests for CRUD, filters, validation
    └── concurrency.test.js      # Concurrency stress tests verifying write serialization
```

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18.0.0 or higher, v20+ recommended)
- npm (v9.0.0 or higher)

### 1. Clone & Navigate
```bash
cd task-5-rest-api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Development Server
```bash
npm run dev
```
*Or run in production mode:*
```bash
npm start
```

The server will bind to port `3000` (or `process.env.PORT`):
- **Web UI**: [http://localhost:3000](http://localhost:3000)
- **API Collection**: [http://localhost:3000/api/tasks](http://localhost:3000/api/tasks)
- **API Stats**: [http://localhost:3000/api/tasks/stats](http://localhost:3000/api/tasks/stats)

### 4. Execute Automated Test Suite
```bash
npm test
```

---

## 🏛 REST Architectural Principles Used

1. **Resource-Oriented URIs**: Endpoints are organized around nouns (`/api/tasks`, `/api/tasks/:id`) representing resources rather than actions or verbs.
2. **Uniform Interface & Standard HTTP Verbs**:
   - `GET`: Safe, idempotent retrieval of resource collections or single items.
   - `POST`: Non-idempotent creation of new resources, returning status `201 Created` with a `Location` header pointing to the new resource.
   - `PUT`: Idempotent, complete replacement of an existing resource.
   - `PATCH`: Idempotent, partial modification of specified attributes.
   - `DELETE`: Idempotent removal of a resource, returning `200 OK` (with status envelope).
3. **Consistent Response Envelope**:
   Every API response strictly follows the standardized schema:
   ```json
   {
     "success": true,
     "data": { ... },
     "message": "Human-readable status summary",
     "errors": []
   }
   ```
4. **Appropriate Status Codes**:
   - `200 OK`: Request succeeded.
   - `201 Created`: Resource successfully created.
   - `400 Bad Request`: Validation failure, invalid UUID, or malformed JSON.
   - `404 Not Found`: Target resource or endpoint does not exist.
   - `500 Internal Server Error`: Unhandled server exception (stack trace logged server-side only).
5. **Route Precedence & Dynamic Parameters**:
   The `/api/tasks/stats` endpoint is defined *before* dynamic parameterized route `/:id`. In Express, routing runs sequentially; placing `/:id` first would cause Express to treat `"stats"` as an ID, triggering UUID validation errors.

---

## 📖 API Specification & Documentation

| Method | Endpoint | Query / Body Parameters | Success Response | Error Responses |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks` | `status`, `priority`, `search`, `sort`, `order`, `page`, `limit` | `200 OK`<br>`{ success: true, data: { tasks: [...], pagination: { total, page, limit, totalPages } }, ... }` | `500 Internal Server Error` |
| `GET` | `/api/tasks/stats` | None | `200 OK`<br>`{ success: true, data: { total, pending, in-progress, completed, overdue }, ... }` | `500 Internal Server Error` |
| `GET` | `/api/tasks/:id` | Route param `:id` (UUID) | `200 OK`<br>`{ success: true, data: { id, title, ... }, ... }` | `400 Bad Request` (Invalid UUID)<br>`404 Not Found` |
| `POST` | `/api/tasks` | Body JSON: `title` (req, 3-100), `description` (opt, max 500), `status` (opt), `priority` (opt), `dueDate` (opt) | `201 Created` + `Location` Header<br>`{ success: true, data: { id, title, ... }, ... }` | `400 Bad Request` (Validation errors, Malformed JSON) |
| `PUT` | `/api/tasks/:id` | Route param `:id`, Body JSON: `title` (req), `status` (req), `priority` (req), `description`, `dueDate` | `200 OK`<br>`{ success: true, data: { ...replacedTask }, ... }` | `400 Bad Request`<br>`404 Not Found` |
| `PATCH` | `/api/tasks/:id` | Route param `:id`, Body JSON: any subset of `title`, `description`, `status`, `priority`, `dueDate` | `200 OK`<br>`{ success: true, data: { ...updatedTask }, ... }` | `400 Bad Request`<br>`404 Not Found` |
| `DELETE` | `/api/tasks/:id` | Route param `:id` (UUID) | `200 OK`<br>`{ success: true, data: null, message: "Task deleted successfully", errors: [] }` | `400 Bad Request`<br>`404 Not Found` |

---

## 💻 cURL Command Examples

### 1. List Tasks (with Search, Filter, Sort, & Pagination)
```bash
curl -X GET "http://localhost:3000/api/tasks?status=pending&priority=high&page=1&limit=5&sort=createdAt&order=desc"
```

### 2. Retrieve Task Statistics
```bash
curl -X GET "http://localhost:3000/api/tasks/stats"
```

### 3. Create a New Task (POST)
```bash
curl -i -X POST "http://localhost:3000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement Redis Cache Layer",
    "description": "Add in-memory caching for high frequency stats queries.",
    "status": "pending",
    "priority": "high",
    "dueDate": "2026-12-01T18:00:00.000Z"
  }'
```

### 4. Retrieve a Specific Task by ID (GET)
```bash
curl -X GET "http://localhost:3000/api/tasks/11111111-1111-4111-8111-111111111111"
```

### 5. Replace a Task Fully (PUT)
```bash
curl -X PUT "http://localhost:3000/api/tasks/11111111-1111-4111-8111-111111111111" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design RESTful API Schema - Revised",
    "description": "Updated schema specifications including pagination and error shapes.",
    "status": "completed",
    "priority": "high",
    "dueDate": "2026-11-15T12:00:00.000Z"
  }'
```

### 6. Partially Update a Task (PATCH)
```bash
curl -X PATCH "http://localhost:3000/api/tasks/11111111-1111-4111-8111-111111111111" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in-progress"
  }'
```

### 7. Delete a Task (DELETE)
```bash
curl -X DELETE "http://localhost:3000/api/tasks/11111111-1111-4111-8111-111111111111"
```

### 8. Malformed JSON Body (Error Simulation: 400 Bad Request)
```bash
curl -X POST "http://localhost:3000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{"title": "Broken JSON missing brace'
```

---

## 🔒 Data Layer & Concurrency Control

Because Node.js runs asynchronous non-blocking I/O operations on the event loop, multiple concurrent HTTP write requests (such as simultaneous `POST` or `DELETE` requests) can introduce **race conditions** when operating directly on `data/tasks.json`.

If Request A and Request B read the file simultaneously before Request A writes back to disk, Request B's subsequent write will overwrite and obliterate Request A's data (the classic "lost update" anomaly).

**Solution**:  
`src/services/tasks.service.js` enforces a sequential Promise-based execution queue (`enqueueWrite`). Every mutating disk operation chains onto an active Promise chain, ensuring that every read-modify-write operation executes with exclusive mutual exclusion in FIFO order without corrupted or truncated JSON.

---

## 🛡 Frontend Design & Security (XSS Defense)

- **Strict XSS Immunity**: User input rendered into the DOM (e.g. titles, descriptions, status badges, and error strings) is assigned strictly using the DOM property `element.textContent` or `document.createTextNode()`. Raw `innerHTML` is never used for dynamic user strings. This ensures any HTML tags (`<script>`, `<img>`, etc.) are rendered as harmless literal characters.
- **Centralized API Client (`public/js/api.js`)**: Encapsulates `fetch` calls, manages headers, parses JSON, and normalizes error states.
- **Resilience**: Displays a connection alert with an interactive **"↻ Retry Connection"** button if the server is stopped or unreachable.

---

## 🧪 Automated Testing

The automated test suite in `tests/api.test.js` and `tests/concurrency.test.js` covers:
- Collection listing & pagination metadata
- Status and priority filtering
- Case-insensitive search
- Dynamic sorting & ordering
- Aggregated real-time metrics (`/stats`)
- Single resource retrieval
- Resource creation with status `201` and `Location` header
- Validation failures (missing title, title < 3 chars, invalid status/priority)
- Full replacement (`PUT`) & partial updates (`PATCH`)
- Deletion (`DELETE`) & subsequent `404` verification
- Parameter format validation (`400` on invalid UUID)
- Malformed JSON payload handling (`400` on invalid JSON syntax)
- Concurrent burst writes (15 simultaneous requests without corruption)

Run all tests:
```bash
npm test
```

