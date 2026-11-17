import test from "node:test";
import assert from "node:assert/strict";

import {
  validateFullName,
  validateUsername,
  validateEmail,
  validatePhone,
  validateDateOfBirth,
  checkPasswordStrength,
  validatePassword,
  validateConfirmPassword,
  validateCountry,
  validateState,
  validateCity,
  validateSkills,
  validateBio,
  validateTerms
} from "../public/js/validators.js";

test("Full Name Validation", async (t) => {
  await t.test("accepts valid full names", () => {
    assert.equal(validateFullName("John Doe"), "");
    assert.equal(validateFullName("Jane O'Connor"), "");
    assert.equal(validateFullName("Jean-Luc Picard"), "");
    assert.equal(validateFullName("Ana Sofia de la Cruz"), "");
  });

  await t.test("rejects missing, too short, or too long names", () => {
    assert.notEqual(validateFullName(""), "");
    assert.notEqual(validateFullName("   "), "");
    assert.notEqual(validateFullName("A"), "");
    assert.notEqual(validateFullName("A".repeat(51)), "");
  });

  await t.test("rejects names with numbers or illegal symbols", () => {
    assert.notEqual(validateFullName("John123"), "");
    assert.notEqual(validateFullName("John @ Doe"), "");
    assert.notEqual(validateFullName("John_Doe"), "");
  });
});

test("Username Validation", async (t) => {
  const existingUsernames = ["alex_dev", "sarah123", "morpheus"];

  await t.test("accepts valid alphanumeric usernames starting with a letter", () => {
    assert.equal(validateUsername("alexander", existingUsernames), "");
    assert.equal(validateUsername("dev_coder_99", existingUsernames), "");
    assert.equal(validateUsername("Neo1", existingUsernames), "");
  });

  await t.test("rejects usernames starting with numbers or underscores", () => {
    assert.notEqual(validateUsername("123alex", existingUsernames), "");
    assert.notEqual(validateUsername("_coder", existingUsernames), "");
  });

  await t.test("rejects usernames shorter than 4 or longer than 15 characters", () => {
    assert.notEqual(validateUsername("abc", existingUsernames), "");
    assert.notEqual(validateUsername("a_very_long_username_here", existingUsernames), "");
  });

  await t.test("rejects usernames with special characters or spaces", () => {
    assert.notEqual(validateUsername("alex-dev", existingUsernames), "");
    assert.notEqual(validateUsername("alex dev", existingUsernames), "");
    assert.notEqual(validateUsername("alex@dev", existingUsernames), "");
  });

  await t.test("enforces case-insensitive uniqueness against existing profiles", () => {
    assert.notEqual(validateUsername("alex_dev", existingUsernames), "");
    assert.notEqual(validateUsername("ALEX_DEV", existingUsernames), "");
    assert.notEqual(validateUsername("Sarah123", existingUsernames), "");
    // Allowed if matching current user during edit
    assert.equal(validateUsername("alex_dev", existingUsernames, "alex_dev"), "");
  });
});

test("Email Validation", async (t) => {
  const existingEmails = ["john@example.com", "sarah@tech.org"];

  await t.test("accepts strictly valid email addresses", () => {
    assert.equal(validateEmail("user@example.com", existingEmails), "");
    assert.equal(validateEmail("alex.smith+test@domain.co.uk", existingEmails), "");
  });

  await t.test("rejects invalid email formats", () => {
    assert.notEqual(validateEmail("not-an-email", existingEmails), "");
    assert.notEqual(validateEmail("user@domain", existingEmails), "");
    assert.notEqual(validateEmail("@missinguser.com", existingEmails), "");
    assert.notEqual(validateEmail("spaces in@email.com", existingEmails), "");
  });

  await t.test("enforces uniqueness (case-insensitive)", () => {
    assert.notEqual(validateEmail("john@example.com", existingEmails), "");
    assert.notEqual(validateEmail("JOHN@EXAMPLE.COM", existingEmails), "");
    assert.equal(validateEmail("john@example.com", existingEmails, "john@example.com"), "");
  });
});

test("Phone Validation", async (t) => {
  await t.test("accepts 10-digit numbers in various common formats", () => {
    assert.equal(validatePhone("1234567890"), "");
    assert.equal(validatePhone("(123) 456-7890"), "");
    assert.equal(validatePhone("123 456 7890"), "");
    assert.equal(validatePhone("123-456-7890"), "");
  });

  await t.test("rejects numbers not containing exactly 10 digits", () => {
    assert.notEqual(validatePhone("123456789"), ""); // 9 digits
    assert.notEqual(validatePhone("12345678901"), ""); // 11 digits
    assert.notEqual(validatePhone(""), "");
    assert.notEqual(validatePhone("0000000000"), ""); // repetitive dummy
  });
});

test("Date of Birth Validation", async (t) => {
  await t.test("accepts age >= 18", () => {
    assert.equal(validateDateOfBirth("1995-05-15"), "");
    assert.equal(validateDateOfBirth("2000-01-01"), "");
  });

  await t.test("rejects future dates", () => {
    const futureYear = new Date().getFullYear() + 2;
    assert.notEqual(validateDateOfBirth(`${futureYear}-01-01`), "");
  });

  await t.test("rejects minors under 18 years old", () => {
    const today = new Date();
    const minorDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate())
      .toISOString()
      .split("T")[0];
    assert.notEqual(validateDateOfBirth(minorDate), "");
  });

  await t.test("rejects invalid date strings", () => {
    assert.notEqual(validateDateOfBirth("not-a-date"), "");
    assert.notEqual(validateDateOfBirth(""), "");
  });
});

test("Password Strength & Checklist Validation", async (t) => {
  await t.test("identifies weak passwords", () => {
    const res1 = checkPasswordStrength("abc");
    assert.equal(res1.label, "Weak");
    assert.equal(res1.isValid, false);

    const res2 = checkPasswordStrength("abcdefgh"); // no upper, number, special
    assert.equal(res2.isValid, false);
    assert.equal(res2.rules.hasUpper, false);
    assert.equal(res2.rules.hasNumber, false);
    assert.equal(res2.rules.hasSpecial, false);
  });

  await t.test("identifies fair passwords", () => {
    const res = checkPasswordStrength("Abcdefgh"); // has upper, lower, length, no space, no username (missing number & special: 5/7)
    assert.equal(res.label, "Fair");
    assert.equal(res.rules.hasSpecial, false);
    assert.equal(res.rules.hasNumber, false);
    assert.equal(res.isValid, false);
  });

  await t.test("identifies good passwords", () => {
    const res = checkPasswordStrength("Abcdefgh1"); // missing special only (6/7)
    assert.equal(res.label, "Good");
    assert.equal(res.rules.hasSpecial, false);
    assert.equal(res.isValid, false);
  });

  await t.test("identifies strong and valid passwords meeting all 7 rules", () => {
    const res = checkPasswordStrength("Secr3t!P@ss", "alexander");
    assert.equal(res.label, "Strong");
    assert.equal(res.score, 4);
    assert.equal(res.isValid, true);
    assert.equal(res.rules.minLength, true);
    assert.equal(res.rules.hasUpper, true);
    assert.equal(res.rules.hasLower, true);
    assert.equal(res.rules.hasNumber, true);
    assert.equal(res.rules.hasSpecial, true);
    assert.equal(res.rules.noSpaces, true);
    assert.equal(res.rules.noUsername, true);
    assert.equal(validatePassword("Secr3t!P@ss", "alexander"), "");
  });

  await t.test("rejects passwords containing the username", () => {
    const res = checkPasswordStrength("Alex99!Pass", "alex");
    assert.equal(res.rules.noUsername, false);
    assert.equal(res.isValid, false);
    assert.notEqual(validatePassword("Alex99!Pass", "alex"), "");
  });

  await t.test("rejects passwords with spaces", () => {
    const res = checkPasswordStrength("Pass 123!word", "john");
    assert.equal(res.rules.noSpaces, false);
    assert.equal(res.isValid, false);
  });
});

test("Confirm Password Validation", async (t) => {
  await t.test("accepts matching passwords", () => {
    assert.equal(validateConfirmPassword("MyPass123!", "MyPass123!"), "");
  });

  await t.test("rejects mismatched passwords", () => {
    assert.notEqual(validateConfirmPassword("Different123!", "MyPass123!"), "");
    assert.notEqual(validateConfirmPassword("", "MyPass123!"), "");
  });
});

test("Location Validation (Country, State, City)", async (t) => {
  const countries = ["United States", "India"];
  const states = ["California", "New York"];
  const cities = ["Los Angeles", "San Francisco"];

  await t.test("accepts valid selections", () => {
    assert.equal(validateCountry("United States", countries), "");
    assert.equal(validateState("California", states), "");
    assert.equal(validateCity("Los Angeles", cities), "");
  });

  await t.test("rejects unselected or foreign values", () => {
    assert.notEqual(validateCountry("", countries), "");
    assert.notEqual(validateCountry("Atlantis", countries), "");
    assert.notEqual(validateState("", states), "");
    assert.notEqual(validateState("Mars", states), "");
    assert.notEqual(validateCity("", cities), "");
    assert.notEqual(validateCity("Gotham", cities), "");
  });
});

test("Skills Dynamic List Validation", async (t) => {
  await t.test("accepts 1 to 5 unique non-empty skills", () => {
    assert.equal(validateSkills(["JavaScript"]), "");
    assert.equal(validateSkills(["HTML", "CSS", "JavaScript", "Node.js", "Express"]), "");
  });

  await t.test("rejects empty list or < 1 skill", () => {
    assert.notEqual(validateSkills([]), "");
  });

  await t.test("rejects more than 5 skills", () => {
    assert.notEqual(validateSkills(["A", "B", "C", "D", "E", "F"]), "");
  });

  await t.test("rejects blank entries", () => {
    assert.notEqual(validateSkills(["JavaScript", "  "]), "");
  });

  await t.test("rejects duplicate entries (case-insensitive)", () => {
    assert.notEqual(validateSkills(["JavaScript", "javascript"]), "");
    assert.notEqual(validateSkills(["React", "Python", "React"]), "");
  });
});

test("Bio and Terms Validation", async (t) => {
  await t.test("accepts bio under 200 chars", () => {
    assert.equal(validateBio("Hello world! I am a full stack developer."), "");
    assert.equal(validateBio(""), "");
  });

  await t.test("rejects bio over 200 chars", () => {
    assert.notEqual(validateBio("A".repeat(201)), "");
  });

  await t.test("validates terms agreement", () => {
    assert.equal(validateTerms(true), "");
    assert.notEqual(validateTerms(false), "");
  });
});
