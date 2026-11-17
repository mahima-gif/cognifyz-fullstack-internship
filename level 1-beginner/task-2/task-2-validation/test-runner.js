/**
 * Automated Verification Script for Task 2
 * Tests all 9 requirements from the prompt specification.
 */

const http = require('http');
const { app, users } = require('./server');

const PORT = 3999;
let server;

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    let postData = '';
    const reqHeaders = { ...headers };

    if (data) {
      if (typeof data === 'object') {
        const params = new URLSearchParams();
        for (const [key, val] of Object.entries(data)) {
          if (Array.isArray(val)) {
            val.forEach(v => params.append(key, v));
          } else if (val !== undefined && val !== null) {
            params.append(key, val);
          }
        }
        postData = params.toString();
        reqHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
        reqHeaders['Content-Length'] = Buffer.byteLength(postData);
      } else {
        postData = data;
      }
    }

    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: path,
      method: method,
      headers: reqHeaders
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING TASK 2 VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 9;

  users.length = 0;

  // Test 1: GET / and GET /register return 200
  console.log('Test 1: Verify GET / and GET /register return status 200...');
  const resHome = await request('GET', '/');
  const resRegister = await request('GET', '/register');
  if (resHome.statusCode === 200 && resRegister.statusCode === 200) {
    console.log('  ✅ Passed: GET / returned 200, GET /register returned 200.');
    passed++;
  } else {
    console.error(`  ❌ Failed: GET / (${resHome.statusCode}), GET /register (${resRegister.statusCode})`);
  }

  // Test 7 (Part A): GET /users with zero users shows empty state
  console.log('\nTest 7 (Part A): Verify GET /users with zero users shows empty state...');
  const resUsersEmpty = await request('GET', '/users');
  if (resUsersEmpty.statusCode === 200 && resUsersEmpty.body.includes('No Registered Users Yet')) {
    console.log('  ✅ Passed: Empty state properly displayed when users array is empty.');
  } else {
    console.error('  ❌ Failed: Empty state not found in /users response.');
  }

  // Test 2: POST /register with fully valid data: succeeds, user stored, and /users shows them
  console.log('\nTest 2: Verify POST /register with fully valid data...');
  const validData = {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    phone: '9876543210',
    dob: '2000-01-15',
    password: 'Password123',
    confirmPassword: 'Password123',
    gender: 'Female',
    country: 'United States',
    skills: ['HTML/CSS', 'JavaScript'],
    bio: 'Aspiring full stack engineer.',
    terms: 'on'
  };
  const resPostValid = await request('POST', '/register', validData);
  const isRedirect = resPostValid.statusCode === 302 && resPostValid.headers.location.includes('/success');
  const userStored = users.length === 1 && users[0].email === 'jane.doe@example.com';
  const passwordHashed = users[0].passwordHash && users[0].passwordHash.startsWith('$2') && !users[0].password;

  const resUsersAfterValid = await request('GET', '/users');
  const showsUserInTable = resUsersAfterValid.body.includes('Jane Doe') && 
                           resUsersAfterValid.body.includes('jane.doe@example.com') && 
                           !resUsersAfterValid.body.includes('Password123') &&
                           !resUsersAfterValid.body.includes(users[0].passwordHash);

  if (isRedirect && userStored && passwordHashed && showsUserInTable) {
    console.log('  ✅ Passed: User saved, password hashed with bcrypt, redirected to /success, and user appears in /users without password.');
    passed++;
  } else {
    console.error('  ❌ Failed: Valid user registration failed or password was exposed.');
  }

  // Test 3: POST /register with every field empty: returns 400 and shows error for each field
  console.log('\nTest 3: Verify POST /register with empty fields returns 400 with errors for each field...');
  const emptyData = {};
  const resEmpty = await request('POST', '/register', emptyData);
  const has400 = resEmpty.statusCode === 400;
  const hasFirstNameErr = resEmpty.body.includes('First name is required');
  const hasLastNameErr = resEmpty.body.includes('Last name is required');
  const hasEmailErr = resEmpty.body.includes('Email address is required');
  const hasPhoneErr = resEmpty.body.includes('Phone number is required');
  const hasDobErr = resEmpty.body.includes('Date of birth is required');
  const hasPassErr = resEmpty.body.includes('Password is required');
  const hasGenderErr = resEmpty.body.includes('Please select a gender option');
  const hasCountryErr = resEmpty.body.includes('Please select your country');
  const hasSkillsErr = resEmpty.body.includes('Please select at least one skill');
  const hasTermsErr = resEmpty.body.includes('You must agree to the Terms and Conditions');

  const allErrorsPresent = hasFirstNameErr && hasLastNameErr && hasEmailErr && 
                           hasPhoneErr && hasDobErr && hasPassErr && 
                           hasGenderErr && hasCountryErr && hasSkillsErr && hasTermsErr;

  if (has400 && allErrorsPresent) {
    console.log('  ✅ Passed: Server returned status 400 with validation errors for all required fields.');
    passed++;
  } else {
    console.error('  ❌ Failed: Missing errors or status not 400 for empty form submission.');
  }

  // Test 4: POST /register with invalid email, 9-digit phone, short password, mismatched password
  console.log('\nTest 4: Verify invalid email, 9-digit phone, short password & mismatched password...');
  const invalidFieldsData = {
    firstName: 'Mark',
    lastName: 'Twain',
    email: 'not-an-email',
    phone: '123456789',
    dob: '2005-05-10',
    password: 'pass',
    confirmPassword: 'otherPassword',
    gender: 'Male',
    country: 'Canada',
    skills: ['Python'],
    terms: 'on'
  };
  const resInvalidFields = await request('POST', '/register', invalidFieldsData);
  const hasEmailFormatErr = resInvalidFields.body.includes('Please provide a valid email');
  const hasPhoneLengthErr = resInvalidFields.body.includes('Phone number must be exactly 10 digits');
  const hasPassShortErr = resInvalidFields.body.includes('Password must be at least 8 characters');
  const hasPassMismatchErr = resInvalidFields.body.includes('Passwords do not match');
  const preservesMark = resInvalidFields.body.includes('value="Mark"');
  const preservesTwain = resInvalidFields.body.includes('value="Twain"');
  const noPasswordPreserved = !resInvalidFields.body.includes('value="pass"');

  if (resInvalidFields.statusCode === 400 && hasEmailFormatErr && hasPhoneLengthErr && 
      (hasPassShortErr || hasPassMismatchErr) && preservesMark && preservesTwain && noPasswordPreserved) {
    console.log('  ✅ Passed: Field-specific errors displayed, input values preserved, passwords cleared.');
    passed++;
  } else {
    console.error('  ❌ Failed: Validation errors not properly returned or password not cleared.');
  }

  // Test 5: POST /register twice with same email -> second rejected as duplicate
  console.log('\nTest 5: Verify duplicate email rejection on server...');
  const duplicateData = {
    firstName: 'Second',
    lastName: 'User',
    email: 'JANE.DOE@example.com',
    phone: '1122334455',
    dob: '1995-10-10',
    password: 'Password123',
    confirmPassword: 'Password123',
    gender: 'Female',
    country: 'India',
    skills: ['Node.js'],
    terms: 'on'
  };
  const resDuplicate = await request('POST', '/register', duplicateData);
  if (resDuplicate.statusCode === 400 && resDuplicate.body.includes('This email is already registered.')) {
    console.log('  ✅ Passed: Duplicate email (case-insensitive) rejected with status 400 and error message.');
    passed++;
  } else {
    console.error('  ❌ Failed: Duplicate email was not properly detected/rejected.');
  }

  // Test 6: Skills submitted as none, one, and many: no crashes
  console.log('\nTest 6: Verify skills handling as none, one, and many without crashes...');
  const baseUser = {
    firstName: 'Skill',
    lastName: 'Tester',
    email: 'skill1@test.com',
    phone: '5556667777',
    dob: '1990-01-01',
    password: 'Password999',
    confirmPassword: 'Password999',
    gender: 'Male',
    country: 'Germany',
    terms: 'on'
  };

  const resNoSkills = await request('POST', '/register', { ...baseUser, skills: undefined });
  const noSkillsHandled = resNoSkills.statusCode === 400 && resNoSkills.body.includes('Please select at least one skill');

  const resOneSkill = await request('POST', '/register', { ...baseUser, email: 'skill2@test.com', skills: 'Express' });
  const oneSkillHandled = resOneSkill.statusCode === 302;

  const resManySkills = await request('POST', '/register', { ...baseUser, email: 'skill3@test.com', skills: ['Node.js', 'Express', 'Databases'] });
  const manySkillsHandled = resManySkills.statusCode === 302;

  if (noSkillsHandled && oneSkillHandled && manySkillsHandled) {
    console.log('  ✅ Passed: None (400 error caught), one skill (stored), and many skills (stored) handled safely.');
    passed++;
  } else {
    console.error('  ❌ Failed: Skills normalization caused an error or crash.');
  }

  // Test 7 (Part B): GET /users shows table when populated
  console.log('\nTest 7 (Part B): Verify GET /users shows table when users exist...');
  const resUsersPopulated = await request('GET', '/users');
  const tableRendered = resUsersPopulated.statusCode === 200 && 
                        resUsersPopulated.body.includes('<table') &&
                        resUsersPopulated.body.includes('Total: 3 Users');
  if (tableRendered) {
    console.log('  ✅ Passed: Users table rendered correctly with populated user count.');
    passed++;
  } else {
    console.error('  ❌ Failed: Users table failed to render populated count.');
  }

  // Test 8: Nonexistent URL returns 404 page
  console.log('\nTest 8: Verify nonexistent URL returns 404 page...');
  const res404 = await request('GET', '/nonexistent-random-route-xyz');
  if (res404.statusCode === 404 && res404.body.includes('Page Not Found') && res404.body.includes('404')) {
    console.log('  ✅ Passed: Nonexistent route returned HTTP 404 and rendered custom 404.ejs.');
    passed++;
  } else {
    console.error('  ❌ Failed: 404 handling failed.');
  }

  // Test 9: Confirm client-side validation script is present in served HTML of /register
  console.log('\nTest 9: Verify client-side validation script is present in served HTML...');
  const resRegHtml = await request('GET', '/register');
  const hasScriptTag = resRegHtml.body.includes('<script>') && resRegHtml.body.includes('function validateField');
  const hasOnSubmit = resRegHtml.body.includes('onsubmit="return validateFullForm(event)"');
  const hasLiveBio = resRegHtml.body.includes('updateBioCounter');
  const hasPassToggle = resRegHtml.body.includes('togglePasswordVisibility');

  if (hasScriptTag && hasOnSubmit && hasLiveBio && hasPassToggle) {
    console.log('  ✅ Passed: Inline JavaScript, validateField, onsubmit handler, live counter, and password toggle found in HTML.');
    passed++;
  } else {
    console.error('  ❌ Failed: Client-side validation scripts missing from /register page.');
  }

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} / ${total} SUITES PASSED`);
  console.log('====================================================\n');

  server.close(() => {
    process.exit(passed === total ? 0 : 1);
  });
}

server = app.listen(PORT, '127.0.0.1', () => {
  runTests().catch(err => {
    console.error('Test runner fatal error:', err);
    if (server) server.close();
    process.exit(1);
  });
});

