# SecureTasks - Database Integration & User Authentication

**Cognifyz Full Stack Development Internship — Level 3 (Advanced) | Task 6**

A production-grade, multi-user task management application built with **Node.js**, **Express**, and **MongoDB with Mongoose**. Features comprehensive Role-Based Access Control (RBAC), secure HTTP-Only JWT authentication, bcrypt password hashing, robust defensive middleware, and an interactive vanilla JavaScript front end.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Folder Structure](#folder-structure)
3. [Architecture & Security Principles](#architecture--security-principles)
   - [Authentication vs. Authorization](#authentication-vs-authorization)
   - [How the JWT Flow Works](#how-the-jwt-flow-works)
   - [Password Protection with bcrypt](#password-protection-with-bcrypt)
   - [Security Layers & Attack Defense Matrix](#security-layers--attack-defense-matrix)
4. [Step-by-Step Setup Guide](#step-by-step-setup-guide)
   - [Prerequisites](#prerequisites)
   - [Option A: Local MongoDB Community Server](#option-a-local-mongodb-community-server)
   - [Option B: MongoDB Atlas (Cloud)](#option-b-mongodb-atlas-cloud)
   - [Database Seeding](#database-seeding)
5. [API Documentation](#api-documentation)
6. [cURL Examples](#curl-examples)
7. [Running Automated Tests](#running-automated-tests)
8. [Front-End Guide](#front-end-guide)

---

## Project Overview

**SecureTasks** is designed to address the three foundational requirements of secure web services:
1. **Database Integration**: Scalable data modeling and persistence using MongoDB and Mongoose schemas, with validation, timestamps, and indexing.
2. **Server-Side Authentication**: Registration, login, and session persistence utilizing JSON Web Tokens (JWT) distributed via secure, `httpOnly`, `sameSite` cookies and Bearer headers.
3. **Endpoint Authorization**: Role-Based Access Control (User vs. Admin) and strict ownership verification to prevent horizontal privilege escalation and unauthorized resource manipulation.

---

## Folder Structure

```
task-6-auth-database/
├── .env.example              # Environment variables template with local/Atlas examples
├── .gitignore                # Excludes node_modules, .env, and test binary cache
├── package.json              # Project metadata, scripts, and dependencies
├── server.js                 # Application entry point: initializes database & starts server
├── app.js                    # Express app configuration & middleware pipeline (exported for tests)
├── README.md                 # Complete documentation and setup guide
├── src/
│   ├── config/
│   │   └── db.js             # Mongoose database connection with diagnostics & error handling
│   ├── models/
│   │   ├── User.js           # User schema (name, email, password hashing hook, role)
│   │   └── Task.js           # Task schema (title, description, status, priority, dueDate, owner)
│   ├── controllers/
│   │   ├── auth.controller.js   # register, login, logout, getMe handlers
│   │   ├── tasks.controller.js  # CRUD, pagination, filtering, search, and user stats
│   │   └── admin.controller.js  # User management, cascade deletion, and system-wide task audit
│   ├── middleware/
│   │   ├── auth.js           # verifyToken & requireRole middlewares
│   │   ├── validate.js       # express-validator result handler & ObjectId validator
│   │   ├── sanitize.js       # NoSQL injection protection (recursive $ and . stripper)
│   │   ├── errorHandler.js   # Centralized error handler converting Mongoose & JWT errors
│   │   └── notFound.js       # Standardized 404 handler for unmatched routes
│   └── utils/
│       ├── AppError.js       # Custom operational error class
│       ├── asyncHandler.js   # Async/await promise wrapper for controllers
│       └── seedAdmin.js      # CLI script to seed an initial administrator account
├── public/
│   ├── login.html            # Sign-in portal with client validation & server error display
│   ├── register.html         # User registration with password complexity enforcement
│   ├── dashboard.html        # Main user portal: task cards, modal forms, status toggles, stats
│   ├── admin.html            # Admin-only portal: registered users table & global tasks audit
│   ├── css/
│   │   └── styles.css        # Responsive, modern CSS variables design system
│   └── js/
│       ├── api.js            # Fetch wrapper with credentials and unified error formatting
│       ├── auth.js           # Client-side session verification, login, register, and logout
│       ├── dashboard.js      # Dashboard controller, filter/search debounce, XSS-safe DOM rendering
│       ├── admin.js          # Admin console controller & cascade delete confirmations
│       └── ui.js             # Reusable toast notifications, modal helpers, date formatters
└── tests/
    ├── auth.test.js          # Automated tests for register, login, sessions, rate limits, NoSQL injection
    └── tasks.test.js         # Automated tests for task CRUD, ownership isolation, RBAC, cascade delete
```

---

## Architecture & Security Principles

### Authentication vs. Authorization

| Concept | Definition | In SecureTasks |
| :--- | :--- | :--- |
| **Authentication (AuthN)** | *"Who are you?"* — Verifying the identity of the user. | `POST /api/auth/login` checks email and bcrypt password hash, then issues a signed JWT token. |
| **Authorization (AuthZ)** | *"What are you allowed to do?"* — Verifying permissions and ownership. | `verifyToken` confirms the user is logged in; `requireRole('admin')` restricts admin routes; task queries filter by `owner: req.user._id`. |

### How the JWT Flow Works

1. **Client Sends Credentials**: Client sends `{ email, password }` to `POST /api/auth/login`.
2. **Server Verification**: The server queries the database including the password hash (`+password`), runs `bcrypt.compare(password, user.password)`.
3. **Token Creation**: Upon match, the server signs a JWT payload containing `{ id: user._id, role: user.role }` using `process.env.JWT_SECRET` with an expiration (e.g., `1d`).
4. **Token Transmission**:
   - Set as an **`httpOnly`, `sameSite: 'lax'` cookie** in the HTTP response (`token`). This protects against Cross-Site Scripting (XSS) because JavaScript cannot read `document.cookie`.
   - Also returned in the JSON body for native HTTP clients (cURL, mobile apps, or Postman) to use via the standard `Authorization: Bearer <token>` header.
5. **Subsequent Protected Requests**: The client automatically sends the cookie with every request (or includes `Authorization: Bearer <token>`).
6. **Verification Middleware**: `verifyToken` inspects the cookie or Bearer header, validates the signature and expiration, retrieves the user from MongoDB, and attaches them to `req.user`.

```
[Client]                                              [Server / Express]
   |                                                          |
   |--- POST /api/auth/login { email, password } ----------->|
   |                                                          |-- bcrypt.compare()
   |                                                          |-- jwt.sign({ id, role })
   |<-- 200 OK + Set-Cookie: token=... (httpOnly) ------------|
   |                                                          |
   |--- GET /api/tasks (Cookie sent automatically) ---------->|
   |                                                          |-- jwt.verify()
   |                                                          |-- User.findById(decoded.id)
   |                                                          |-- req.user = user
   |<-- 200 OK { tasks: [...] } ------------------------------|
```

### Password Protection with bcrypt

- Passwords are **never stored in plaintext**.
- We use `bcryptjs` with a **work factor (cost) of 12**, meaning it performs $2^{12} = 4096$ hashing rounds.
- Each password receives a unique, cryptographically random **salt**, defending against pre-computed Rainbow Table attacks.
- In Mongoose, `select: false` on the `password` field guarantees the hash is never retrieved in normal queries (`User.find()`, `User.findById()`), preventing accidental exposure in logs or JSON serializations.
- When serializing to JSON, `User.toJSON()` strips `password` and `__v`.

### Security Layers & Attack Defense Matrix

| Security Mechanism | What it Defends Against | Implementation Details |
| :--- | :--- | :--- |
| **`helmet`** | Clickjacking, MIME sniffing, Cross-Site Scripting (XSS). | Injects standard secure HTTP headers (`X-Content-Type-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, etc.). |
| **`httpOnly` Cookie** | Token theft via XSS. | Client-side JavaScript cannot read `token` cookie via `document.cookie`. |
| **`textContent` Rendering** | Stored & Reflected Cross-Site Scripting (XSS). | User data (`title`, `description`, `name`) is injected strictly via DOM `.textContent`, treating markup as harmless plaintext. |
| **NoSQL Injection Sanitizer** | MongoDB Query Operator Injection (e.g. `{"email": {"$gt": ""}}`). | Recursively strips any keys starting with `$` or containing `.` from `req.body`, `req.query`, and `req.params`. |
| **`express-rate-limit`** | Brute force password guessing & DoS on auth routes. | Restricts IP addresses to 10 authentication requests per 15-minute window on `/api/auth/register` and `/api/auth/login`. |
| **Body Size Limit (10kb)** | Buffer overflow and payload flooding Denial-of-Service (DoS). | `express.json({ limit: '10kb' })` rejects oversized payloads with 413 Payload Too Large. |
| **CORS Policy** | Unauthorized cross-domain resource requests. | Restricts access to configured origins with explicit credential support. |
| **Mass Assignment Protection** | Privilege escalation & record tampering. | Hardcodes `role: 'user'` on registration; whitelist helper in `tasks.controller.js` accepts only `title`, `description`, `status`, `priority`, `dueDate`. Client cannot inject `owner` or `role`. |
| **Information Disclosure Protection** | Resource enumeration / ID harvesting. | If User B requests User A's task, the API responds with **404 Not Found** (instead of 403 Forbidden), concealing the existence of the ID. |
| **Uniform Auth Failure Message** | User account enumeration. | Returns `"Invalid email or password"` identically for non-existent emails and wrong passwords. |
| **Startup Secret Strength Check** | Weak cryptographic signing. | The server refuses to boot if `JWT_SECRET` is missing or shorter than 32 characters. |

---

## Step-by-Step Setup Guide

### Prerequisites
- **Node.js** (v18.0.0 or higher; v20.x recommended)
- **npm** (v9.x or higher)
- A running instance of **MongoDB** (Local Community Server or free MongoDB Atlas cluster)

---

### Option A: Local MongoDB Community Server

1. **Install MongoDB**:
   - **Windows**: Download and install [MongoDB Community Server](https://www.mongodb.com/try/download/community-edition). Ensure "Install MongoDB as a Service" is checked.
   - **macOS**: `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`
   - **Linux (Ubuntu/Debian)**: `sudo systemctl start mongod`
2. **Configure Environment Variables**:
   In `task-6-auth-database/`, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Ensure `MONGO_URI` is set to:
   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/securetasks_db
   PORT=5000
   JWT_SECRET=super_secret_jwt_key_that_is_at_least_32_characters_long_12345
   JWT_EXPIRES_IN=1d
   COOKIE_SECURE=false
   ADMIN_EMAIL=admin@securetasks.com
   ADMIN_PASSWORD=AdminSecurePass123!
   ```
3. **Start the Application**:
   ```bash
   npm start
   # or for auto-reloading during development:
   npm run dev
   ```

---

### Option B: MongoDB Atlas (Cloud)

1. **Create an Atlas Account**:
   - Visit [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and register for a free M0 tier cluster.
2. **Configure Database Access (User)**:
   - In Atlas left sidebar, navigate to **Security** -> **Database Access**.
   - Click **Add New Database User**. Choose **Password** authentication.
   - Enter a username (e.g., `dbadmin`) and a secure password (e.g., `MyAtlasPass2026!`). Set privileges to "Read and write to any database".
3. **Configure Network Access (IP Whitelist)**:
   - Navigate to **Security** -> **Network Access**.
   - Click **Add IP Address**. For development, select **Allow Access from Anywhere** (`0.0.0.0/0`) or add your current public IP address.
4. **Obtain Connection String**:
   - In **Deployment** -> **Database**, click **Connect** on your cluster.
   - Choose **Drivers** (Node.js). Copy the connection URI:
     `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
5. **Configure `.env`**:
   Replace the placeholders in your `.env`:
   ```env
   MONGO_URI=mongodb+srv://dbadmin:MyAtlasPass2026!@cluster0.abcde.mongodb.net/securetasks_db?retryWrites=true&w=majority
   ```
6. **Start the Server**:
   ```bash
   npm start
   ```

---

### Database Seeding

To generate an initial administrator account based on `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`:
```bash
npm run seed
```
Output:
```
[Seed] Connecting to database...
[Seed] Connected to database successfully.
[Seed Success] Admin user created successfully:
  Name:  System Administrator
  Email: admin@securetasks.com
  Role:  admin
[Seed] Disconnected from database. Seed process complete.
```

---

## API Documentation

All responses conform to the standard structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation description",
  "errors": []
}
```

| Method | Endpoint | Auth Required | Role | Request Body | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | No | Public | `{ name, email, password }` | Register new user. Role is forced to `'user'`. |
| `POST` | `/api/auth/login` | No | Public | `{ email, password }` | Authenticate, return JWT, and set `token` cookie. |
| `POST` | `/api/auth/logout` | No | Public | None | Clears the `token` HTTP cookie. |
| `GET` | `/api/auth/me` | Yes | Any | None | Returns profile of currently authenticated user. |
| `GET` | `/api/tasks` | Yes | Any | Query: `status`, `priority`, `search`, `sort`, `page`, `limit` | Returns paginated tasks owned by current user. |
| `GET` | `/api/tasks/stats` | Yes | Any | None | Returns aggregate task metrics (by status & priority). |
| `GET` | `/api/tasks/:id` | Yes | Any (Owner/Admin) | None | Get task by ID (returns 404 if owned by another user). |
| `POST` | `/api/tasks` | Yes | Any | `{ title, description?, status?, priority?, dueDate? }` | Create a new task. `owner` is set to current user. |
| `PUT` | `/api/tasks/:id` | Yes | Any (Owner/Admin) | `{ title?, description?, status?, priority?, dueDate? }` | Full/partial update of task fields. |
| `PATCH`| `/api/tasks/:id` | Yes | Any (Owner/Admin) | `{ status?, ... }` | Partial update (e.g. status transition). |
| `DELETE`| `/api/tasks/:id` | Yes | Any (Owner/Admin) | None | Permanently delete task. |
| `GET` | `/api/admin/users` | Yes | Admin | None | List all registered users with their task counts. |
| `DELETE`| `/api/admin/users/:id` | Yes | Admin | None | Delete user and cascade delete all their tasks. |
| `GET` | `/api/admin/tasks` | Yes | Admin | None | List all tasks across all users in the system. |

---

## cURL Examples

### 1. Register a New User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Developer",
    "email": "jane@example.com",
    "password": "SecurePassword123!"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "jane@example.com",
    "password": "SecurePassword123!"
  }'
```

### 3. Get Current User Profile (`/me`)
```bash
# Using cookie jar:
curl -X GET http://localhost:5000/api/auth/me -b cookies.txt

# Or using Bearer token:
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

### 4. Create a Task
```bash
curl -X POST http://localhost:5000/api/tasks \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete Database Integration",
    "description": "Connect MongoDB and verify connection diagnostics",
    "priority": "high",
    "status": "in-progress",
    "dueDate": "2026-11-20"
  }'
```

### 5. Get User Tasks with Filtering and Search
```bash
curl -X GET "http://localhost:5000/api/tasks?status=in-progress&priority=high&search=Database" \
  -b cookies.txt
```

### 6. Get Task Aggregate Statistics
```bash
curl -X GET http://localhost:5000/api/tasks/stats \
  -b cookies.txt
```

### 7. Update a Task Status
```bash
curl -X PATCH http://localhost:5000/api/tasks/<TASK_ID> \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

### 8. Delete a Task
```bash
curl -X DELETE http://localhost:5000/api/tasks/<TASK_ID> \
  -b cookies.txt
```

### 9. Admin: View All Users & Task Counts
```bash
curl -X GET http://localhost:5000/api/admin/users \
  -b cookies.txt
```

### 10. Admin: View All System Tasks
```bash
curl -X GET http://localhost:5000/api/admin/tasks \
  -b cookies.txt
```

### 11. Admin: Delete User (Cascade Task Deletion)
```bash
curl -X DELETE http://localhost:5000/api/admin/users/<TARGET_USER_ID> \
  -b cookies.txt
```

### 12. Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -b cookies.txt
```

---

## Running Automated Tests

The automated test suite runs completely in memory using `mongodb-memory-server` and Node's native test runner (`node --test`). **No real MongoDB installation or external database is required.**

```bash
npm test
```

### Test Coverage Highlights:
- User registration success and password hashing verification
- 409 Conflict for duplicate email registration
- 400 Bad Request for weak passwords
- Rejection of client-attempted privilege escalation (`role: 'admin'`)
- Login verification with valid credentials
- Timing-safe generic 401 error for both unknown email and incorrect password
- Authentication via HTTP-only cookie and via `Authorization: Bearer` header
- 401 Unauthorized for missing, invalid, or expired tokens
- NoSQL Injection protection against malicious query operator objects (`{"$gt": ""}`)
- Complete task CRUD operations for the task owner
- Horizontal privilege isolation: User B attempting to view, update, or delete User A's task receives **404 Not Found**
- Malformed ObjectId parameter validation returning 400 Bad Request instead of 500
- Role-Based Access Control: Normal users receiving 403 Forbidden on `/api/admin/*`
- Admin privileges on `/api/admin/*`
- Administrative cascade deletion of user tasks and self-deletion prevention

---

## Front-End Guide

Open your browser to [http://localhost:5000](http://localhost:5000).

- **`login.html`**: Form validation, error toast, redirect to dashboard.
- **`register.html`**: Name, email, and password complexity matching backend regex.
- **`dashboard.html`**: Responsive task cards, add/edit modal, quick status cycle button (`pending` -> `in-progress` -> `completed`), delete modal, search debounce, status & priority filters, sorting, and pagination.
- **`admin.html`**: Dedicated administrative console showing registered users, task counts per user, cascade deletion with safeguards, and global task inspection.
- **Security Guarantee**: All dynamically rendered strings utilize `element.textContent` rather than `innerHTML`, eliminating Stored Cross-Site Scripting (XSS) risks.
