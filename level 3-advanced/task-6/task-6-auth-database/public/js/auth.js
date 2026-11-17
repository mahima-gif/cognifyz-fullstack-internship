/**
 * Authentication Module (Session check, Login, Register, Logout)
 */
import { api } from './api.js';
import { showToast } from './ui.js';

/**
 * Verify user session and fetch current profile.
 * Redirects to login.html if authentication is required but missing.
 * @param {boolean} [redirectIfUnauthorized=true]
 * @returns {Promise<Object|null>} The user profile object
 */
export const checkAuth = async (redirectIfUnauthorized = true) => {
  try {
    const res = await api.get('/auth/me');
    return res.data.user;
  } catch (error) {
    if (error.status === 401 && redirectIfUnauthorized) {
      localStorage.removeItem('securetasks_token');
      window.location.href = '/login.html';
    }
    return null;
  }
};

/**
 * Perform User Login
 * @param {string} email
 * @param {string} password
 */
export const login = async (email, password) => {
  try {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.token) {
      localStorage.setItem('securetasks_token', res.data.token);
    }
    showToast('Login successful! Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 600);
    return res.data.user;
  } catch (error) {
    showToast(error.message, 'error');
    throw error;
  }
};

/**
 * Perform User Registration
 * @param {string} name
 * @param {string} email
 * @param {string} password
 */
export const register = async (name, email, password) => {
  try {
    const res = await api.post('/auth/register', { name, email, password });
    if (res.data?.token) {
      localStorage.setItem('securetasks_token', res.data.token);
    }
    showToast('Registration successful! Welcome!', 'success');
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 600);
    return res.data.user;
  } catch (error) {
    showToast(error.message, 'error');
    throw error;
  }
};

/**
 * Perform User Logout
 */
export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.warn('Logout API warning:', error.message);
  } finally {
    localStorage.removeItem('securetasks_token');
    showToast('Logged out successfully', 'info');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 400);
  }
};
