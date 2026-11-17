# Task 2: Inline Styles, Basic Interaction, and Server-Side Validation

**Cognifyz Technologies &bull; Full Stack Web Development Internship (Level 1: Beginner)**

---

## 📖 Project Overview

This project is a beginner-level full-stack web application built using **Node.js**, **Express**, and **EJS**. It demonstrates the complete lifecycle of form validation across the client and server:

1. **Extended HTML5 Semantic Forms**: Implements multiple input types (text, email, tel, date, password, radio buttons, dropdown selects, checkboxes, and a bio textarea with a live character counter).
2. **Inline Styling (`style="..."`)**: Uses modular inline styling directly on HTML elements for layout, colors, responsive containers, box shadows, focus rings, and error borders without external CSS.
3. **Client-Side Validation & Interaction**: Employs inline JavaScript event handlers (`onblur`, `onfocus`, `oninput`, `onsubmit`, and `onchange`) inside `<script>` blocks to provide immediate visual feedback (red/green borders, error messages) and prevent invalid submissions.
4. **Server-Side Validation & Security**: Re-validates all rules on the Express backend, sanitizes inputs, handles duplicate email rejection, hashes passwords using `bcryptjs`, and retains non-sensitive values when re-rendering forms on error (HTTP 400).
5. **Temporary Server-Side Storage**: Stores validated users in an in-memory JavaScript array during server runtime and presents them in a secure, styled table (with passwords strictly excluded).

---

## 📂 Folder Structure

```text
task-2-validation/
├── server.js               # Main Express application, routes & server validation logic
├── package.json            # Node.js project manifest, dependencies & scripts
├── README.md               # Documentation, setup guide, route specs & validation matrix
├── test-runner.js          # Automated verification script testing all 9 required scenarios
└── views/                  # EJS view templates
    ├── partials/
    │   ├── header.ejs      # Common navigation bar & HTML <head> with inline styles
    │   └── footer.ejs      # Common footer with internship credits
    ├── index.ejs           # Landing page with architecture & conceptual guides
    ├── register.ejs        # Complex registration form with inline styles & inline JS
    ├── success.ejs         # Post-registration confirmation card (PRG pattern)
    ├── users.ejs           # Registered users table (or empty state) omitting passwords
    ├── 404.ejs             # Not found handler page (status 404)
    └── error.ejs           # Global 4-argument error handler page (status 500)
```

---

## 🛠️ Tech Stack & Dependencies

- **Runtime**: Node.js (v18+)
- **Web Framework**: [Express](https://expressjs.com/) (v4.21.1)
- **Templating Engine**: [EJS](https://ejs.co/) (v3.1.10)
- **Security / Hashing**: [bcryptjs](https://www.npmjs.com/package/bcryptjs) (v2.4.3)
- **Dev Tool**: [nodemon](https://www.npmjs.com/package/nodemon) (v3.1.7)

---

## 🚀 Setup & Execution Steps

### 1. Prerequisites
Ensure **Node.js** and **npm** are installed on your machine:
```bash
node -v
npm -v
```

### 2. Navigate to Project Directory
```bash
cd "level 1-beginner/task-2/task-2-validation"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start the Application
- **Production mode**:
  ```bash
  npm start
  ```
- **Development mode (with auto-reload on file changes)**:
  ```bash
  npm run dev
  ```
- **Run automated test suite**:
  ```bash
  npm test
  ```

### 5. Access the Web App in Your Browser
Open [http://localhost:3000](http://localhost:3000) in any web browser.

---

## 🌐 Routes Reference Table

| Method | Endpoint | Description | Status Code | View Template |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | Home page detailing the 4 required steps and validation theory. | `200 OK` | `views/index.ejs` |
| **GET** | `/register` | Renders blank registration form with no errors. | `200 OK` | `views/register.ejs` |
| **POST** | `/register` | Validates submitted form data on server. On error: re-renders form with preserved input. On success: hashes password, saves to in-memory array, and redirects. | `400 Bad Request` (on error)<br>`302 Found` (on success) | `views/register.ejs` (on error)<br>Redirects to `/success` |
| **GET** | `/success` | Success confirmation card showing the registered user's name. | `200 OK` | `views/success.ejs` |
| **GET** | `/users` | Displays all registered users in a responsive table. Passwords excluded. | `200 OK` | `views/users.ejs` |
| **ANY** | `*` (unknown) | Catches all undefined paths and displays custom 404 page. | `404 Not Found` | `views/404.ejs` |

---

## 📋 Comprehensive Validation Matrix

| Field | Input Type | Client-Side Rule (Inline JS) | Server-Side Rule (Express `validateRegistration`) | Error Message |
| :--- | :--- | :--- | :--- | :--- |
| **First Name** | `text` | Required, &ge; 2 chars, letters and spaces only (`/^[A-Za-z\s]{2,}$/`). | Trimmed, required, &ge; 2 chars, letters only. | `"First name is required."` / `"First name must be at least 2 characters."` / `"First name must contain letters only."` |
| **Last Name** | `text` | Required, &ge; 2 chars, letters and spaces only (`/^[A-Za-z\s]{2,}$/`). | Trimmed, required, &ge; 2 chars, letters only. | `"Last name is required."` / `"Last name must be at least 2 characters."` / `"Last name must contain letters only."` |
| **Email** | `email` | Required, valid regex pattern (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`). | Trimmed, lowercased, valid regex, **plus duplicate email check against `users` array (case-insensitive)**. | `"Email address is required."` / `"Please provide a valid email address..."` / `"This email is already registered."` |
| **Phone** | `tel` | Required, exactly 10 numeric digits (`/^\d{10}$/`). | Trimmed, required, regex check for exactly 10 digits (`/^\d{10}$/`). | `"Phone number is required."` / `"Phone number must be exactly 10 digits."` |
| **Date of Birth** | `date` | Required, valid date format, calculated age &ge; 13 years old. | Required, valid date, user age calculated against current date &ge; 13 years. | `"Date of birth is required."` / `"You must be at least 13 years old to register."` |
| **Password** | `password` | Required, &ge; 8 characters, at least 1 letter and 1 number (`/^(?=.*[A-Za-z])(?=.*\d).{8,}$/`). | Required, &ge; 8 characters, at least 1 letter and 1 number. Hashed with `bcryptjs` (salt 10) before storage. | `"Password is required."` / `"Password must be at least 8 characters long."` / `"Password must contain at least one letter and one number."` |
| **Confirm Password** | `password` | Required, exact string match with `password` value. | Required, must strictly equal `password`. Never retained in form re-renders. | `"Confirmation password is required."` / `"Passwords do not match."` |
| **Gender** | `radio` | Must select one radio option (`Male`, `Female`, `Other`, `Prefer not to say`). | Must match one of the allowed whitelist values. | `"Please select a gender option."` |
| **Country** | `select` | Dropdown value cannot be empty. | Must not be empty. | `"Please select your country."` |
| **Skills** | `checkbox` | At least 1 checkbox must be checked. | Normalized (handles undefined, string, or array); array length must be &ge; 1. | `"Please select at least one skill."` |
| **Bio** | `textarea` | Optional, max 200 characters with live counter. | Optional, trimmed, max length 200 characters. | `"Bio cannot exceed 200 characters."` |
| **Terms & Conditions** | `checkbox` | Checkbox must be checked. | Must be checked (`'on'`, `'true'`, or `true`). | `"You must agree to the Terms and Conditions to proceed."` |

---

## 🔄 The Complete Flow: Client &rarr; Server &rarr; Temporary Storage

```
[ User in Browser ]
       │
       ▼
1. User interacts with form fields (onfocus, onblur, oninput)
   - Real-time client feedback: green border on valid, red on error.
   - Live character count updates as user types bio.
   - Show/hide password checkbox toggles input type.
       │
       ▼
2. User clicks "Create Account" (onsubmit)
   - validateFullForm() verifies every field.
   - If invalid: submission blocked (return false), smooth scroll to first error.
   - If valid: form submitted via HTTP POST to /register.
       │
       ▼
3. Express Server receives POST /register
   - Why Server-Side Validation is Crucial:
     Client validation can be disabled or bypassed via cURL/Postman.
     The server independently re-validates all 12 rules to guarantee integrity.
   - Checks for duplicate emails against registered in-memory users.
   - Normalizes input formats (e.g., skills array).
       │
       ├─── [If Server Errors Found] ───► Responds with HTTP 400 Bad Request
       │                                  Re-renders register.ejs with error messages.
       │                                  Preserves user input (clears sensitive passwords).
       │
       ▼ [If Valid]
4. Security & Temporary Storage
   - Hashes password securely using bcryptjs (salt rounds: 10).
   - Generates ID and timestamp.
   - Appends user record to in-memory array `users = []`.
   - Issues 302 redirect to /success?name=... (Post-Redirect-Get pattern).
       │
       ▼
5. User views confirmation (/success) & checks User Directory (/users)
   - Stored records are displayed in a clean table.
   - Passwords and hashes are strictly excluded from output.
```
