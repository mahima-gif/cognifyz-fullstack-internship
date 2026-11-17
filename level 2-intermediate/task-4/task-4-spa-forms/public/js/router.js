/**
 * router.js
 * Client-Side Single Page Application (SPA) Router using the HTML5 History API.
 *
 * ============================================================================
 * HOW THE ROUTER WORKS:
 * 1. Declarative Navigation:
 *    Any anchor tag `<a href="..." data-link>` is intercepted via global event
 *    delegation. The router prevents the default browser full-page reload, calls
 *    `history.pushState({}, "", href)`, and triggers the internal route handler.
 *
 * 2. Browser History Integration (Back & Forward):
 *    Listens to the `popstate` event dispatched by the browser when the user clicks
 *    Back or Forward, matching the new `window.location.pathname` and re-rendering.
 *
 * 3. Lifecycle & Accessibility Management:
 *    On every route transition:
 *    - Updates `document.title` to provide clear context.
 *    - Highlights the corresponding active navigation link (`aria-current="page"`).
 *    - Scrolls the window smoothly to the top.
 *    - Transfers focus (`tabIndex = -1; heading.focus()`) to the main page heading
 *      so screen readers and keyboard users immediately know the view updated.
 *    - Triggers a CSS fade transition for smooth visual feedback.
 *
 * 4. Navigation Guards:
 *    Allows registering a `guard` callback (e.g., checking if the registration form
 *    has unsaved data). If dirty, the user is prompted to confirm before leaving.
 * ============================================================================
 */

export class Router {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.appContainer - Container element where views are mounted
   * @param {Object} options.routes - Route mapping: path -> { title: string, render: function, init?: function }
   */
  constructor({ appContainer, routes }) {
    this.appContainer = appContainer;
    this.routes = routes;
    this.currentPath = null;
    this.unsavedChangesGuard = null;

    this._init();
  }

  /**
   * Registers a function that returns true if there are unsaved changes.
   * @param {Function} guardFn - Returns boolean
   */
  setUnsavedChangesGuard(guardFn) {
    this.unsavedChangesGuard = guardFn;
  }

  /**
   * Navigates programmatically to a new path.
   * @param {string} path
   * @param {boolean} [replace=false]
   */
  navigate(path, replace = false) {
    if (this._checkGuardBlocked(path)) {
      return false;
    }

    if (replace) {
      window.history.replaceState({}, "", path);
    } else {
      window.history.pushState({}, "", path);
    }
    this._handleRouteChange();
    return true;
  }

  _init() {
    // Intercept clicks on links with [data-link]
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a[data-link]");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("//") || href.startsWith("mailto:")) {
        return; // External or non-routed links continue as normal
      }

      e.preventDefault();

      // Avoid redundant transition if clicking the same route
      if (window.location.pathname === href) {
        return;
      }

      if (this._checkGuardBlocked(href)) {
        return;
      }

      this.navigate(href);
    });

    // Handle browser Back / Forward buttons
    window.addEventListener("popstate", () => {
      // For popstate, if user cancels leaving dirty form, we can push current state back
      if (this.unsavedChangesGuard && this.unsavedChangesGuard()) {
        const confirmed = window.confirm(
          "You have unsaved changes in your registration form. Are you sure you want to discard them and navigate away?"
        );
        if (!confirmed) {
          // Re-push current path to prevent moving back
          window.history.pushState(null, "", this.currentPath);
          return;
        }
      }
      this._handleRouteChange();
    });

    // Handle beforeunload to guard page reloads or closing tab when dirty
    window.addEventListener("beforeunload", (e) => {
      if (this.unsavedChangesGuard && this.unsavedChangesGuard()) {
        e.preventDefault();
        e.returnValue = "";
      }
    });

    // Initial render based on starting URL
    this._handleRouteChange();
  }

  _checkGuardBlocked(targetPath) {
    if (this.unsavedChangesGuard && typeof this.unsavedChangesGuard === "function") {
      const isDirty = this.unsavedChangesGuard();
      if (isDirty && this.currentPath !== targetPath) {
        const confirmed = window.confirm(
          "You have unsaved changes in your registration form. Are you sure you want to leave and lose your progress?"
        );
        return !confirmed;
      }
    }
    return false;
  }

  _handleRouteChange() {
    const rawPath = window.location.pathname || "/";
    // Normalize path (strip trailing slash if not root)
    const normalizedPath = rawPath.length > 1 && rawPath.endsWith("/") ? rawPath.slice(0, -1) : rawPath;

    this.currentPath = normalizedPath;

    // Match route or fallback to 404
    const route = this.routes[normalizedPath] || this.routes["*"] || {
      title: "Page Not Found - ProfileHub",
      render: () => "<h1>404 - Page Not Found</h1>"
    };

    // Update document title
    document.title = route.title || "ProfileHub";

    // Play view transition: remove old, set content, trigger fade-in
    this.appContainer.classList.remove("view-fade-in");
    this.appContainer.innerHTML = route.render();

    // Trigger animation
    requestAnimationFrame(() => {
      this.appContainer.classList.add("view-fade-in");
    });

    // Update active navigation state
    this._updateActiveNavLinks(normalizedPath);

    // Scroll to top
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // Focus heading for accessibility (WCAG screen-reader routing compliance)
    this._focusMainHeading();

    // Invoke view-specific initialization (e.g. attaching DOM events, loading data)
    if (typeof route.init === "function") {
      route.init({ router: this, path: normalizedPath });
    }
  }

  _updateActiveNavLinks(currentPath) {
    const navLinks = document.querySelectorAll(".nav-link[data-link]");
    navLinks.forEach((link) => {
      const href = link.getAttribute("href");
      const isActive = href === currentPath;

      if (isActive) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      } else {
        link.classList.remove("active");
        link.removeAttribute("aria-current");
      }
    });
  }

  _focusMainHeading() {
    const heading = this.appContainer.querySelector("h1, .page-title, .hero-title");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }
}

