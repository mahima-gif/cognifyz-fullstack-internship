const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up view engine and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware for parsing URL-encoded bodies and serving static files
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Email validation helper
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).trim());
}

// GET / - Landing page
app.get('/', (req, res) => {
  res.render('index', {
    pageTitle: 'NovaTech Solutions | Next-Gen Cloud, AI & Web Engineering',
    alert: null,
    formData: {},
    errors: {}
  });
});

// POST /contact - Handle contact form submission
app.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  const errors = {};

  // Validation
  const trimmedName = (name || '').trim();
  const trimmedEmail = (email || '').trim();
  const trimmedSubject = (subject || '').trim();
  const trimmedMessage = (message || '').trim();

  if (!trimmedName || trimmedName.length < 2) {
    errors.name = 'Please provide your full name (at least 2 characters).';
  }

  if (!trimmedEmail) {
    errors.email = 'Please provide an email address.';
  } else if (!isValidEmail(trimmedEmail)) {
    errors.email = 'Please provide a valid email address (e.g., name@example.com).';
  }

  if (!trimmedMessage || trimmedMessage.length < 10) {
    errors.message = 'Please provide a message with at least 10 characters.';
  }

  // If validation errors exist, re-render with 400 and preserve form data
  if (Object.keys(errors).length > 0) {
    return res.status(400).render('index', {
      pageTitle: 'NovaTech Solutions | Next-Gen Cloud, AI & Web Engineering',
      alert: {
        type: 'danger',
        message: 'There were issues with your submission. Please correct the fields below and try again.'
      },
      formData: {
        name: trimmedName,
        email: trimmedEmail,
        subject: trimmedSubject,
        message: trimmedMessage
      },
      errors
    });
  }

  // Success: simulate email sending / DB save and render with success alert
  console.log('Contact form submission received:', {
    name: trimmedName,
    email: trimmedEmail,
    subject: trimmedSubject,
    message: trimmedMessage,
    timestamp: new Date().toISOString()
  });

  res.render('index', {
    pageTitle: 'NovaTech Solutions | Next-Gen Cloud, AI & Web Engineering',
    alert: {
      type: 'success',
      message: `Thank you, ${trimmedName}! Your message has been received. Our engineering team will get back to you within 24 hours.`
    },
    formData: {},
    errors: {}
  });
});

// 404 Handler - render 404.ejs for any unhandled routes
app.use((req, res) => {
  res.status(404).render('404', {
    pageTitle: '404 - Page Not Found | NovaTech Solutions',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Internal Server Error:', err);
  res.status(500).send('Internal Server Error');
});

// Start server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`NovaTech Solutions server is running at http://localhost:${PORT}`);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

module.exports = app;
