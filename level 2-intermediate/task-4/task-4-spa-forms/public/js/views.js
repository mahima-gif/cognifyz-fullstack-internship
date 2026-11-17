/**
 * views.js
 * HTML view templates and structural generation for all client-side routes.
 * Views are rendered into the main application container without page reloads.
 */

export function getHomeView() {
  return `
    <section class="hero-section">
      <div class="hero-content">
        <span class="badge badge-primary">Cognifyz Internship • Level 2 Task 4</span>
        <h1 class="hero-title">Welcome to <span class="text-gradient">ProfileHub</span></h1>
        <p class="hero-subtitle">
          An intermediate Single Page Application engineered with vanilla JavaScript,
          featuring multi-tier complex form validation, real-time DOM manipulation, and HTML5 History API routing.
        </p>
        <div class="hero-actions">
          <a href="/register" class="btn btn-primary btn-lg" data-link>Register New Profile →</a>
          <a href="/dashboard" class="btn btn-secondary btn-lg" data-link>View Dynamic Dashboard</a>
        </div>
      </div>
    </section>

    <section class="features-section">
      <div class="section-header text-center">
        <h2 class="section-title">Core Technical Pillars</h2>
        <p class="section-subtitle">Engineered strictly with Vanilla JavaScript (ES Modules) — zero third-party UI or routing frameworks.</p>
      </div>

      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🛡️</div>
          <h3>Complex Form Validation</h3>
          <p>
            Real-time validation for strict regex email patterns, 10-digit phones, 18+ age verification,
            case-insensitive uniqueness checks, and a live password strength meter with dynamic rule tick-off.
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>Dynamic DOM Manipulation</h3>
          <p>
            Dependent three-tier geographic dropdowns (Country → State → City), dynamic skill tags adder/remover
            (1 to 5 limit), live character countdowns, and real-time dashboard filtering with debounce.
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">🧭</div>
          <h3>Client-Side SPA Router</h3>
          <p>
            Built from scratch on the HTML5 History API. Intercepts navigation, drives back/forward history,
            focuses accessible headings, updates document titles, and protects against unsaved form changes.
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">🔒</div>
          <h3>XSS-Safe & Persistent</h3>
          <p>
            User inputs are sanitized and rendered using safe DOM APIs (<code>textContent</code> and structured node creation).
            All profiles persist in browser <code>localStorage</code>.
          </p>
        </div>
      </div>
    </section>
  `;
}

export function getRegisterView() {
  return `
    <section class="form-section">
      <div class="form-header">
        <span class="badge badge-secondary">Interactive Registration</span>
        <h1 class="page-title">Create Developer Profile</h1>
        <p class="page-subtitle">
          Fill in your details below. Every field validates in real time against strict criteria before submission.
        </p>
      </div>

      <form id="registration-form" class="card form-card" novalidate autocomplete="off">
        <!-- Status summary bar -->
        <div id="form-summary" class="form-summary alert alert-info" role="status" aria-live="polite">
          <span class="summary-icon">ℹ</span>
          <span class="summary-text" id="summary-text">Please complete all required fields to register.</span>
        </div>

        <!-- Section: Basic Information -->
        <fieldset class="form-fieldset">
          <legend class="fieldset-legend">Personal Details</legend>

          <div class="form-row">
            <!-- Full Name -->
            <div class="form-group" id="group-fullName">
              <label for="field-fullName" class="form-label">
                Full Name <span class="required-star">*</span>
              </label>
              <input
                type="text"
                id="field-fullName"
                name="fullName"
                class="form-input"
                placeholder="e.g. Alex Morgan"
                maxlength="50"
                required
              />
              <span class="validation-message" id="error-fullName" aria-live="polite"></span>
              <span class="field-hint">2-50 characters. Letters, spaces, hyphens, and apostrophes only.</span>
            </div>

            <!-- Username -->
            <div class="form-group" id="group-username">
              <label for="field-username" class="form-label">
                Username <span class="required-star">*</span>
              </label>
              <div class="input-prefix-wrapper">
                <span class="input-prefix">@</span>
                <input
                  type="text"
                  id="field-username"
                  name="username"
                  class="form-input input-with-prefix"
                  placeholder="alex_dev"
                  maxlength="15"
                  required
                />
              </div>
              <span class="validation-message" id="error-username" aria-live="polite"></span>
              <span class="field-hint">4-15 chars, alphanumeric & underscore, must start with a letter, unique.</span>
            </div>
          </div>

          <div class="form-row">
            <!-- Email -->
            <div class="form-group" id="group-email">
              <label for="field-email" class="form-label">
                Email Address <span class="required-star">*</span>
              </label>
              <input
                type="email"
                id="field-email"
                name="email"
                class="form-input"
                placeholder="alex@example.com"
                required
              />
              <span class="validation-message" id="error-email" aria-live="polite"></span>
              <span class="field-hint">Must be a valid format and unique among registered members.</span>
            </div>

            <!-- Phone -->
            <div class="form-group" id="group-phone">
              <label for="field-phone" class="form-label">
                Phone Number <span class="required-star">*</span>
              </label>
              <input
                type="tel"
                id="field-phone"
                name="phone"
                class="form-input"
                placeholder="(555) 123-4567"
                required
              />
              <span class="validation-message" id="error-phone" aria-live="polite"></span>
              <span class="field-hint">Exactly 10 digits. Spaces, dashes, and parentheses are allowed.</span>
            </div>
          </div>

          <div class="form-row">
            <!-- Date of Birth -->
            <div class="form-group" id="group-dob">
              <label for="field-dob" class="form-label">
                Date of Birth <span class="required-star">*</span>
              </label>
              <input
                type="date"
                id="field-dob"
                name="dob"
                class="form-input"
                required
              />
              <span class="validation-message" id="error-dob" aria-live="polite"></span>
              <span class="field-hint">Must be a valid past date. You must be at least 18 years old.</span>
            </div>
          </div>
        </fieldset>

        <!-- Section: Security -->
        <fieldset class="form-fieldset">
          <legend class="fieldset-legend">Account Security</legend>

          <div class="form-row">
            <!-- Password -->
            <div class="form-group" id="group-password">
              <label for="field-password" class="form-label">
                Password <span class="required-star">*</span>
              </label>
              <div class="password-wrapper">
                <input
                  type="password"
                  id="field-password"
                  name="password"
                  class="form-input"
                  placeholder="Enter strong password"
                  autocomplete="new-password"
                  required
                />
                <button
                  type="button"
                  id="toggle-password"
                  class="btn-toggle-password"
                  aria-label="Toggle password visibility"
                  title="Show/Hide Password"
                >
                  👁️
                </button>
              </div>
              <span class="validation-message" id="error-password" aria-live="polite"></span>

              <!-- Live Password Strength Meter -->
              <div class="password-meter-container" id="password-meter-box">
                <div class="meter-header">
                  <span class="meter-label">Password Strength:</span>
                  <span id="strength-text" class="strength-status">Not entered</span>
                </div>
                <div class="strength-bar-track">
                  <div id="strength-bar" class="strength-bar-fill" style="width: 0%;"></div>
                </div>

                <!-- Rules checklist -->
                <ul class="password-rules-checklist" id="password-checklist">
                  <li id="rule-length" class="rule-item">At least 8 characters long</li>
                  <li id="rule-upper" class="rule-item">At least one uppercase letter (A-Z)</li>
                  <li id="rule-lower" class="rule-item">At least one lowercase letter (a-z)</li>
                  <li id="rule-number" class="rule-item">At least one number (0-9)</li>
                  <li id="rule-special" class="rule-item">At least one special symbol (!@#$%^&*)</li>
                  <li id="rule-spaces" class="rule-item">No spaces</li>
                  <li id="rule-username" class="rule-item">Does not contain your username</li>
                </ul>
              </div>
            </div>

            <!-- Confirm Password -->
            <div class="form-group" id="group-confirmPassword">
              <label for="field-confirmPassword" class="form-label">
                Confirm Password <span class="required-star">*</span>
              </label>
              <div class="password-wrapper">
                <input
                  type="password"
                  id="field-confirmPassword"
                  name="confirmPassword"
                  class="form-input"
                  placeholder="Re-enter password"
                  autocomplete="new-password"
                  required
                />
                <button
                  type="button"
                  id="toggle-confirmPassword"
                  class="btn-toggle-password"
                  aria-label="Toggle confirm password visibility"
                  title="Show/Hide Password"
                >
                  👁️
                </button>
              </div>
              <span class="validation-message" id="error-confirmPassword" aria-live="polite"></span>
              <span class="field-hint">Must match password exactly.</span>
            </div>
          </div>
        </fieldset>

        <!-- Section: Dependent Location Dropdowns -->
        <fieldset class="form-fieldset">
          <legend class="fieldset-legend">Location (Dependent Dropdowns)</legend>
          <div class="form-row form-row-3">
            <!-- Country -->
            <div class="form-group" id="group-country">
              <label for="field-country" class="form-label">
                Country <span class="required-star">*</span>
              </label>
              <select id="field-country" name="country" class="form-select" required>
                <option value="">-- Choose Country --</option>
              </select>
              <span class="validation-message" id="error-country" aria-live="polite"></span>
            </div>

            <!-- State -->
            <div class="form-group" id="group-state">
              <label for="field-state" class="form-label">
                State / Province <span class="required-star">*</span>
              </label>
              <select id="field-state" name="state" class="form-select" disabled required>
                <option value="">-- Select Country First --</option>
              </select>
              <span class="validation-message" id="error-state" aria-live="polite"></span>
            </div>

            <!-- City -->
            <div class="form-group" id="group-city">
              <label for="field-city" class="form-label">
                City <span class="required-star">*</span>
              </label>
              <select id="field-city" name="city" class="form-select" disabled required>
                <option value="">-- Select State First --</option>
              </select>
              <span class="validation-message" id="error-city" aria-live="polite"></span>
            </div>
          </div>
        </fieldset>

        <!-- Section: Skills (Dynamic List Adder/Remover) -->
        <fieldset class="form-fieldset">
          <legend class="fieldset-legend">Technical Skills (Dynamic List)</legend>
          <p class="field-hint mb-3">Add 1 to 5 skills. Entries must be non-empty and unique.</p>

          <div id="skills-container" class="skills-container">
            <!-- Dynamically populated rows -->
          </div>

          <div class="skills-action-row">
            <button type="button" id="btn-add-skill" class="btn btn-outline btn-sm">
              + Add Skill
            </button>
            <span id="skills-count-badge" class="badge badge-info">1 / 5 skills</span>
          </div>
          <span class="validation-message" id="error-skills" aria-live="polite"></span>
        </fieldset>

        <!-- Section: Bio & Terms -->
        <fieldset class="form-fieldset">
          <legend class="fieldset-legend">Profile Bio & Agreements</legend>

          <!-- Bio -->
          <div class="form-group" id="group-bio">
            <div class="label-with-counter">
              <label for="field-bio" class="form-label">Short Bio (Optional)</label>
              <span id="bio-counter" class="character-counter">0 / 200</span>
            </div>
            <textarea
              id="field-bio"
              name="bio"
              class="form-textarea"
              rows="3"
              maxlength="200"
              placeholder="Tell other developers about your background, projects, or interests..."
            ></textarea>
            <span class="validation-message" id="error-bio" aria-live="polite"></span>
          </div>

          <!-- Terms Checkbox -->
          <div class="form-group form-checkbox-group" id="group-terms">
            <label class="checkbox-label" for="field-terms">
              <input type="checkbox" id="field-terms" name="terms" class="form-checkbox" required />
              <span>
                I agree to the <a href="/about" data-link class="link-inline">Terms of Service</a>
                and community guidelines. <span class="required-star">*</span>
              </span>
            </label>
            <span class="validation-message" id="error-terms" aria-live="polite"></span>
          </div>
        </fieldset>

        <!-- Form Submission Actions -->
        <div class="form-actions">
          <button type="button" id="btn-reset-form" class="btn btn-secondary">
            Reset Form
          </button>
          <button type="submit" id="btn-submit-form" class="btn btn-primary btn-submit" disabled>
            Complete Registration →
          </button>
        </div>
      </form>
    </section>
  `;
}

export function getDashboardView() {
  return `
    <section class="dashboard-section">
      <div class="dashboard-header">
        <div>
          <span class="badge badge-primary">Dynamic Directory</span>
          <h1 class="page-title">Registered Profiles</h1>
          <p class="page-subtitle">
            Search, filter, edit, and manage profiles with real-time DOM rendering and offline persistence.
          </p>
        </div>
        <div class="dashboard-header-actions">
          <a href="/register" class="btn btn-primary" data-link>+ Register Profile</a>
          <button type="button" id="btn-restore-demo" class="btn btn-outline" title="Reset to sample profiles">
            Reset Demo Data
          </button>
          <button type="button" id="btn-clear-all" class="btn btn-danger-outline" title="Remove all profiles">
            Clear All
          </button>
        </div>
      </div>

      <!-- Statistics Bar -->
      <div class="stats-grid" id="stats-bar" aria-label="Profiles Overview Statistics">
        <div class="stat-card">
          <span class="stat-label">Total Profiles</span>
          <span class="stat-value" id="stat-total-profiles">0</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Countries Represented</span>
          <span class="stat-value" id="stat-total-countries">0</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Top Skill</span>
          <span class="stat-value stat-value-text" id="stat-top-skill">None</span>
        </div>
      </div>

      <!-- Filter & Search Toolbar -->
      <div class="toolbar-card card">
        <div class="toolbar-row">
          <!-- Search box -->
          <div class="toolbar-search">
            <label for="search-input" class="sr-only">Search profiles</label>
            <div class="search-input-wrapper">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                id="search-input"
                class="form-input search-input"
                placeholder="Search by name, @username, email, or skill..."
                autocomplete="off"
              />
              <button
                type="button"
                id="search-clear-btn"
                class="search-clear-btn"
                aria-label="Clear search"
                style="display: none;"
              >
                ×
              </button>
            </div>
          </div>

          <!-- Country Filter -->
          <div class="toolbar-filter">
            <label for="filter-country" class="toolbar-label">Country:</label>
            <select id="filter-country" class="form-select toolbar-select">
              <option value="ALL">All Countries</option>
            </select>
          </div>

          <!-- Sort -->
          <div class="toolbar-sort">
            <label for="sort-profiles" class="toolbar-label">Sort by:</label>
            <select id="sort-profiles" class="form-select toolbar-select">
              <option value="newest">Date: Newest First</option>
              <option value="oldest">Date: Oldest First</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
            </select>
          </div>
        </div>

        <div class="toolbar-feedback" id="toolbar-feedback" aria-live="polite">
          Showing <span id="visible-count">0</span> profile(s)
        </div>
      </div>

      <!-- Profiles Grid Container (Dynamic DOM output) -->
      <div id="profiles-container" class="profiles-grid" aria-live="polite">
        <!-- Rendered dynamically by JavaScript -->
      </div>
    </section>
  `;
}

export function getAboutView() {
  return `
    <section class="about-section">
      <div class="about-header text-center">
        <span class="badge badge-secondary">Internship Documentation</span>
        <h1 class="page-title">About ProfileHub</h1>
        <p class="page-subtitle">
          Cognifyz Technologies Full Stack Internship • Level 2 Task 4: Complex Form Validation & Dynamic DOM Manipulation.
        </p>
      </div>

      <div class="about-content card">
        <h2>Project Objectives & Implementation</h2>
        <p>
          This project demonstrates the core engineering patterns required to build modern, framework-free single-page applications.
          Instead of relying on heavy frontend libraries, the entire experience is driven by vanilla JavaScript ES modules, the HTML5 History API,
          and programmatic DOM manipulation.
        </p>

        <div class="about-pillars">
          <div class="pillar-box">
            <h3>1. Multi-Stage Complex Validation</h3>
            <ul>
              <li><strong>Pure Function Validators:</strong> Decoupled logic returning error messages, tested with 100% test coverage via <code>node:test</code>.</li>
              <li><strong>Live Password Strength Analyzer:</strong> Calculates 7 cryptographic rule metrics with real-time feedback and visual meter.</li>
              <li><strong>Uniqueness Checks:</strong> Case-insensitive username and email collision detection against stored profiles.</li>
              <li><strong>Accurate Age Calculation:</strong> Date of birth math verifying users are strictly 18 or older.</li>
            </ul>
          </div>

          <div class="pillar-box">
            <h3>2. Dynamic DOM Manipulation</h3>
            <ul>
              <li><strong>Dependent Geographic Dropdowns:</strong> Country selection triggers asynchronous-style updates to State and City lists.</li>
              <li><strong>Dynamic Skills Array:</strong> Interactive rows with addition and deletion constraints (1 to 5 items, uniqueness enforcement).</li>
              <li><strong>Live Character Counter:</strong> Visual warning when nearing the 200-character bio boundary.</li>
              <li><strong>Live Debounced Search & Sorting:</strong> Real-time filtering without page re-render artifacts.</li>
            </ul>
          </div>

          <div class="pillar-box">
            <h3>3. Vanilla Client-Side Router</h3>
            <ul>
              <li><strong>HTML5 History API:</strong> Uses <code>pushState</code> and the <code>popstate</code> event for fluid forward/backward navigation.</li>
              <li><strong>Accessible View Updates:</strong> Updates <code>document.title</code>, active link attributes, and relocates keyboard focus to the main heading.</li>
              <li><strong>Navigation Guards:</strong> Warns users if they attempt to navigate away with unsaved form changes.</li>
              <li><strong>Express SPA Fallback:</strong> Deep links and page reloads are safely caught and served by <code>server.js</code>.</li>
            </ul>
          </div>

          <div class="pillar-box">
            <h3>4. Comprehensive XSS Defense</h3>
            <ul>
              <li><strong>Safe Text Injection:</strong> Avoids dangerous <code>innerHTML</code> assignments for user inputs by leveraging <code>element.textContent</code>.</li>
              <li><strong>DOM Element Constructors:</strong> Creates structured DOM nodes programmatically, rendering injected script tags inert.</li>
              <li><strong>Client-Side Persistence:</strong> Uses structured JSON in <code>localStorage</code> with fallback demo seeding.</li>
            </ul>
          </div>
        </div>

        <div class="about-cta text-center mt-4">
          <a href="/register" class="btn btn-primary" data-link>Try the Registration Form →</a>
          <a href="/dashboard" class="btn btn-secondary" data-link>Explore Profiles Dashboard</a>
        </div>
      </div>
    </section>
  `;
}

export function getNotFoundView() {
  return `
    <section class="notfound-section text-center">
      <div class="notfound-card card">
        <div class="notfound-code">404</div>
        <h1 class="page-title">Page Not Found</h1>
        <p class="page-subtitle">
          The requested route does not exist or has been moved. Use the links below to navigate back to safety.
        </p>
        <div class="notfound-actions">
          <a href="/" class="btn btn-primary" data-link>Return to Home</a>
          <a href="/dashboard" class="btn btn-secondary" data-link>View Profiles</a>
        </div>
      </div>
    </section>
  `;
}

