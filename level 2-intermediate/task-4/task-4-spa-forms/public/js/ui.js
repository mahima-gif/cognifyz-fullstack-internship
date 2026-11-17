/**
 * ui.js
 * Reusable UI and DOM helpers: Toast notifications, Accessible Modal dialogs,
 * safe text rendering (XSS prevention), and utility functions.
 *
 * ============================================================================
 * SECURITY NOTE ON XSS PREVENTION:
 * Cross-Site Scripting (XSS) occurs when untrusted user input is injected directly
 * into HTML using properties like `innerHTML`, allowing malicious scripts to execute
 * in the context of the victim's session (stealing tokens, hijacking actions, etc.).
 *
 * To guarantee safety:
 * 1. User-supplied fields (e.g., name, username, bio, skills, search queries) are
 *    ALWAYS injected using `element.textContent` or sanitized via `escapeHTML()`.
 * 2. When creating DOM nodes dynamically, we construct real DOM elements with
 *    `document.createElement()` and set attributes and `textContent` directly,
 *    preventing any script tags or event attributes (`onerror=`, etc.) from running.
 * ============================================================================
 */

/**
 * Escapes unsafe HTML characters into safe HTML entities.
 * @param {string} str
 * @returns {string}
 */
export function escapeHTML(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Safely creates an HTML element with attributes and children.
 * @param {string} tag - Tag name
 * @param {Object} [attributes] - Key-value map of attributes or event listeners
 * @param {Array<string|Node>} [children] - Array of child text or nodes
 * @returns {HTMLElement}
 */
export function createElement(tag, attributes = {}, children = []) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attributes)) {
    if (key.startsWith("on") && typeof value === "function") {
      const eventName = key.substring(2).toLowerCase();
      el.addEventListener(eventName, value);
    } else if (key === "className" || key === "class") {
      el.className = value;
    } else if (key === "dataset" && typeof value === "object") {
      for (const [dataKey, dataVal] of Object.entries(value)) {
        el.dataset[dataKey] = dataVal;
      }
    } else if (key === "disabled" || key === "checked" || key === "required") {
      if (value) el.setAttribute(key, "");
      else el.removeAttribute(key);
    } else if (value !== null && value !== undefined) {
      el.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (typeof child === "string" || typeof child === "number") {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }

  return el;
}

/**
 * Debounce helper to throttle rapid user inputs (e.g. search box).
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/* ==========================================================================
   TOAST NOTIFICATION SYSTEM
   ========================================================================== */

class ToastManager {
  constructor() {
    this.container = null;
  }

  _getContainer() {
    if (!this.container) {
      this.container = document.getElementById("toast-container");
      if (!this.container) {
        this.container = createElement("div", {
          id: "toast-container",
          className: "toast-container",
          "aria-live": "polite",
          "aria-atomic": "true"
        });
        document.body.appendChild(this.container);
      }
    }
    return this.container;
  }

  /**
   * Shows a toast notification.
   * @param {string} message - Toast message
   * @param {"success"|"error"|"info"|"warning"} type - Type of toast
   * @param {number} duration - Auto-dismiss timeout in ms (default 4000)
   */
  show(message, type = "info", duration = 4000) {
    const container = this._getContainer();

    const toast = createElement("div", {
      className: `toast toast-${type}`,
      role: type === "error" ? "alert" : "status"
    });

    const iconMap = {
      success: "✓",
      error: "✕",
      info: "ℹ",
      warning: "⚠"
    };

    const icon = createElement("span", { className: "toast-icon" }, [iconMap[type] || "ℹ"]);
    
    // Safely insert message text via textContent (XSS protection)
    const textSpan = createElement("span", { className: "toast-message" }, [message]);

    const closeBtn = createElement(
      "button",
      {
        type: "button",
        className: "toast-close-btn",
        "aria-label": "Close notification",
        onClick: () => this.dismiss(toast)
      },
      ["×"]
    );

    toast.appendChild(icon);
    toast.appendChild(textSpan);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add("toast-visible");
    });

    let dismissTimer = null;
    if (duration > 0) {
      dismissTimer = setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }

    // Pause dismissal on mouse hover
    toast.addEventListener("mouseenter", () => {
      if (dismissTimer) clearTimeout(dismissTimer);
    });
    toast.addEventListener("mouseleave", () => {
      if (duration > 0) {
        dismissTimer = setTimeout(() => this.dismiss(toast), 2000);
      }
    });

    return toast;
  }

  dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.remove("toast-visible");
    toast.classList.add("toast-hiding");
    toast.addEventListener(
      "transitionend",
      () => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      },
      { once: true }
    );
  }
}

export const toast = new ToastManager();

/* ==========================================================================
   ACCESSIBLE MODAL DIALOG
   Features: Focus trap, Escape key to close, click-backdrop to close, focus restore
   ========================================================================== */

class ModalManager {
  constructor() {
    this.activeModal = null;
    this.previousFocusedElement = null;
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  /**
   * Opens an interactive confirmation modal.
   * @param {Object} options
   * @param {string} options.title
   * @param {string} options.message
   * @param {string} [options.confirmText="Confirm"]
   * @param {string} [options.cancelText="Cancel"]
   * @param {"danger"|"primary"} [options.confirmVariant="danger"]
   * @param {Function} options.onConfirm
   * @param {Function} [options.onCancel]
   */
  confirm({
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmVariant = "danger",
    onConfirm,
    onCancel
  }) {
    const content = createElement("div", { className: "modal-body-text" }, [message]);

    const actions = createElement("div", { className: "modal-actions" });

    const cancelBtn = createElement(
      "button",
      {
        type: "button",
        className: "btn btn-secondary",
        onClick: () => {
          this.close();
          if (onCancel) onCancel();
        }
      },
      [cancelText]
    );

    const confirmBtn = createElement(
      "button",
      {
        type: "button",
        className: `btn btn-${confirmVariant}`,
        onClick: () => {
          this.close();
          if (onConfirm) onConfirm();
        }
      },
      [confirmText]
    );

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    return this.open({
      title,
      body: content,
      footer: actions,
      initialFocusElement: cancelBtn
    });
  }

  /**
   * Opens a generic modal with custom content.
   */
  open({ title, body, footer, initialFocusElement = null, onClose = null }) {
    this.close(); // Close any currently open modal

    this.previousFocusedElement = document.activeElement;

    // Overlay backdrop
    const overlay = createElement("div", {
      className: "modal-backdrop",
      role: "presentation"
    });

    // Dialog container
    const dialog = createElement("div", {
      className: "modal-dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "modal-title"
    });

    // Header
    const header = createElement("div", { className: "modal-header" });
    const titleEl = createElement("h2", { id: "modal-title", className: "modal-title" }, [title]);
    const closeBtn = createElement(
      "button",
      {
        type: "button",
        className: "modal-close-btn",
        "aria-label": "Close modal",
        onClick: () => this.close()
      },
      ["×"]
    );
    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    // Body
    const bodyContainer = createElement("div", { className: "modal-body" });
    if (typeof body === "string") {
      bodyContainer.textContent = body;
    } else if (body instanceof Node) {
      bodyContainer.appendChild(body);
    }

    dialog.appendChild(header);
    dialog.appendChild(bodyContainer);

    if (footer) {
      const footerContainer = createElement("div", { className: "modal-footer" });
      if (footer instanceof Node) footerContainer.appendChild(footer);
      dialog.appendChild(footerContainer);
    }

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Backdrop click-to-close
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });

    this.activeModal = {
      overlay,
      dialog,
      onClose
    };

    // Keyboard listener for Escape & Focus trapping
    document.addEventListener("keydown", this._handleKeyDown);

    // Lock body scroll
    document.body.classList.add("modal-open");

    // Focus management
    requestAnimationFrame(() => {
      overlay.classList.add("modal-visible");
      if (initialFocusElement && typeof initialFocusElement.focus === "function") {
        initialFocusElement.focus();
      } else {
        const focusable = this._getFocusableElements(dialog);
        if (focusable.length > 0) focusable[0].focus();
      }
    });

    return {
      dialog,
      overlay,
      close: () => this.close()
    };
  }

  close() {
    if (!this.activeModal) return;

    const { overlay, onClose } = this.activeModal;
    document.removeEventListener("keydown", this._handleKeyDown);
    document.body.classList.remove("modal-open");

    overlay.classList.remove("modal-visible");
    overlay.classList.add("modal-hiding");

    overlay.addEventListener(
      "transitionend",
      () => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      },
      { once: true }
    );

    // Fallback cleanup if transition doesn't fire
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 300);

    // Restore focus
    if (this.previousFocusedElement && typeof this.previousFocusedElement.focus === "function") {
      this.previousFocusedElement.focus();
    }

    if (onClose) onClose();
    this.activeModal = null;
  }

  _handleKeyDown(e) {
    if (!this.activeModal) return;

    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
      return;
    }

    if (e.key === "Tab") {
      this._trapFocus(e);
    }
  }

  _getFocusableElements(container) {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    return Array.from(container.querySelectorAll(selector));
  }

  _trapFocus(e) {
    const focusable = this._getFocusableElements(this.activeModal.dialog);
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }
}

export const modal = new ModalManager();

