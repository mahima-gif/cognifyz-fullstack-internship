/**
 * =============================================================================
 * NovaTech Solutions - Main JavaScript Application File
 * Task 3: Advanced CSS Styling and Responsive Design (Cognifyz Internship)
 * 
 * Features:
 *  1. Dark / Light Mode Theme Toggle (LocalStorage + System Preference)
 *  2. Navbar Background Transition & Shrink on Scroll
 *  3. Active Navigation Link Highlighting via ScrollSpy IntersectionObserver
 *  4. Scroll Reveal Animations with Staggered Delays
 *  5. Animated Number Counters for Key Performance Stats
 *  6. Interactive Portfolio Category Filtering
 *  7. Floating Back-to-Top Button
 *  8. Mobile Navigation Auto-Collapse on Link Click
 * =============================================================================
 */

(function () {
  'use strict';

  // Wait until DOM is fully loaded
  document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initNavbarScroll();
    initNavScrollSpy();
    initScrollReveal();
    initStatsCounters();
    initPortfolioFilter();
    initBackToTop();
    initMobileNavCloser();
  });

  /* ===========================================================================
     1. DARK / LIGHT THEME TOGGLE
     Handles persistent theme switching with localStorage and system preference.
     =========================================================================== */
  function initThemeToggle() {
    const toggleBtn = document.getElementById('themeToggleBtn');
    if (!toggleBtn) return;

    // Read current theme from HTML data-theme attribute
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

    toggleBtn.addEventListener('click', () => {
      const activeTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = activeTheme === 'dark' ? 'light' : 'dark';

      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('novatech-theme', newTheme);
    });

    // Listen for operating system theme changes if user has no stored preference
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('novatech-theme')) {
          const systemTheme = e.matches ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', systemTheme);
        }
      });
    }
  }

  /* ===========================================================================
     2. NAVBAR SCROLL STYLING
     Adds a shadow and shrinks navbar padding when scrolling past 40px.
     =========================================================================== */
  function initNavbarScroll() {
    const navbar = document.getElementById('mainNavbar');
    if (!navbar) return;

    const handleScroll = () => {
      if (window.scrollY > 40) {
        navbar.classList.add('navbar-scrolled');
      } else {
        navbar.classList.remove('navbar-scrolled');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
  }

  /* ===========================================================================
     3. ACTIVE NAV LINK HIGHLIGHTING
     Highlights the current section link as the user scrolls through the page.
     =========================================================================== */
  function initNavScrollSpy() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    if (!sections.length || !navLinks.length) return;

    const onScrollSpy = () => {
      const scrollPos = window.scrollY + 120; // Offset for navbar

      sections.forEach((section) => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');

        if (scrollPos >= top && scrollPos < top + height) {
          navLinks.forEach((link) => {
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
              link.setAttribute('aria-current', 'page');
            } else {
              link.classList.remove('active');
              link.removeAttribute('aria-current');
            }
          });
        }
      });
    };

    window.addEventListener('scroll', onScrollSpy, { passive: true });
    onScrollSpy();
  }

  /* ===========================================================================
     4. SCROLL REVEAL ANIMATIONS (IntersectionObserver)
     Staggers animations as elements enter the viewport.
     =========================================================================== */
  function initScrollReveal() {
    const revealElements = document.querySelectorAll('.scroll-reveal');
    if (!revealElements.length) return;

    // Fallback if browser doesn't support IntersectionObserver
    if (!('IntersectionObserver' in window)) {
      revealElements.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = parseInt(el.getAttribute('data-delay') || '0', 10);

            if (delay > 0) {
              setTimeout(() => {
                el.classList.add('is-revealed');
              }, delay);
            } else {
              el.classList.add('is-revealed');
            }

            obs.unobserve(el); // Animate once
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    revealElements.forEach((el) => observer.observe(el));
  }

  /* ===========================================================================
     5. ANIMATED NUMBER COUNTERS
     Smooth numerical counter triggered when the stats grid becomes visible.
     =========================================================================== */
  function initStatsCounters() {
    const counters = document.querySelectorAll('.counter-number');
    if (!counters.length) return;

    let hasAnimated = false;

    const animateCounters = () => {
      counters.forEach((counter) => {
        const target = parseInt(counter.getAttribute('data-target') || '0', 10);
        const duration = 1800; // Animation duration in ms
        const startTime = performance.now();

        const updateCount = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out quad calculation
          const easeOutQuad = 1 - (1 - progress) * (1 - progress);
          const currentVal = Math.floor(easeOutQuad * target);

          counter.textContent = currentVal.toLocaleString();

          if (progress < 1) {
            requestAnimationFrame(updateCount);
          } else {
            counter.textContent = target.toLocaleString();
          }
        };

        requestAnimationFrame(updateCount);
      });
    };

    if ('IntersectionObserver' in window) {
      const statsObserver = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !hasAnimated) {
              hasAnimated = true;
              animateCounters();
              obs.disconnect();
            }
          });
        },
        { threshold: 0.3 }
      );

      const statsGrid = document.querySelector('.stats-grid');
      if (statsGrid) statsObserver.observe(statsGrid);
    } else {
      animateCounters();
    }
  }

  /* ===========================================================================
     6. PORTFOLIO CATEGORY FILTERING
     Filters projects by category with smooth fade transitions.
     =========================================================================== */
  function initPortfolioFilter() {
    const filterButtons = document.querySelectorAll('.portfolio-filter-buttons .btn-filter');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    if (!filterButtons.length || !portfolioItems.length) return;

    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        // Toggle active button class
        filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const filterValue = btn.getAttribute('data-filter');

        portfolioItems.forEach((item) => {
          const category = item.getAttribute('data-category');

          if (filterValue === 'all' || category === filterValue) {
            item.style.opacity = '0';
            item.classList.remove('is-hidden');
            setTimeout(() => {
              item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
              item.style.opacity = '1';
              item.style.transform = 'scale(1)';
            }, 50);
          } else {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.95)';
            setTimeout(() => {
              item.classList.add('is-hidden');
            }, 300);
          }
        });
      });
    });
  }

  /* ===========================================================================
     7. FLOATING BACK-TO-TOP BUTTON
     Appears after scrolling down and smooth scrolls back to top when clicked.
     =========================================================================== */
  function initBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');
    if (!backToTopBtn) return;

    window.addEventListener(
      'scroll',
      () => {
        if (window.scrollY > 350) {
          backToTopBtn.classList.add('is-visible');
        } else {
          backToTopBtn.classList.remove('is-visible');
        }
      },
      { passive: true }
    );

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  /* ===========================================================================
     8. MOBILE NAVIGATION AUTO-COLLAPSE
     Automatically closes the Bootstrap mobile menu when an anchor link is clicked.
     =========================================================================== */
  function initMobileNavCloser() {
    const navCollapse = document.getElementById('navbarContent');
    if (!navCollapse) return;

    const navLinks = navCollapse.querySelectorAll('.nav-link');
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        // Check if Bootstrap collapse is currently open
        if (navCollapse.classList.contains('show')) {
          // If Bootstrap's JS Collapse is available, trigger hide
          if (window.bootstrap && window.bootstrap.Collapse) {
            const bsCollapse = window.bootstrap.Collapse.getInstance(navCollapse);
            if (bsCollapse) {
              bsCollapse.hide();
            }
          } else {
            navCollapse.classList.remove('show');
          }
        }
      });
    });
  }
})();

