# ProfileHub — Single Page Application (SPA)

> **Cognifyz Technologies Full Stack Internship**  
> **Level 2: Intermediate • Task 4:** Complex Form Validation and Dynamic DOM Manipulation

ProfileHub is a full-featured, framework-free single-page application (SPA) built with Vanilla JavaScript (ES Modules), CSS3, and Node.js/Express. It showcases advanced client-side form validation, real-time reactive DOM manipulation, and HTML5 History API routing without full page reloads.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Folder Structure](#folder-structure)
3. [Setup & Execution](#setup--execution)
4. [Comprehensive Validation Rules Table](#comprehensive-validation-rules-table)
5. [Client-Side Router Architecture](#client-side-router-architecture)
6. [Dynamic DOM Manipulation Features](#dynamic-dom-manipulation-features)
7. [Security & Cross-Site Scripting (XSS) Prevention](#security--cross-site-scripting-xss-prevention)
8. [Automated Unit Testing](#automated-unit-testing)

---

## 1. Project Overview

The objective of Task 4 is to extend form validation to include complex multi-tier rules and implement dynamic client-side updates to the DOM within an SPA architecture.

### Key Capabilities
- **Pure JavaScript SPA**: Client-side routing driven by the HTML5 History API (`pushState`, `popstate`), complete with route transitions, accessible heading focus, and route guards.
- **Complex Real-Time Form Validation**: Real-time evaluation on `input` and `blur` events with colored borders, error feedback, and an attention summary.
- **Interactive Password Strength Meter**: Live scoring across 7 cryptographic rules with dynamic checklist tick-offs and progress bar color transitions.
- **Dynamic Dependent Dropdowns**: 3-tier geographic cascade (Country &rarr; State &rarr; City).
- **Dynamic Skills Array**: Interactive add/remove input rows (1 to 5 items) with duplicate detection and empty entry constraints.
- **Dynamic Dashboard**: Search with debounce, country filtering, multiple sort modes, statistical counters, edit/delete modals, and `localStorage` persistence.

---

## 2. Folder Structure

```
task-4-spa-forms/
├── package.json               # Manifest with express, devDependencies, and scripts
├── server.js                  # Express static server with SPA catch-all fallback
├── README.md                  # Detailed documentation and architectural guide
├── test/
│   └── validators.test.js     # 45 pure function unit tests via node:test runner
└── public/
    ├── index.html             # Main HTML5 application shell
    ├── css/
    │   └── styles.css         # Modern responsive CSS (custom properties, mobile-first)
    └── js/
        ├── app.js             # Application entry point & DOM event coordinators
        ├── router.js          # HTML5 History API client-side router with route guard
        ├── views.js           # Route HTML view templates (Home, Register, Dashboard, About, 404)
        ├── validators.js      # Decoupled, pure validation & password strength functions
        ├── store.js           # Client-side persistence layer backed by localStorage
        ├── ui.js              # Accessible modal dialogs, stacking toasts & DOM helpers
        └── data.js            # Geographic hierarchy data (Countries, States, Cities)
```

---

## 3. Setup & Execution

### Prerequisites
- Node.js (version 18.0.0 or higher recommended)
- npm (Node Package Manager)

### Installation
Navigate to the project root directory and install dependencies:
```bash
cd task-4-spa-forms
npm install
```

### Starting the Server
Start the production server:
```bash
npm start
```
Or start in development mode with automatic restart on file change:
```bash
npm run dev
```

Open your browser and navigate to:  
**`http://localhost:3000`**

### Running the Automated Test Suite
Run the 45 built-in unit tests for the pure validator functions:
```bash
npm test
```

---

## 4. Comprehensive Validation Rules Table

All validators in `public/js/validators.js` are pure functions returning an error message string or an empty string `""` when the input is valid.

| Field | Validation Rules & Criteria | Error Message Triggered |
|---|---|---|
| **Full Name** | • Length between 2 and 50 characters<br>• Only letters, spaces, hyphens, and apostrophes allowed | • "Full name is required."<br>• "Full name must be at least 2 characters long."<br>• "Full name must not exceed 50 characters."<br>• "Full name can only contain letters, spaces, hyphens, and apostrophes." |
| **Username** | • 4 to 15 characters<br>• Must start with a letter<br>• Alphanumeric characters and underscores only (`^[a-zA-Z0-9_]+$`)<br>• Case-insensitive uniqueness against stored profiles | • "Username is required."<br>• "Username must be between 4 and 15 characters."<br>• "Username must start with a letter."<br>• "Username can only contain letters, numbers, and underscores."<br>• `Username "..." is already taken. Please choose another.` |
| **Email** | • Strict RFC 5322 regex: `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`<br>• Case-insensitive uniqueness check | • "Email address is required."<br>• "Please enter a valid email address (e.g., alex@example.com)."<br>• `Email "..." is already registered.` |
| **Phone** | • Strips non-digits (`\D`)<br>• Must contain exactly 10 digits<br>• Rejects 10 repetitive identical digits (e.g., `0000000000`) | • "Phone number is required."<br>• "Phone number must contain exactly 10 digits."<br>• "Please enter a valid 10-digit phone number." |
| **Date of Birth** | • Valid date string<br>• Cannot be in the future<br>• Accurately calculates age based on current date; user must be &ge; 18 | • "Date of birth is required."<br>• "Please enter a valid date."<br>• "Date of birth cannot be in the future."<br>• "You must be at least 18 years old to register." |
| **Password** | • At least 8 characters<br>• At least 1 uppercase letter (`[A-Z]`)<br>• At least 1 lowercase letter (`[a-z]`)<br>• At least 1 number (`[0-9]`)<br>• At least 1 special character (`[!@#$%^&*...]`)<br>• No whitespace characters allowed<br>• Must not contain the username | • "Password must be at least 8 characters long."<br>• "Password cannot contain spaces."<br>• "Password must include at least one uppercase letter (A-Z)."<br>• "Password must include at least one number (0-9)."<br>• "Password must include at least one special character."<br>• "Password must not contain your username." |
| **Confirm Password** | • Strict equality check against Password field (`===`)<br>• Automatically re-validates when original password changes | • "Please confirm your password."<br>• "Passwords do not match." |
| **Country** | • Must be selected from available geographic list | • "Please select a country." |
| **State** | • Disabled until Country is selected<br>• Must be valid for selected Country | • "Please select a state / province." |
| **City** | • Disabled until State is selected<br>• Must be valid for selected State | • "Please select a city." |
| **Skills** | • Minimum 1 skill required, maximum 5 allowed<br>• No blank or whitespace-only inputs<br>• Case-insensitive uniqueness among entered skills | • "Please add at least 1 skill."<br>• "You can add at most 5 skills."<br>• "Skill fields cannot be left blank. Fill or remove empty skills."<br>• `Duplicate skill detected: "...". Skills must be unique.` |
| **Bio** | • Optional field<br>• Maximum 200 characters | • `Bio cannot exceed 200 characters (currently ...).` |
| **Terms of Service** | • Checkbox must be checked (`true`) | • "You must agree to the Terms of Service to register." |

---

## 5. Client-Side Router Architecture

The SPA router in `public/js/router.js` operates purely on standard web APIs without any third-party routing libraries:

1. **Declarative Link Interception**:  
   Global event delegation listens for click events on anchor tags containing `[data-link]`. The router prevents the default browser reload (`e.preventDefault()`), invokes `history.pushState({}, "", href)`, and renders the matching route component.
2. **History Traversal (`popstate`)**:  
   Listens to the browser's `window.onpopstate` event so browser Back and Forward buttons navigate smoothly between views.
3. **Route Guarding (Unsaved Changes Warning)**:  
   Before changing routes, the router queries the active view's dirty status (`router.setUnsavedChangesGuard(...)`). If the user has partially typed into the registration form, a confirmation prompt warns them before discarding unsubmitted data. It also listens to `window.beforeunload` for browser tab close/reload attempts.
4. **Accessibility (WCAG Compliance)**:  
   On every route transition:
   - Sets `document.title` to match the view context.
   - Highlights the active navigation item using `aria-current="page"`.
   - Scrolls the viewport to the top (`window.scrollTo({ top: 0, left: 0 })`).
   - Programmatically shifts keyboard focus to the view's primary heading (`heading.tabIndex = -1; heading.focus()`).
5. **Express SPA Fallback (`server.js`)**:  
   Any incoming GET request that does not match a physical static file is served `public/index.html`. This ensures direct links (e.g. `http://localhost:3000/dashboard` or `http://localhost:3000/register`) and browser page refreshes load properly.

---

## 6. Dynamic DOM Manipulation Features

1. **Live Password Strength Meter & Interactive Checklist**:  
   As the user types into the password field, `checkPasswordStrength()` scores the input in real time. The progress bar transitions smoothly across 4 tiers (**Weak** &rarr; **Fair** &rarr; **Good** &rarr; **Strong**), changing colors from red to amber to blue to emerald. Seven rule checklist items update dynamically with tickmarks (`✓`) as requirements are satisfied.
2. **Three-Tier Dependent Dropdowns**:  
   Choosing a Country dynamically populates the State dropdown and enables it while keeping City reset and disabled. Selecting a State dynamically populates and enables the City dropdown.
3. **Dynamic Skills List Manager**:  
   The user can add new skill input rows dynamically by clicking "+ Add Skill" (capped at 5). Each row features a dedicated removal button (`✕`). The removal button automatically hides when only 1 skill remains.
4. **Live Character Counter**:  
   The bio field updates an active counter (`45 / 200`). When the user approaches the limit (&ge; 160 characters), the counter turns warning amber; at &ge; 190 characters, it turns danger red.
5. **Real-Time Attention Summary & Reactive Submit Button**:  
   A dynamic summary alert informs the user how many fields still need attention. The Submit button remains strictly disabled until all 13 validation criteria are satisfied.
6. **Dynamic Dashboard Directory**:  
   - Generated entirely through DOM nodes (`document.createElement`).
   - Debounced live search filtering simultaneously across name, username, email, and skills.
   - Dynamic country filtering and multidirectional sorting (Newest, Oldest, A-Z, Z-A).
   - Real-time statistics bar (Total Profiles, Countries Represented, Most Common Skill).
   - Custom accessible modal dialogs for Editing (with prefilled inputs and live validators) and Deletion confirmation.

---

## 7. Security & Cross-Site Scripting (XSS) Prevention

Cross-Site Scripting (XSS) vulnerabilities occur when unvetted user input is injected directly into an HTML document using unsafe sinks like `element.innerHTML = userInput`.

In ProfileHub, strict XSS defense mechanisms are enforced:
- **No Raw HTML Injections**: User-submitted strings (full name, username, email, phone, location, skills, bio, search queries) are **never** rendered with `innerHTML`.
- **Text Node Insertion**: User data is rendered exclusively using `element.textContent` or `document.createTextNode()`. This guarantees that even if a user submits malicious payload strings (such as `<script>alert('xss')</script>` or `<img src=x onerror=alert(1)>`), the browser parses them strictly as inert text literals rather than executable markup.
- **Entity Escaping**: The `escapeHTML()` helper converts special characters (`&`, `<`, `>`, `"`, `'`) into their safe HTML entity representations.

---

## 8. Automated Unit Testing

The test suite is located in `test/validators.test.js` and runs using Node's native test runner (`node:test` and `node:assert/strict`):

```bash
npm test
```

### Test Coverage Highlights:
- **Full Name**: Valid names, hyphenated names, apostrophes, empty strings, character boundary checks (1, 2, 50, 51 chars), illegal symbols.
- **Username**: Alphanumeric checks, starting with letters, length boundaries, case-insensitive uniqueness collisions.
- **Email**: Strict RFC regex patterns, missing domain parts, uniqueness detection.
- **Phone**: Stripping formatting characters (dashes, spaces, parentheses), 9 vs 10 vs 11 digits, repetitive dummy numbers.
- **Date of Birth**: Age calculation, leap years, boundary at 18th birthday, future date prevention.
- **Password Strength**: Real-time evaluation of all 7 rules, scoring thresholds (Weak, Fair, Good, Strong), username substring collision, space rejection.
- **Confirm Password**: Equality checks, mismatches.
- **Dependent Geographic Data**: Country, State, City validity.
- **Skills Array**: 1 to 5 range, duplicate detection, empty string rejection.
- **Bio & Terms**: Boundary length checks, terms boolean agreement.

