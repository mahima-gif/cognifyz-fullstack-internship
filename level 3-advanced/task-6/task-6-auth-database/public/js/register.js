import { checkAuth, register } from './auth.js';
import { showToast } from './ui.js';

// If user is already logged in, redirect straight to dashboard
checkAuth(false).then((user) => {
  if (user) {
    window.location.href = '/dashboard.html';
  }
});

const form = document.getElementById('register-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirm-password');
const submitBtn = document.getElementById('submit-btn');

const nameError = document.getElementById('name-error');
const emailError = document.getElementById('email-error');
const passwordError = document.getElementById('password-error');
const confirmError = document.getElementById('confirm-password-error');
const formAlert = document.getElementById('form-alert');

const clearErrors = () => {
  [nameInput, emailInput, passwordInput, confirmInput].forEach((el) => el.classList.remove('error'));
  [nameError, emailError, passwordError, confirmError].forEach((el) => {
    el.classList.remove('active');
    el.textContent = '';
  });
  if (formAlert) {
    formAlert.style.display = 'none';
    formAlert.textContent = '';
  }
};

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmInput.value;

  let hasError = false;

  // 1. Name validation (2 to 50 characters)
  if (!name || name.length < 2 || name.length > 50) {
    nameInput.classList.add('error');
    nameError.textContent = 'Name must be between 2 and 50 characters.';
    nameError.classList.add('active');
    hasError = true;
  }

  // 2. Email format validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailInput.classList.add('error');
    emailError.textContent = 'Please enter a valid email address.';
    emailError.classList.add('active');
    hasError = true;
  }

  // 3. Password complexity: min 8 chars, 1 letter, 1 number
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
  if (!password || !passwordRegex.test(password)) {
    passwordInput.classList.add('error');
    passwordError.textContent = 'Password must be at least 8 characters and include both a letter and a number.';
    passwordError.classList.add('active');
    hasError = true;
  }

  // 4. Password confirmation
  if (password !== confirmPassword) {
    confirmInput.classList.add('error');
    confirmError.textContent = 'Passwords do not match.';
    confirmError.classList.add('active');
    hasError = true;
  }

  if (hasError) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';

  try {
    await register(name, email, password);
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
    if (formAlert) {
      formAlert.textContent = err.message || 'Registration failed. Please check your inputs.';
      formAlert.style.display = 'block';
    }
  }
});
