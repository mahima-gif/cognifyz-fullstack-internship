import { checkAuth, login } from './auth.js';
import { showToast } from './ui.js';

// If user is already logged in, redirect straight to dashboard
checkAuth(false).then((user) => {
  if (user) {
    window.location.href = '/dashboard.html';
  }
});

const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');

const emailError = document.getElementById('email-error');
const passwordError = document.getElementById('password-error');
const formAlert = document.getElementById('form-alert');

const clearErrors = () => {
  emailInput.classList.remove('error');
  passwordInput.classList.remove('error');
  emailError.classList.remove('active');
  passwordError.classList.remove('active');
  emailError.textContent = '';
  passwordError.textContent = '';
  if (formAlert) {
    formAlert.style.display = 'none';
    formAlert.textContent = '';
  }
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  let hasError = false;

  // Client-side validation
  if (!email) {
    emailInput.classList.add('error');
    emailError.textContent = 'Email address is required.';
    emailError.classList.add('active');
    hasError = true;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailInput.classList.add('error');
    emailError.textContent = 'Please enter a valid email format.';
    emailError.classList.add('active');
    hasError = true;
  }

  if (!password) {
    passwordInput.classList.add('error');
    passwordError.textContent = 'Password is required.';
    passwordError.classList.add('active');
    hasError = true;
  }

  if (hasError) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in...';

  try {
    await login(email, password);
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
    if (formAlert) {
      formAlert.textContent = err.message || 'Login failed. Please check your credentials.';
      formAlert.style.display = 'block';
    }
  }
});
