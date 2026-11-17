# Task 1: Basic Server (Level 1: Beginner)

**Cognifyz Technologies Full Stack Development Internship**  
*Objective: HTML Structure and Basic Server Interaction*

---

## 📖 Project Overview

This project is an introduction to the fundamentals of full-stack web development. It demonstrates how a web client (browser) interacts with a backend server using **Node.js** and **Express**, how data submitted via an **HTML5 form** is processed on the server, and how dynamic web pages are generated and served back using **Server-Side Rendering (SSR)** with the **EJS** template engine.

### Core Learning Concepts
1. **Semantic HTML5:** Structuring forms with accessible labels, input validation, and semantic group containers (`<fieldset>`, `<legend>`).
2. **Express Server Lifecycle:** Setting up an HTTP server, routing, and static file serving.
3. **HTTP Request/Response Cycle:** Handling `GET` and `POST` methods and accessing URL-encoded form data via `req.body`.
4. **Server-Side Rendering (SSR):** Injecting server variables into HTML templates using EJS tags (`<%= %>`, `<%- %>`, and `<% %>`).
5. **Defensive Data Handling:** Safely processing varied data types (such as checkbox arrays, single strings, or undefined values).

---

## 📂 Folder Structure

```text
task-1-basic-server/
│
├── server.js              # Main Express server entry point, middleware, and route handlers
├── package.json           # Project metadata, dependencies (Express, EJS), and npm scripts
├── README.md              # Project documentation and setup guide
│
├── views/                 # EJS template views
│   ├── partials/          # Reusable layout partials
│   │   ├── header.ejs     # Document doctype, meta tags, head, and navigation bar
│   │   └── footer.ejs     # Main closing tag, footer content, and closing HTML tags
│   ├── index.ejs          # Home landing page with overview and navigation
│   ├── contact.ejs        # Comprehensive HTML form with various input types
│   ├── result.ejs         # SSR results page displaying submitted form data
│   └── 404.ejs            # 404 Not Found error page
│
└── public/                # Static assets served directly to the browser
    └── style.css          # Clean, modern, responsive CSS stylesheet
```

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js installed on your machine (v14 or higher recommended).
- npm (Node Package Manager) installed.

### Step-by-Step Instructions

1. **Navigate to the project folder:**
   ```bash
   cd task-1-basic-server
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```
   *This installs `express` and `ejs`, plus `nodemon` as a development dependency.*

3. **Start the server:**
   - **Production / Standard mode:**
     ```bash
     npm start
     ```
   - **Development mode (with auto-restart on changes):**
     ```bash
     npm run dev
     ```

4. **Open in your browser:**
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🛣️ Routes Table

| HTTP Method | Route URL   | View Rendered | Description |
| :---        | :---        | :---          | :---        |
| **GET**     | `/`         | `index.ejs`   | Displays the home page with an introduction to the internship task and quick links. |
| **GET**     | `/contact`  | `contact.ejs` | Displays the user contact form with validation indicators and styled inputs. |
| **POST**    | `/submit`   | `result.ejs` / `contact.ejs` | Receives and validates form data from `req.body`. Re-renders `contact.ejs` with status `400` if `name` or `email` are missing; otherwise renders `result.ejs` with the sanitized data and timestamp. |
| **ALL**     | `*` (Any unknown) | `404.ejs` | Catches any unmatched route, returning HTTP status `404` and a friendly error message. |

---

## ⚙️ How Server-Side Rendering (SSR) Works in This Project

In traditional static sites, HTML files are pre-written and sent as-is to the browser. In Single Page Applications (SPAs), raw JSON is sent to the client and rendered via client-side JavaScript.

In **Server-Side Rendering (SSR)** with EJS:
1. **The Request:** When a user submits the form at `/contact`, the browser packages all form inputs into the HTTP request body and sends a `POST` request to `/submit`.
2. **Server Processing:** `express.urlencoded({ extended: true })` parses the URL-encoded payload into a JavaScript object (`req.body`).
3. **Validation & Normalization:** `server.js` verifies that required fields exist, safely converts checkbox data into a clean array, and generates a formatted server timestamp.
4. **Template Interpolation:** Express calls `res.render('result', { user, submittedAt })`. The EJS engine reads `result.ejs`, inserts the variables into the placeholders (`<%= user.name %>`, etc.), executes loops (`list.forEach(...)`), and includes modular partials (`header.ejs`, `footer.ejs`).
5. **The Response:** A fully-formed HTML document containing the personalized data is generated entirely on the server and sent back to the browser.
6. **Security & Escaping:** EJS tags using `<%= %>` automatically escape HTML characters (such as `<` and `>`), protecting the application against cross-site scripting (XSS) attacks.

---

## 🧪 Testing and Verification Checklist

- [x] **Home Page:** Access `http://localhost:3000/` and verify layout and navigation links.
- [x] **Form Submission (Complete):** Fill in all fields on `/contact` and verify that `/submit` displays every field accurately.
- [x] **Checkbox Handling:**
  - Submit with *zero* checkboxes selected &rarr; Displays "No interests selected" without server crash.
  - Submit with *one* checkbox selected &rarr; Normalized into an array and displayed as a single badge.
  - Submit with *multiple* checkboxes selected &rarr; Iterated with `forEach` and displayed as badges.
- [x] **Validation Error:** Leave name or email empty &rarr; Re-renders `/contact` with status 400 and an error alert.
- [x] **404 Handling:** Visit a non-existent URL (e.g. `http://localhost:3000/invalid-page`) &rarr; 404 page renders with HTTP status 404.

