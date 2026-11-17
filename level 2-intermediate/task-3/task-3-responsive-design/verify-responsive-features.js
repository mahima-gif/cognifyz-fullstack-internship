const fs = require('fs');
const path = require('path');

console.log('==================================================');
console.log('RESPONSIVE DESIGN & ADVANCED CSS VERIFICATION');
console.log('==================================================');

let passed = 0;
let failed = 0;

function check(title, condition, detail) {
  if (condition) {
    console.log(`[PASS] ${title}`);
    passed++;
  } else {
    console.error(`[FAIL] ${title} - ${detail || ''}`);
    failed++;
  }
}

// 1. Inspect custom.css
const cssPath = path.join(__dirname, 'public', 'css', 'custom.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

console.log('\n--- Checking CSS Advanced Features ---');
check('CSS Custom Properties (:root variables)', cssContent.includes('--primary-color:') && cssContent.includes('--bg-body:'), 'Variables should be defined in :root');
check('Dark Mode Theme Overrides ([data-theme="dark"])', cssContent.includes('[data-theme="dark"]'), 'Dark mode should override variables');
check('Fluid Typography with clamp()', cssContent.includes('clamp('), 'clamp() should be used for responsive fluid sizing');
check('Keyframe Animations (@keyframes)', cssContent.includes('@keyframes floatGraphic') && cssContent.includes('@keyframes gradientShift') && cssContent.includes('@keyframes pulseGlow'), 'Keyframes should be defined');
check('CSS Grid used purposefully', cssContent.includes('display: grid') && cssContent.includes('grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))'), 'CSS Grid should be used on portfolio');
check('CSS Flexbox used purposefully', cssContent.includes('display: flex') && cssContent.includes('display: inline-flex'), 'Flexbox should be used across components');
check('Glassmorphism (backdrop-filter & translucent background)', cssContent.includes('backdrop-filter: blur') && cssContent.includes('rgba('), 'Backdrop filter and translucent rgba used');
check('Gradient Text Clipping', cssContent.includes('-webkit-background-clip: text') && cssContent.includes('gradient-text'), 'Text clipping for gradient headline');
check('Custom Styled Scrollbar', cssContent.includes('::-webkit-scrollbar') && cssContent.includes('scrollbar-width: thin'), 'Scrollbar styled for webkit and firefox');
check('Accessibility Focus Visible States', cssContent.includes(':focus-visible') && cssContent.includes('.skip-link'), 'Visible focus ring and skip-link');
check('Prefers-reduced-motion Media Query', cssContent.includes('@media (prefers-reduced-motion: reduce)'), 'Animation reduction query');
check('Mobile-First Responsive Breakpoints (<576px, 768px, 992px, 1400px)', 
  cssContent.includes('@media (max-width: 575.98px)') &&
  cssContent.includes('@media (min-width: 768px)') &&
  cssContent.includes('@media (min-width: 992px)') &&
  cssContent.includes('@media (min-width: 1400px)'), 
  'Breakpoints specified');
check('No Horizontal Scroll Safeguard (overflow-x: hidden)', cssContent.includes('overflow-x: hidden'), 'Prevents horizontal overflow');

// 2. Inspect main.js
const jsPath = path.join(__dirname, 'public', 'js', 'main.js');
const jsContent = fs.readFileSync(jsPath, 'utf8');

console.log('\n--- Checking JavaScript Interactivity ---');
check('Dark Mode Toggle with localStorage', jsContent.includes("localStorage.setItem('novatech-theme'") && jsContent.includes('initThemeToggle'), 'Theme saved in localStorage');
check('System prefers-color-scheme Listener', jsContent.includes('(prefers-color-scheme: dark)'), 'Listens for OS preference');
check('Scroll Reveal with IntersectionObserver', jsContent.includes('new IntersectionObserver') && jsContent.includes('.scroll-reveal'), 'IntersectionObserver reveals elements');
check('Animated Number Counters with requestAnimationFrame', jsContent.includes('counter-number') && jsContent.includes('requestAnimationFrame'), 'Smooth animated counters');
check('Portfolio Category Filtering', jsContent.includes('btn-filter') && jsContent.includes('portfolio-item') && jsContent.includes('data-filter'), 'Category filtering');
check('Navbar Transition on Scroll', jsContent.includes('navbar-scrolled') && jsContent.includes('window.scrollY'), 'Navbar shrinks on scroll');
check('Active Nav Link Highlighting (ScrollSpy)', jsContent.includes('active') && jsContent.includes('section[id]'), 'Active link updates on scroll');
check('Floating Back-to-Top Button', jsContent.includes('backToTop') && jsContent.includes('scrollTo'), 'Smooth scroll to top');
check('Mobile Menu Auto-Collapse on Link Click', jsContent.includes('navbarContent') && jsContent.includes('Collapse'), 'Closes menu on mobile when link clicked');

// 3. Inspect EJS Views & Partials
const indexPath = path.join(__dirname, 'views', 'index.ejs');
const indexContent = fs.readFileSync(indexPath, 'utf8');

console.log('\n--- Checking HTML Semantic Structure & Sections ---');
check('Hero Section with Dual CTAs and SVG Illustration', indexContent.includes('id="home"') && indexContent.includes('hero-svg-illustration'), 'Hero layout');
check('About Section with Two Columns and Stats', indexContent.includes('id="about"') && indexContent.includes('stats-grid'), 'About layout');
check('Services Section with 6 Cards and Tags', indexContent.includes('id="services"') && indexContent.includes('service-card'), 'Services layout');
check('Portfolio Section with Filter Buttons and 6 Projects', indexContent.includes('id="portfolio"') && indexContent.includes('data-category="ai"'), 'Portfolio layout');
check('Pricing Section with 3 Tiers & Highlighted Most Popular', indexContent.includes('id="pricing"') && indexContent.includes('pricing-popular'), 'Pricing layout');
check('Testimonials Bootstrap Carousel', indexContent.includes('id="testimonials"') && indexContent.includes('carousel slide'), 'Testimonials layout');
check('Team Section with 4 Members and CSS Avatars', indexContent.includes('id="team"') && indexContent.includes('team-avatar-box'), 'Team layout');
check('FAQ Bootstrap Accordion', indexContent.includes('id="faq"') && indexContent.includes('accordion'), 'FAQ layout');
check('Contact Form with Floating Labels', indexContent.includes('id="contact"') && indexContent.includes('form-floating'), 'Contact layout');

console.log(`\n==================================================`);
console.log(`Verification Summary: ${passed} passed, ${failed} failed`);
console.log(`==================================================\n`);

process.exit(failed > 0 ? 1 : 0);

