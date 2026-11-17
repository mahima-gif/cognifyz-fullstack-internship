const app = require('./server');
const http = require('http');

const PORT = 3456;
const server = http.createServer(app);

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  server.listen(PORT, async () => {
    console.log(`Test server running on port ${PORT}...`);
    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
      if (condition) {
        console.log(`[PASS] ${message}`);
        passed++;
      } else {
        console.error(`[FAIL] ${message}`);
        failed++;
      }
    }

    try {
      // Test 1: GET / returns 200 and all sections are present
      console.log('\n--- 1. Testing GET / ---');
      const getHome = await makeRequest({
        hostname: '127.0.0.1',
        port: PORT,
        path: '/',
        method: 'GET'
      });
      assert(getHome.statusCode === 200, `GET / returned HTTP status 200 (got ${getHome.statusCode})`);
      
      const sections = [
        'id="mainNavbar"',
        'id="home"',
        'id="about"',
        'id="services"',
        'id="portfolio"',
        'id="pricing"',
        'id="testimonials"',
        'id="team"',
        'id="faq"',
        'id="contact"',
        'site-footer'
      ];
      sections.forEach((sec) => {
        assert(getHome.body.includes(sec), `HTML contains section marker: ${sec}`);
      });

      // Check key components
      assert(getHome.body.includes('skip-link'), 'HTML contains skip-link for accessibility');
      assert(getHome.body.includes('themeToggleBtn'), 'HTML contains dark mode toggle button');
      assert(getHome.body.includes('navbar-toggler'), 'HTML contains mobile hamburger toggler');
      assert(getHome.body.includes('testimonialCarousel'), 'HTML contains Testimonials Carousel');
      assert(getHome.body.includes('faqAccordion'), 'HTML contains FAQ Accordion');
      assert(getHome.body.includes('pricing-popular'), 'HTML contains highlighted Pricing tier');
      assert(getHome.body.includes('portfolio-filter-buttons'), 'HTML contains portfolio filter buttons');
      assert(getHome.body.includes('custom.css'), 'HTML references /css/custom.css');
      assert(getHome.body.includes('main.js'), 'HTML references /js/main.js');

      // Test 2: GET /nonexistent returns 404
      console.log('\n--- 2. Testing GET /nonexistent ---');
      const get404 = await makeRequest({
        hostname: '127.0.0.1',
        port: PORT,
        path: '/nonexistent-random-route',
        method: 'GET'
      });
      assert(get404.statusCode === 404, `GET /nonexistent returned HTTP status 404 (got ${get404.statusCode})`);
      assert(get404.body.includes('404'), '404 response contains 404 indicator');
      assert(get404.body.includes('Endpoint Not Found'), '404 response contains Endpoint Not Found title');

      // Test 3: POST /contact with empty/invalid data shows error and preserves values
      console.log('\n--- 3. Testing POST /contact (Validation Failure) ---');
      const invalidData = 'name=A&email=invalid-email&subject=TestSubject&message=Short';
      const postInvalid = await makeRequest({
        hostname: '127.0.0.1',
        port: PORT,
        path: '/contact',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(invalidData)
        }
      }, invalidData);

      assert(postInvalid.statusCode === 400, `POST /contact invalid data returned HTTP status 400 (got ${postInvalid.statusCode})`);
      assert(postInvalid.body.includes('alert alert-danger'), 'Danger alert rendered in response');
      assert(postInvalid.body.includes('Please provide your full name (at least 2 characters).'), 'Name validation error displayed');
      assert(postInvalid.body.includes('Please provide a valid email address'), 'Email validation error displayed');
      assert(postInvalid.body.includes('Please provide a message with at least 10 characters.'), 'Message validation error displayed');
      assert(postInvalid.body.includes('value="A"'), 'Form preserved submitted name "A"');
      assert(postInvalid.body.includes('value="invalid-email"'), 'Form preserved submitted email "invalid-email"');
      assert(postInvalid.body.includes('value="TestSubject"'), 'Form preserved submitted subject "TestSubject"');
      assert(postInvalid.body.includes('>Short</textarea>'), 'Form preserved submitted message "Short"');

      // Test 4: POST /contact with valid data shows success alert
      console.log('\n--- 4. Testing POST /contact (Validation Success) ---');
      const validData = 'name=Mahima+Developer&email=mahima%40example.com&subject=Cloud+Modernization&message=We+are+seeking+a+cloud+architecture+audit+for+our+fintech+platform.';
      const postValid = await makeRequest({
        hostname: '127.0.0.1',
        port: PORT,
        path: '/contact',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(validData)
        }
      }, validData);

      assert(postValid.statusCode === 200, `POST /contact valid data returned HTTP status 200 (got ${postValid.statusCode})`);
      assert(postValid.body.includes('alert alert-success'), 'Success alert rendered in response');
      assert(postValid.body.includes('Thank you, Mahima Developer!'), 'Success alert greets user by name');
      assert(postValid.body.includes('value=""'), 'Form input cleared on success');

      console.log(`\n========================================`);
      console.log(`Tests Completed: ${passed} passed, ${failed} failed`);
      console.log(`========================================\n`);

      server.close();
      process.exit(failed > 0 ? 1 : 0);
    } catch (err) {
      console.error('Test execution error:', err);
      server.close();
      process.exit(1);
    }
  });
}

runTests();

