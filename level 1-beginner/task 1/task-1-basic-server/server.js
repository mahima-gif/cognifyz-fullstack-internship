// ==============================================================================
// TASK 1: HTML STRUCTURE AND BASIC SERVER INTERACTION
// Cognifyz Full Stack Development Internship - Level 1 (Beginner)
// File: server.js
// Description: Express server setup, route handlers, and SSR with EJS
// ==============================================================================

// 1. IMPORT REQUIRED MODULES
// 'express' is a fast, minimalist web framework for Node.js
const express = require('express');
// 'path' is a built-in Node.js module used to handle and transform file paths safely
const path = require('path');

// 2. INITIALIZE EXPRESS APPLICATION
const app = express();

// Set the port to an environment variable or default to 3000
const PORT = process.env.PORT || 3000;

// 3. CONFIGURE VIEW ENGINE (EJS)
// Tell Express to use EJS as the templating / view engine
app.set('view engine', 'ejs');
// Specify the directory where the template files (views) are located
app.set('views', path.join(__dirname, 'views'));

// 4. CONFIGURE MIDDLEWARE
// Middleware functions run between receiving a request and sending a response.

// Serve static assets (CSS, images, client scripts) from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// Parse URL-encoded bodies sent by HTML forms (application/x-www-form-urlencoded)
// 'extended: true' allows parsing rich objects and arrays encoded in the URL-encoded format
app.use(express.urlencoded({ extended: true }));

// ==============================================================================
// 5. APPLICATION ROUTES
// ==============================================================================

/**
 * Route: GET /
 * Purpose: Render the Home page with introductory information and links.
 */
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Home | Task 1 Basic Server'
  });
});

/**
 * Route: GET /contact
 * Purpose: Render the form page where users can input information.
 */
app.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact Form | Task 1 Basic Server',
    error: null,
    formData: {} // Keep empty default so fields don't throw undefined errors
  });
});

/**
 * Route: POST /submit
 * Purpose: Handle the form submission, perform validation, and render the result.
 */
app.post('/submit', (req, res) => {
  // Extract submitted form data from req.body
  const { name, email, age, gender, country, interests, message } = req.body;

  // Basic Validation: Check if required fields (name and email) are provided and not just whitespace
  if (!name || !name.trim() || !email || !email.trim()) {
    // Return status 400 (Bad Request) and re-render contact page with an error message and existing input
    return res.status(400).render('contact', {
      title: 'Contact Form | Task 1 Basic Server',
      error: 'Please fill in all required fields (Full Name and Email Address).',
      formData: { name, email, age, gender, country, interests, message }
    });
  }

  // Normalize 'interests':
  // When an HTML form with checkboxes is submitted:
  // - 0 checkboxes checked => interests is undefined
  // - 1 checkbox checked   => interests is a string (e.g. "Web Development")
  // - 2+ checkboxes checked => interests is an Array of strings (e.g. ["Web Development", "AI/ML"])
  let normalizedInterests = [];
  if (Array.isArray(interests)) {
    normalizedInterests = interests;
  } else if (typeof interests === 'string' && interests.trim().length > 0) {
    normalizedInterests = [interests];
  }

  // Generate server-side submission timestamp
  const submittedAt = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  // Render result.ejs with the submitted and sanitized data
  res.render('result', {
    title: 'Submission Result | Task 1 Basic Server',
    user: {
      name: name.trim(),
      email: email.trim(),
      age: age ? age.trim() : 'Not provided',
      gender: gender || 'Not specified',
      country: country || 'Not selected',
      interests: normalizedInterests,
      message: message ? message.trim() : 'No message provided'
    },
    submittedAt: submittedAt
  });
});

// ==============================================================================
// 6. 404 NOT FOUND HANDLER (CATCH-ALL)
// ==============================================================================
// If none of the routes above match the incoming request URL, this middleware will run.
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404 - Page Not Found | Task 1 Basic Server',
    requestedUrl: req.originalUrl
  });
});

// ==============================================================================
// 7. START THE SERVER
// ==============================================================================
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Server successfully started!`);
  console.log(`📡 Access the application at: http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});

