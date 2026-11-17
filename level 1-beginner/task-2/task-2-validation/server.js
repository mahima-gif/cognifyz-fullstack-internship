/**
 * ============================================================================
 * Task 2: Inline Styles, Basic Interaction, and Server-Side Validation
 * Cognifyz Technologies Full Stack Internship - Level 1 (Beginner)
 * ============================================================================
 *
 * File: server.js
 * Description: Express server implementing server-side validation, in-memory
 *              user storage, secure bcryptjs password hashing, and EJS rendering.
 */

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware for parsing form bodies and JSON data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ============================================================================
// TEMPORARY STORAGE (In-Memory JavaScript Array)
// ============================================================================
// As per task instructions, an in-memory array acts as our temporary storage.
// It persists records during the server's lifecycle without requiring a database.
const users = [];

// ============================================================================
// SERVER-SIDE VALIDATION HELPER
// ============================================================================
/**
 * WHY SERVER-SIDE VALIDATION MATTERS:
 * ----------------------------------------------------------------------------
 * Client-side validation in the browser improves user experience by offering
 * instantaneous visual feedback (e.g., dynamic red/green borders, error spans).
 * However, client-side validation CAN NEVER BE TRUSTED as a security measure:
 *   1. A user can disable JavaScript in their browser settings.
 *   2. An attacker can alter HTML attributes (such as removing required/pattern)
 *      or bypass event handlers using browser DevTools.
 *   3. Automated HTTP clients (curl, Postman, custom scripts) can send POST
 *      requests directly to /register, bypassing browser execution entirely.
 *
 * Server-side validation is our true perimeter defense. It guarantees that
 * every incoming data payload is sanitized, strictly conforms to business rules,
 * and maintains data integrity before being accepted into storage.
 * ----------------------------------------------------------------------------
 */

/**
 * Validates registration form inputs.
 * @param {Object} data - Raw form body submitted by client.
 * @param {Array} existingUsers - Array of currently stored users for uniqueness check.
 * @returns {Object} errors - Map of field names to error messages (empty if valid).
 */
function validateRegistration(data, existingUsers = users) {
  const errors = {};

  // 1. Sanitize string inputs (trim leading/trailing whitespace)
  const firstName = (data.firstName || '').trim();
  const lastName = (data.lastName || '').trim();
  const email = (data.email || '').trim().toLowerCase();
  const phone = (data.phone || '').trim();
  const dob = (data.dob || '').trim();
  const password = data.password || '';
  const confirmPassword = data.confirmPassword || '';
  const gender = (data.gender || '').trim();
  const country = (data.country || '').trim();
  const bio = (data.bio || '').trim();
  const terms = data.terms;

  // 2. Normalize skills field (could be undefined, a single string, or an array)
  let skills = [];
  if (Array.isArray(data.skills)) {
    skills = data.skills;
  } else if (typeof data.skills === 'string' && data.skills.trim().length > 0) {
    skills = [data.skills.trim()];
  }

  // --- Rule 1: First Name ---
  // Required, at least 2 characters, letters only
  const nameRegex = /^[A-Za-z\s]{2,}$/;
  if (!firstName) {
    errors.firstName = 'First name is required.';
  } else if (firstName.length < 2) {
    errors.firstName = 'First name must be at least 2 characters.';
  } else if (!nameRegex.test(firstName)) {
    errors.firstName = 'First name must contain letters only.';
  }

  // --- Rule 2: Last Name ---
  // Required, at least 2 characters, letters only
  if (!lastName) {
    errors.lastName = 'Last name is required.';
  } else if (lastName.length < 2) {
    errors.lastName = 'Last name must be at least 2 characters.';
  } else if (!nameRegex.test(lastName)) {
    errors.lastName = 'Last name must contain letters only.';
  }

  // --- Rule 3: Email & Server-Only Duplicate Check ---
  // Required, valid email format regex, case-insensitive duplicate check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    errors.email = 'Email address is required.';
  } else if (!emailRegex.test(email)) {
    errors.email = 'Please provide a valid email address (e.g. name@example.com).';
  } else {
    // Additional server-only check: Reject duplicate email against stored users
    const emailExists = existingUsers.some(
      (u) => u.email.toLowerCase() === email
    );
    if (emailExists) {
      errors.email = 'This email is already registered.';
    }
  }

  // --- Rule 4: Phone ---
  // Required, exactly 10 digits
  const phoneRegex = /^\d{10}$/;
  if (!phone) {
    errors.phone = 'Phone number is required.';
  } else if (!phoneRegex.test(phone)) {
    errors.phone = 'Phone number must be exactly 10 digits.';
  }

  // --- Rule 5: Date of Birth & Minimum Age (13 Years) ---
  if (!dob) {
    errors.dob = 'Date of birth is required.';
  } else {
    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) {
      errors.dob = 'Please provide a valid date.';
    } else {
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const monthDiff = today.getMonth() - dobDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
        age--;
      }
      if (age < 13) {
        errors.dob = 'You must be at least 13 years old to register.';
      }
    }
  }

  // --- Rule 6: Password ---
  // At least 8 characters, at least one letter and one number
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  } else if (!passwordRegex.test(password)) {
    errors.password = 'Password must contain at least one letter and one number.';
  }

  // --- Rule 7: Confirm Password ---
  // Must match password
  if (!confirmPassword) {
    errors.confirmPassword = 'Confirmation password is required.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  // --- Rule 8: Gender ---
  // One radio must be chosen from allowed options
  const allowedGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
  if (!gender || !allowedGenders.includes(gender)) {
    errors.gender = 'Please select a gender option.';
  }

  // --- Rule 9: Country ---
  // Non-empty selection from dropdown
  if (!country) {
    errors.country = 'Please select your country.';
  }

  // --- Rule 10: Skills ---
  // At least one skill checkbox selected
  if (skills.length === 0) {
    errors.skills = 'Please select at least one skill.';
  }

  // --- Rule 11: Bio ---
  // Optional, but cannot exceed 200 characters
  if (bio && bio.length > 200) {
    errors.bio = 'Bio cannot exceed 200 characters.';
  }

  // --- Rule 12: Terms and Conditions ---
  // Must be checked
  if (terms !== 'on' && terms !== 'true' && terms !== true) {
    errors.terms = 'You must agree to the Terms and Conditions to proceed.';
  }

  return errors;
}

// ============================================================================
// APPLICATION ROUTES
// ============================================================================

/**
 * GET /
 * Home page with overview of validation concepts and quick links.
 */
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Home - Task 2 Validation & Inline Styles',
    activePage: 'home',
    userCount: users.length
  });
});

/**
 * GET /register
 * Renders registration form with empty values and no errors.
 */
app.get('/register', (req, res) => {
  res.render('register', {
    title: 'Register - Interactive Validation Form',
    activePage: 'register',
    formData: {},
    errors: {}
  });
});

/**
 * POST /register
 * Validates submitted data on the server.
 * - If errors exist: responds with status 400 and re-renders register.ejs,
 *   preserving previously entered values (passwords are strictly redacted).
 * - If valid: hashes password with bcryptjs, saves to users array, and redirects to /success.
 */
app.post('/register', async (req, res, next) => {
  try {
    const rawData = req.body;
    const errors = validateRegistration(rawData, users);

    // If validation fails, return status 400 and preserve user input (NEVER passwords)
    if (Object.keys(errors).length > 0) {
      const safeFormData = { ...rawData };
      delete safeFormData.password;
      delete safeFormData.confirmPassword;

      if (!Array.isArray(safeFormData.skills)) {
        safeFormData.skills = safeFormData.skills ? [safeFormData.skills] : [];
      }

      return res.status(400).render('register', {
        title: 'Register - Fix Errors',
        activePage: 'register',
        formData: safeFormData,
        errors: errors
      });
    }

    // --- Data is valid ---
    // Security: Hash password using bcryptjs with 10 salt rounds
    // Passwords are never stored, logged, or exposed in plain text.
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(rawData.password, saltRounds);

    let normalizedSkills = [];
    if (Array.isArray(rawData.skills)) {
      normalizedSkills = rawData.skills;
    } else if (rawData.skills) {
      normalizedSkills = [rawData.skills];
    }

    const newUser = {
      id: users.length + 1,
      firstName: rawData.firstName.trim(),
      lastName: rawData.lastName.trim(),
      email: rawData.email.trim().toLowerCase(),
      phone: rawData.phone.trim(),
      dob: rawData.dob.trim(),
      gender: rawData.gender,
      country: rawData.country,
      skills: normalizedSkills,
      bio: (rawData.bio || '').trim(),
      passwordHash: passwordHash,
      createdAt: new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    };

    // Store in temporary in-memory array
    users.push(newUser);

    // Post-Redirect-Get pattern: Redirect to /success
    res.redirect(`/success?name=${encodeURIComponent(newUser.firstName)}`);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /success
 * Registration confirmation page showing congratulatory message.
 */
app.get('/success', (req, res) => {
  const name = req.query.name || 'Friend';
  res.render('success', {
    title: 'Registration Successful',
    activePage: 'register',
    name: name,
    totalUsers: users.length
  });
});

/**
 * GET /users
 * Displays all stored users in a styled table.
 * Strictly excludes passwords and password hashes. Shows empty state if none exist.
 */
app.get('/users', (req, res) => {
  const safeUsers = users.map((u) => ({
    id: u.id,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    phone: u.phone,
    country: u.country,
    skills: u.skills,
    createdAt: u.createdAt
  }));

  res.render('users', {
    title: 'Registered Users - In-Memory Store',
    activePage: 'users',
    users: safeUsers,
    totalCount: users.length
  });
});

// ============================================================================
// 404 NOT FOUND HANDLER
// ============================================================================
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404 - Page Not Found',
    activePage: '',
    path: req.originalUrl
  });
});

// ============================================================================
// GLOBAL ERROR HANDLER (4 Arguments)
// ============================================================================
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]:', err);
  res.status(500).render('error', {
    title: '500 - Server Error',
    activePage: '',
    message: err.message || 'An unexpected internal server error occurred.'
  });
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('================================================================');
    console.log('🚀 Task 2 Server started successfully!');
    console.log(`🌐 Application URL: http://localhost:${PORT}`);
    console.log(`📝 Register Page:  http://localhost:${PORT}/register`);
    console.log(`👥 Users Table:    http://localhost:${PORT}/users`);
    console.log('================================================================');
  });
}

// Export for automated test runner
module.exports = { app, users, validateRegistration };

