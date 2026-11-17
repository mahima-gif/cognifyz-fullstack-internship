/**
 * validators.js
 * Pure validation functions for form fields and live password strength evaluation.
 *
 * Design:
 * - Every field validator is a pure function returning an error string ("" if valid).
 * - Easy to unit-test with Node's test runner.
 * - Used identically across Registration and Profile Edit modals.
 */

/**
 * Validates Full Name.
 * Rules: 2-50 characters, letters, spaces, hyphens, and apostrophes only.
 */
export function validateFullName(name) {
  if (!name || typeof name !== "string") {
    return "Full name is required.";
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return "Full name must be at least 2 characters long.";
  }
  if (trimmed.length > 50) {
    return "Full name must not exceed 50 characters.";
  }
  // Allow Unicode letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[A-Za-zÀ-ÿ]+([ '-][A-Za-zÀ-ÿ]+)*$/;
  if (!nameRegex.test(trimmed)) {
    return "Full name can only contain letters, spaces, hyphens, and apostrophes.";
  }
  return "";
}

/**
 * Validates Username.
 * Rules: 4-15 characters, alphanumeric + underscore, must start with a letter, unique (case-insensitive).
 * @param {string} username
 * @param {string[]} existingUsernames - List of usernames already registered
 * @param {string} [currentUsername] - Username of current profile if editing
 */
export function validateUsername(username, existingUsernames = [], currentUsername = "") {
  if (!username || typeof username !== "string") {
    return "Username is required.";
  }
  const trimmed = username.trim();
  if (trimmed.length < 4 || trimmed.length > 15) {
    return "Username must be between 4 and 15 characters.";
  }
  if (!/^[a-zA-Z]/.test(trimmed)) {
    return "Username must start with a letter.";
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return "Username can only contain letters, numbers, and underscores.";
  }

  const isSelf = currentUsername && currentUsername.toLowerCase() === trimmed.toLowerCase();
  if (!isSelf && Array.isArray(existingUsernames)) {
    const isTaken = existingUsernames.some(
      (u) => typeof u === "string" && u.toLowerCase() === trimmed.toLowerCase()
    );
    if (isTaken) {
      return `Username "${trimmed}" is already taken. Please choose another.`;
    }
  }
  return "";
}

/**
 * Validates Email address.
 * Rules: Strict regex format and must be unique among saved profiles.
 * @param {string} email
 * @param {string[]} existingEmails - List of emails already registered
 * @param {string} [currentEmail] - Email of current profile if editing
 */
export function validateEmail(email, existingEmails = [], currentEmail = "") {
  if (!email || typeof email !== "string") {
    return "Email address is required.";
  }
  const trimmed = email.trim();
  // Strict RFC 5322-compliant practical email pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return "Please enter a valid email address (e.g., alex@example.com).";
  }

  const isSelf = currentEmail && currentEmail.toLowerCase() === trimmed.toLowerCase();
  if (!isSelf && Array.isArray(existingEmails)) {
    const isTaken = existingEmails.some(
      (e) => typeof e === "string" && e.toLowerCase() === trimmed.toLowerCase()
    );
    if (isTaken) {
      return `Email "${trimmed}" is already registered.`;
    }
  }
  return "";
}

/**
 * Validates Phone number.
 * Rules: Exactly 10 digits after stripping spaces, dashes, parentheses, dots.
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== "string") {
    return "Phone number is required.";
  }
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) {
    return "Phone number is required.";
  }
  if (digits.length !== 10) {
    return `Phone number must contain exactly 10 digits (currently ${digits.length}).`;
  }
  // Disallow all identical digits like 0000000000
  if (/^(\d)\1{9}$/.test(digits)) {
    return "Please enter a valid 10-digit phone number.";
  }
  return "";
}

/**
 * Validates Date of Birth.
 * Rules: Must be a valid date, not in the future, and user must be at least 18 years old.
 */
export function validateDateOfBirth(dobString) {
  if (!dobString || typeof dobString !== "string") {
    return "Date of birth is required.";
  }
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) {
    return "Please enter a valid date.";
  }

  const today = new Date();
  // Normalize time for comparison
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dobDateOnly = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());

  if (dobDateOnly > todayDateOnly) {
    return "Date of birth cannot be in the future.";
  }

  // Calculate age accurately
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  if (age < 18) {
    return `You must be at least 18 years old to register (current age: ${age}).`;
  }
  if (age > 120) {
    return "Please enter a realistic date of birth.";
  }
  return "";
}

/**
 * Detailed evaluation of password strength rules.
 * Rules:
 *  1. Length >= 8
 *  2. Contains uppercase letter
 *  3. Contains lowercase letter
 *  4. Contains number
 *  5. Contains special character
 *  6. Has no spaces
 *  7. Does not contain username (if username has >= 3 chars)
 *
 * Returns object with checklist, score, strength label, color and validity.
 */
export function checkPasswordStrength(password, username = "") {
  const pwd = typeof password === "string" ? password : "";
  const uName = typeof username === "string" ? username.trim().toLowerCase() : "";

  const rules = {
    minLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd),
    noSpaces: pwd.length > 0 && !/\s/.test(pwd),
    noUsername: uName.length >= 3 ? !pwd.toLowerCase().includes(uName) : true
  };

  // Count satisfied critical rules
  let passedCount = 0;
  if (rules.minLength) passedCount++;
  if (rules.hasUpper) passedCount++;
  if (rules.hasLower) passedCount++;
  if (rules.hasNumber) passedCount++;
  if (rules.hasSpecial) passedCount++;
  if (rules.noSpaces) passedCount++;
  if (rules.noUsername) passedCount++;

  // Determine strength level
  // Score 0 to 4
  let score = 0;
  let label = "Too Short";
  let color = "var(--color-danger, #ef4444)";

  if (pwd.length === 0) {
    label = "Empty";
    score = 0;
  } else if (passedCount <= 3 || !rules.minLength) {
    label = "Weak";
    score = 1;
    color = "var(--color-danger, #ef4444)";
  } else if (passedCount === 4 || passedCount === 5) {
    label = "Fair";
    score = 2;
    color = "var(--color-warning, #f59e0b)";
  } else if (passedCount === 6) {
    label = "Good";
    score = 3;
    color = "var(--color-info, #3b82f6)";
  } else if (passedCount === 7) {
    label = "Strong";
    score = 4;
    color = "var(--color-success, #10b981)";
  }

  const isValid =
    rules.minLength &&
    rules.hasUpper &&
    rules.hasLower &&
    rules.hasNumber &&
    rules.hasSpecial &&
    rules.noSpaces &&
    rules.noUsername;

  return {
    score,
    passedCount,
    totalRules: 7,
    label,
    color,
    rules,
    isValid
  };
}

/**
 * Validates Password against all required security rules.
 */
export function validatePassword(password, username = "") {
  if (!password || typeof password !== "string") {
    return "Password is required.";
  }
  const strength = checkPasswordStrength(password, username);
  if (!strength.rules.minLength) {
    return "Password must be at least 8 characters long.";
  }
  if (!strength.rules.noSpaces) {
    return "Password cannot contain spaces.";
  }
  if (!strength.rules.hasUpper) {
    return "Password must include at least one uppercase letter (A-Z).";
  }
  if (!strength.rules.hasLower) {
    return "Password must include at least one lowercase letter (a-z).";
  }
  if (!strength.rules.hasNumber) {
    return "Password must include at least one number (0-9).";
  }
  if (!strength.rules.hasSpecial) {
    return "Password must include at least one special character (!@#$%^&*...).";
  }
  if (!strength.rules.noUsername) {
    return "Password must not contain your username.";
  }
  return "";
}

/**
 * Validates Confirm Password.
 */
export function validateConfirmPassword(confirmPassword, originalPassword) {
  if (!confirmPassword || typeof confirmPassword !== "string") {
    return "Please confirm your password.";
  }
  if (confirmPassword !== originalPassword) {
    return "Passwords do not match.";
  }
  return "";
}

/**
 * Validates Country, State, City location fields.
 */
export function validateCountry(country, availableCountries = []) {
  if (!country || typeof country !== "string" || !country.trim()) {
    return "Please select a country.";
  }
  if (availableCountries.length > 0 && !availableCountries.includes(country.trim())) {
    return "Selected country is not valid.";
  }
  return "";
}

export function validateState(state, availableStates = []) {
  if (!state || typeof state !== "string" || !state.trim()) {
    return "Please select a state / province.";
  }
  if (availableStates.length > 0 && !availableStates.includes(state.trim())) {
    return "Selected state is not valid for this country.";
  }
  return "";
}

export function validateCity(city, availableCities = []) {
  if (!city || typeof city !== "string" || !city.trim()) {
    return "Please select a city.";
  }
  if (availableCities.length > 0 && !availableCities.includes(city.trim())) {
    return "Selected city is not valid for this state.";
  }
  return "";
}

/**
 * Validates Skills dynamic list.
 * Rules: 1 to 5 skills, no empty entries, no duplicates (case-insensitive).
 */
export function validateSkills(skills) {
  if (!Array.isArray(skills)) {
    return "Skills must be provided as a list.";
  }
  const cleanSkills = skills.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);

  if (cleanSkills.length === 0) {
    return "Please add at least 1 skill.";
  }
  if (cleanSkills.length > 5) {
    return "You can add at most 5 skills.";
  }

  // Check for any empty fields in the raw list
  const hasEmpty = skills.some((s) => typeof s !== "string" || s.trim().length === 0);
  if (hasEmpty) {
    return "Skill fields cannot be left blank. Fill or remove empty skills.";
  }

  // Check for duplicates
  const lowerSet = new Set();
  for (const s of cleanSkills) {
    const lower = s.toLowerCase();
    if (lowerSet.has(lower)) {
      return `Duplicate skill detected: "${s}". Skills must be unique.`;
    }
    lowerSet.add(lower);
  }

  return "";
}

/**
 * Validates Bio text.
 * Rules: Max 200 characters.
 */
export function validateBio(bio) {
  if (typeof bio !== "string") return "";
  if (bio.length > 200) {
    return `Bio cannot exceed 200 characters (currently ${bio.length}).`;
  }
  return "";
}

/**
 * Validates Terms and Conditions checkbox.
 */
export function validateTerms(accepted) {
  if (!accepted) {
    return "You must agree to the Terms of Service to register.";
  }
  return "";
}

