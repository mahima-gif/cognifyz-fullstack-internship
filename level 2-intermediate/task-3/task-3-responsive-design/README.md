# Task 3: Advanced CSS Styling and Responsive Design
## NovaTech Solutions — Landing Page

> **Level 2: Intermediate — Cognifyz Technologies Full Stack Web Development Internship**  
> **Project Name:** `task-3-responsive-design`  
> **Author:** Mahima  
> **Tech Stack:** Node.js, Express, EJS, Bootstrap 5.3.3, Bootstrap Icons, Custom Advanced CSS, Vanilla JavaScript

---

## 1. Project Overview

**NovaTech Solutions** is a high-performance, responsive, multi-section landing page designed for a modern digital engineering and cloud architecture consultancy. The application demonstrates intermediate and advanced front-end capabilities, pairing the stability and responsive layout grid of **Bootstrap 5** with custom modern CSS techniques—including CSS Custom Properties, Dark Mode theming, `@keyframes` animations, Glassmorphism, CSS Grid, fluid typography with `clamp()`, and accessibility best practices.

The site is served by an Express server with EJS templating and partials, complete with server-side form validation and custom 404 routing.

---

## 2. Setup & Installation Steps

### Prerequisites
- [Node.js](https://nodejs.org/) (version 16.x or higher)
- [npm](https://www.npmjs.com/) (version 8.x or higher)

### Installation
1. Open your terminal and navigate to the project directory:
   ```bash
   cd task-3-responsive-design
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server with live reload:
   ```bash
   npm run dev
   ```
   Or run the standard production start script:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 3. Folder Structure

```
task-3-responsive-design/
├── package.json               # Node.js project manifest & scripts
├── server.js                  # Express server, route handling & validation
├── README.md                  # Comprehensive technical documentation
├── views/
│   ├── index.ejs              # Main landing page with all 10 semantic sections
│   ├── 404.ejs                # Custom 404 error page
│   └── partials/
│       ├── head.ejs           # Meta tags, CDN links, theme-loader & skip link
│       ├── navbar.ejs         # Sticky glassmorphic navbar with theme toggle
│       └── footer.ejs         # Multi-column footer & back-to-top trigger
└── public/
    ├── css/
    │   └── custom.css         # Advanced CSS stylesheet (theming, animations, grid)
    ├── js/
    │   └── main.js            # Vanilla JS (dark mode, counters, filter, scroll-spy)
    └── images/                # Static assets directory (favicons, SVGs)
```

---

## 4. Page Sections Breakdown

1. **Sticky Header & Navbar (`#mainNavbar`):**
   - Brand logo with inline vector shield icon.
   - Smooth-scrolling anchor navigation links with animated underline transitions.
   - Interactive Dark / Light mode toggle switch.
   - Mobile hamburger collapse menu.
   - Direct CTA button ("Get in Touch").
2. **Hero Section (`#home`):**
   - Animated ambient gradient background mesh.
   - Main headline featuring fluid typography (`clamp()`) and animated gradient text.
   - Dual Call-to-Action buttons with pulsing keyframe glow.
   - Floating isometric cloud architecture SVG artwork with live orbiting/pulsing badges.
   - Trust proof badge with customer review stars.
3. **About Section (`#about`):**
   - Two-column responsive layout.
   - Engineering mission statement and core capability checklist.
   - Four interactive key metric stat cards with animated numerical counters (Projects, Retention, Enterprise Partners, 24/7 Monitoring).
4. **Services Section (`#services`):**
   - Responsive 6-card grid with custom icons (Cloud DevOps, Full Stack Web, AI/ML, Mobile Platforms, Cybersecurity, and UI/UX Design).
   - Interactive hover cards featuring vertical lift, shadow depth, and icon rotation.
5. **Portfolio / Projects Section (`#portfolio`):**
   - Category filtering bar (`All`, `Web Platforms`, `Mobile Apps`, `AI Systems`).
   - CSS Grid layout of 6 cards styled with rich CSS gradients.
   - Translucent glassmorphic hover overlay revealing tech stacks and case study buttons.
6. **Pricing Plans Section (`#pricing`):**
   - Three distinct retainer tiers: *Startup MVP*, *Growth Scale*, and *Enterprise Custom*.
   - Center card ("Growth Scale") highlighted with **Glassmorphism**, floating "Most Popular" ribbon, glowing border, and hover scale.
7. **Client Testimonials (`#testimonials`):**
   - Bootstrap Carousel with custom circular slide indicators and SVG quote marks.
   - Real-world testimonials from CTOs and engineering directors with custom initial avatars.
8. **Engineering Leadership / Team (`#team`):**
   - Four leadership cards with CSS-only geometric gradient avatars (`ER`, `MV`, `SL`, `DA`).
   - Roles, bios, and interactive social media link buttons.
9. **Frequently Asked Questions (`#faq`):**
   - Bootstrap Accordion customized with themed border glow, smooth collapse, and dark mode arrow styling.
   - 5 comprehensive technical answers covering security, sprints, IP ownership, and SLAs.
10. **Contact & Engineering Brief (`#contact`):**
    - Two-column layout with office address, direct email, phone, and real-time operational status badge ("All Systems Operational").
    - Contact form using Bootstrap floating labels (`form-floating`).
    - Server-side validation with field-level invalid feedback and input value preservation on error.
11. **Footer (`site-footer`):**
    - Four responsive columns: Brand & Socials, Company Navigation, Engineering Capabilities, and Newsletter form.
    - Copyright bar and legal links.
    - Floating back-to-top button.

---

## 5. Advanced CSS Techniques Matrix

| CSS Technique | Implementation Details | Where It Appears in Project |
| :--- | :--- | :--- |
| **CSS Custom Properties (Variables)** | Centralized design tokens for colors, RGB channels, spacing, shadows, radii, and fonts. Swapped seamlessly under `[data-theme="dark"]`. | `:root` & `[data-theme="dark"]` in `custom.css` across all components |
| **Dark Mode Theming** | Dynamic variable inversion attached to `html[data-theme]`. Checks `localStorage`, falls back to OS `prefers-color-scheme`, and avoids flash. | Whole page, Navbar, Cards, Accordion, Inputs, Footer |
| **Fluid Typography (`clamp()`)** | Responsive scaling without abrupt media query jumps: `font-size: clamp(2.1rem, 4.2vw + 1rem, 3.75rem)`. | Hero headline (`.hero-title`), section titles (`.section-title`), 404 title |
| **Transitions** | Smooth cubic-bezier transitions on hover for button scaling, card lift (`translateY(-8px)`), and color shifts. | `.service-card`, `.stat-card`, `.portfolio-card`, `.btn-primary-gradient` |
| **Animated Underline** | Pseudo-element `::after` with `width: 0` scaling to `width: 80%` and centering on hover/active state. | Main Navbar navigation links (`.navbar-nav .nav-link`) |
| **Keyframe Animations (`@keyframes`)** | `gradientShift`, `floatGraphic`, `floatBadgeOpposite`, `pulseGlow`, `pulseCore`, `floatNodeLeft/Right`. | Hero SVG illustration, background mesh blobs, pulsing CTA button |
| **CSS Grid** | Purposeful two-dimensional layout grids (`grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`). | Portfolio gallery (`.portfolio-grid`) and About stats (`.stats-grid`) |
| **CSS Flexbox** | One-dimensional alignment and distribution across rows and columns. | Navbar items, Hero CTA group, Stat card layouts, Testimonial cards, Footer columns |
| **Glassmorphism** | `backdrop-filter: blur(...)`, translucent RGBA backgrounds, and delicate 1px border highlights. | Navbar, Hero floating badges, Portfolio hover overlay, Pricing "Most Popular" card |
| **Gradient Text Clipping** | `background: linear-gradient(...)`, `-webkit-background-clip: text`, `color: transparent`. | Hero headline ("Resilient Digital"), 404 Glitch Badge |
| **Custom Scrollbar** | `::-webkit-scrollbar` styling with gradient thumb and theme-matched track, plus Firefox `scrollbar-width: thin`. | Global HTML scrollbar |
| **Motion Accessibility** | `@media (prefers-reduced-motion: reduce)` zeroes animation durations and disables transforms. | Global stylesheet override at bottom of `custom.css` |

---

## 6. Responsive Breakpoints & Adaptability

The project adheres to a **mobile-first** responsive architecture. The layout is optimized and tested across all standard viewport widths:

| Breakpoint | Target Screen Type | Key Layout Adaptation |
| :--- | :--- | :--- |
| **`< 576px` (360px – 375px)** | Mobile Portrait | Single column stats, vertical stacked CTA buttons, static inline hero badges, hamburger menu active, compact section padding. |
| **`576px – 767px`** | Large Phones & Phablets | 2-column stats grid, 2-column portfolio grid, stacked contact layout. |
| **`768px – 991px`** | Tablets (iPad / Galaxy Tab) | 2-column services, 2-column portfolio, full width accordion, expanded contact cards. |
| **`992px – 1199px`** | Small Laptops & Desktops | Full horizontal navigation bar, 3-column services grid, 3-column portfolio grid, 3-tier side-by-side pricing, 2-column contact. |
| **`≥ 1200px`** | Standard Desktop | Full container width with breathing room, elevated hero isometric illustration, desktop CTA in navbar. |
| **`≥ 1400px`** | Ultrawide Displays | Max-width capped container (`1320px`) preventing excessive stretching, hero title locked at optimal fluid size. |

*Zero horizontal scrolling (`overflow-x: hidden`) is maintained across all screen widths.*

---

## 7. How Bootstrap and Custom CSS Work Together

- **Bootstrap 5.3.3 Role:** Provides foundational scaffolding—responsive grid (`container`, `row`, `col-*`), flexbox utilities, modal/collapse mechanics (`navbar-toggler`), Carousel scripting, and Accordion state management.
- **Custom CSS (`custom.css`) Role:** Rather than modifying Bootstrap source files, custom CSS extends and overrides classes through the CSS cascade using modern CSS variables. Custom styles inject:
  1. The dark mode theme system via CSS variables (`--bg-body`, `--text-primary`, etc.).
  2. High-fidelity visual aesthetics (glassmorphism, gradient text, glowing borders).
  3. Interactive micro-animations, hover lifts, and keyframe motions.
  4. Non-standard CSS Grid implementations for the portfolio and stats components.

---

## 8. Server Routes & Validation

- `GET /` — Renders `index.ejs` with all 10 sections.
- `POST /contact` — Accepts `name`, `email`, `subject`, and `message`.
  - Validates `name` (minimum 2 chars), `email` (proper regex format), and `message` (minimum 10 chars).
  - On error: Returns HTTP status `400`, displays a Bootstrap danger alert, highlights invalid fields, and preserves all user-submitted form data.
  - On success: Returns HTTP status `200`, displays a success alert, logs the submission, and clears the form.
- `GET /*` (Catch-All) — Returns custom `404.ejs` with HTTP status `404`.

---

## 9. Verification & Quality Checklist

- [x] Semantic HTML5 landmarks (`header`, `nav`, `main`, `section`, `article`, `footer`).
- [x] Skip-to-content accessibility link.
- [x] High color contrast in both Light and Dark themes.
- [x] Zero remote image dependencies (all graphics use inline SVG or CSS gradients).
- [x] HTML escaping with `<%= %>` preventing XSS vulnerabilities.
- [x] Fully functional offline (CDN files are cached or fall back gracefully).

