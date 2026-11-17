/**
 * UI Utilities Module (Toast notifications, Modals, Formatters)
 */

// Toast Container singleton
let toastContainer = null;

const getToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
};

/**
 * Display a user toast message with security-safe textContent
 * @param {string} message - Toast message text
 * @param {'success'|'error'|'warning'|'info'} [type='info'] - Style variant
 * @param {number} [duration=4000] - Duration in ms before dismissing
 */
export const showToast = (message, type = 'info', duration = 4000) => {
  const container = getToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = document.createElement('span');
  icon.style.fontWeight = 'bold';
  if (type === 'success') icon.textContent = '✓';
  else if (type === 'error') icon.textContent = '✕';
  else if (type === 'warning') icon.textContent = '⚠';
  else icon.textContent = 'ℹ';

  const textSpan = document.createElement('span');
  /**
   * SECURITY NOTE: Using textContent to prevent Stored / Reflected XSS.
   * Server messages or user inputs are strictly rendered as text,
   * completely neutralizing any injected script tags or HTML entities.
   */
  textSpan.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(textSpan);
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
};

/**
 * Open a modal dialog
 * @param {string} modalId - Element ID of the modal backdrop
 */
export const openModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

/**
 * Close a modal dialog
 * @param {string} modalId - Element ID of the modal backdrop
 */
export const closeModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
};

/**
 * Format ISO date string into readable local representation
 * @param {string|Date} dateStr
 * @returns {string} Formatted date
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return 'No due date';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
