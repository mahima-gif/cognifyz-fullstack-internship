/**
 * app.js
 * Main application coordinator for ProfileHub SPA.
 * Integrates Router, Views, Validators, Store, UI helpers, and dynamic DOM manipulation.
 */

import { Router } from "./router.js";
import {
  getHomeView,
  getRegisterView,
  getDashboardView,
  getAboutView,
  getNotFoundView
} from "./views.js";
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
} from "./validators.js";
import { store } from "./store.js";
import { toast, modal, createElement, debounce } from "./ui.js";
import { getCountries, getStates, getCities } from "./data.js";

// Global form dirty tracking state for route guard
let isRegisterFormDirty = false;

/* ==========================================================================
   REGISTRATION VIEW INTERACTIVITY & DYNAMIC DOM LOGIC
   ========================================================================== */

function initRegisterView({ router }) {
  const form = document.getElementById("registration-form");
  if (!form) return;

  isRegisterFormDirty = false;

  // Form field references
  const fields = {
    fullName: document.getElementById("field-fullName"),
    username: document.getElementById("field-username"),
    email: document.getElementById("field-email"),
    phone: document.getElementById("field-phone"),
    dob: document.getElementById("field-dob"),
    password: document.getElementById("field-password"),
    confirmPassword: document.getElementById("field-confirmPassword"),
    country: document.getElementById("field-country"),
    state: document.getElementById("field-state"),
    city: document.getElementById("field-city"),
    bio: document.getElementById("field-bio"),
    terms: document.getElementById("field-terms")
  };

  const errorEls = {
    fullName: document.getElementById("error-fullName"),
    username: document.getElementById("error-username"),
    email: document.getElementById("error-email"),
    phone: document.getElementById("error-phone"),
    dob: document.getElementById("error-dob"),
    password: document.getElementById("error-password"),
    confirmPassword: document.getElementById("error-confirmPassword"),
    country: document.getElementById("error-country"),
    state: document.getElementById("error-state"),
    city: document.getElementById("error-city"),
    skills: document.getElementById("error-skills"),
    bio: document.getElementById("error-bio"),
    terms: document.getElementById("error-terms")
  };

  const submitBtn = document.getElementById("btn-submit-form");
  const resetBtn = document.getElementById("btn-reset-form");
  const summaryBox = document.getElementById("form-summary");
  const summaryText = document.getElementById("summary-text");
  const bioCounter = document.getElementById("bio-counter");

  // Dynamic Skills container & elements
  const skillsContainer = document.getElementById("skills-container");
  const addSkillBtn = document.getElementById("btn-add-skill");
  const skillsCountBadge = document.getElementById("skills-count-badge");

  // Password Strength meter elements
  const strengthBar = document.getElementById("strength-bar");
  const strengthText = document.getElementById("strength-text");
  const ruleEls = {
    length: document.getElementById("rule-length"),
    upper: document.getElementById("rule-upper"),
    lower: document.getElementById("rule-lower"),
    number: document.getElementById("rule-number"),
    special: document.getElementById("rule-special"),
    spaces: document.getElementById("rule-spaces"),
    username: document.getElementById("rule-username")
  };

  // Populate Countries dropdown
  const countries = getCountries();
  fields.country.innerHTML = '<option value="">-- Choose Country --</option>';
  countries.forEach((country) => {
    const opt = createElement("option", { value: country }, [country]);
    fields.country.appendChild(opt);
  });

  // Track field validation statuses (true = valid, false = invalid)
  const validationState = {
    fullName: false,
    username: false,
    email: false,
    phone: false,
    dob: false,
    password: false,
    confirmPassword: false,
    country: false,
    state: false,
    city: false,
    skills: false,
    bio: true, // Optional field, starts valid
    terms: false
  };

  // Helper to mark dirty
  function markDirty() {
    isRegisterFormDirty = true;
  }

  /* --- Field Helper: Set Valid / Invalid UI --- */
  function setFieldState(key, inputEl, errorEl, errorMessage) {
    if (errorMessage) {
      validationState[key] = false;
      inputEl.classList.remove("is-valid");
      inputEl.classList.add("is-invalid");
      errorEl.textContent = errorMessage;
    } else {
      validationState[key] = true;
      inputEl.classList.remove("is-invalid");
      inputEl.classList.add("is-valid");
      errorEl.textContent = "";
    }
    updateFormSummaryAndSubmitButton();
  }

  /* --- Validation Handlers --- */
  function validateFieldFullName() {
    const error = validateFullName(fields.fullName.value);
    setFieldState("fullName", fields.fullName, errorEls.fullName, error);
  }

  function validateFieldUsername() {
    const existing = store.getAllUsernames();
    const error = validateUsername(fields.username.value, existing);
    setFieldState("username", fields.username, errorEls.username, error);
    // If password is also entered, re-evaluate password to verify it doesn't contain the username
    if (fields.password.value) {
      validateFieldPassword();
    }
  }

  function validateFieldEmail() {
    const existing = store.getAllEmails();
    const error = validateEmail(fields.email.value, existing);
    setFieldState("email", fields.email, errorEls.email, error);
  }

  function validateFieldPhone() {
    const error = validatePhone(fields.phone.value);
    setFieldState("phone", fields.phone, errorEls.phone, error);
  }

  function validateFieldDob() {
    const error = validateDateOfBirth(fields.dob.value);
    setFieldState("dob", fields.dob, errorEls.dob, error);
  }

  function validateFieldPassword() {
    const pwd = fields.password.value;
    const uName = fields.username.value;
    const strength = checkPasswordStrength(pwd, uName);

    // Update progress bar & label
    strengthBar.style.width = (strength.score / 4) * 100 + "%";
    strengthBar.style.backgroundColor = strength.color;
    strengthText.textContent = strength.label;
    strengthText.style.color = strength.color;

    // Update rules checklist with checkmarks
    updateChecklistRule(ruleEls.length, strength.rules.minLength);
    updateChecklistRule(ruleEls.upper, strength.rules.hasUpper);
    updateChecklistRule(ruleEls.lower, strength.rules.hasLower);
    updateChecklistRule(ruleEls.number, strength.rules.hasNumber);
    updateChecklistRule(ruleEls.special, strength.rules.hasSpecial);
    updateChecklistRule(ruleEls.spaces, strength.rules.noSpaces);
    updateChecklistRule(ruleEls.username, strength.rules.noUsername);

    const error = validatePassword(pwd, uName);
    setFieldState("password", fields.password, errorEls.password, error);

    // Re-check confirm password if already typed
    if (fields.confirmPassword.value) {
      validateFieldConfirmPassword();
    }
  }

  function updateChecklistRule(el, isPassed) {
    if (!el) return;
    if (isPassed) {
      el.classList.add("rule-passed");
      el.classList.remove("rule-failed");
    } else {
      el.classList.remove("rule-passed");
      el.classList.add("rule-failed");
    }
  }

  function validateFieldConfirmPassword() {
    const error = validateConfirmPassword(fields.confirmPassword.value, fields.password.value);
    setFieldState("confirmPassword", fields.confirmPassword, errorEls.confirmPassword, error);
  }

  function validateFieldCountry() {
    const error = validateCountry(fields.country.value, getCountries());
    setFieldState("country", fields.country, errorEls.country, error);
  }

  function validateFieldState() {
    const states = getStates(fields.country.value);
    const error = validateState(fields.state.value, states);
    setFieldState("state", fields.state, errorEls.state, error);
  }

  function validateFieldCity() {
    const cities = getCities(fields.country.value, fields.state.value);
    const error = validateCity(fields.city.value, cities);
    setFieldState("city", fields.city, errorEls.city, error);
  }

  function validateFieldSkills() {
    const skillInputs = Array.from(skillsContainer.querySelectorAll(".skill-input"));
    const skills = skillInputs.map((input) => input.value);
    const error = validateSkills(skills);

    if (error) {
      validationState.skills = false;
      errorEls.skills.textContent = error;
      skillInputs.forEach((input) => input.classList.add("is-invalid"));
    } else {
      validationState.skills = true;
      errorEls.skills.textContent = "";
      skillInputs.forEach((input) => {
        input.classList.remove("is-invalid");
        input.classList.add("is-valid");
      });
    }
    updateFormSummaryAndSubmitButton();
  }

  function validateFieldBio() {
    const len = fields.bio.value.length;
    bioCounter.textContent = `${len} / 200`;

    if (len >= 190) {
      bioCounter.classList.add("counter-danger");
      bioCounter.classList.remove("counter-warning");
    } else if (len >= 160) {
      bioCounter.classList.add("counter-warning");
      bioCounter.classList.remove("counter-danger");
    } else {
      bioCounter.classList.remove("counter-warning", "counter-danger");
    }

    const error = validateBio(fields.bio.value);
    setFieldState("bio", fields.bio, errorEls.bio, error);
  }

  function validateFieldTerms() {
    const error = validateTerms(fields.terms.checked);
    if (error) {
      validationState.terms = false;
      errorEls.terms.textContent = error;
    } else {
      validationState.terms = true;
      errorEls.terms.textContent = "";
    }
    updateFormSummaryAndSubmitButton();
  }

  /* --- Overall Form Validity & Summary Check --- */
  function updateFormSummaryAndSubmitButton() {
    const totalRequired = [
      "fullName",
      "username",
      "email",
      "phone",
      "dob",
      "password",
      "confirmPassword",
      "country",
      "state",
      "city",
      "skills",
      "bio",
      "terms"
    ];

    const invalidFields = totalRequired.filter((key) => !validationState[key]);
    const isAllValid = invalidFields.length === 0;

    submitBtn.disabled = !isAllValid;

    if (isAllValid) {
      summaryBox.className = "form-summary alert alert-success";
      summaryBox.querySelector(".summary-icon").textContent = "✓";
      summaryText.textContent = "All fields look great! Your profile is ready for registration.";
    } else {
      summaryBox.className = "form-summary alert alert-info";
      summaryBox.querySelector(".summary-icon").textContent = "ℹ";
      summaryText.textContent = `${invalidFields.length} field(s) still require your attention before submitting.`;
    }
  }

  /* --- Dynamic Dependent Dropdowns Event Wiring --- */
  fields.country.addEventListener("change", () => {
    markDirty();
    const country = fields.country.value;

    // Reset State & City
    fields.state.innerHTML = '<option value="">-- Select State / Province --</option>';
    fields.city.innerHTML = '<option value="">-- Select City --</option>';

    if (country) {
      const states = getStates(country);
      states.forEach((state) => {
        const opt = createElement("option", { value: state }, [state]);
        fields.state.appendChild(opt);
      });
      fields.state.disabled = false;
      fields.state.classList.remove("is-valid", "is-invalid");
    } else {
      fields.state.disabled = true;
      fields.state.innerHTML = '<option value="">-- Select Country First --</option>';
    }

    fields.city.disabled = true;
    fields.city.innerHTML = '<option value="">-- Select State First --</option>';

    validateFieldCountry();
    validationState.state = false;
    validationState.city = false;
    updateFormSummaryAndSubmitButton();
  });

  fields.state.addEventListener("change", () => {
    markDirty();
    const country = fields.country.value;
    const state = fields.state.value;

    fields.city.innerHTML = '<option value="">-- Select City --</option>';

    if (country && state) {
      const cities = getCities(country, state);
      cities.forEach((city) => {
        const opt = createElement("option", { value: city }, [city]);
        fields.city.appendChild(opt);
      });
      fields.city.disabled = false;
      fields.city.classList.remove("is-valid", "is-invalid");
    } else {
      fields.city.disabled = true;
      fields.city.innerHTML = '<option value="">-- Select State First --</option>';
    }

    validateFieldState();
    validationState.city = false;
    updateFormSummaryAndSubmitButton();
  });

  fields.city.addEventListener("change", () => {
    markDirty();
    validateFieldCity();
  });

  /* --- Dynamic Skills Row Management --- */
  function renderSkillRow(initialValue = "") {
    const row = createElement("div", { className: "skill-row" });

    const input = createElement("input", {
      type: "text",
      className: "form-input skill-input",
      placeholder: "e.g., JavaScript, Python, UI Design",
      value: initialValue,
      maxlength: 30
    });

    const removeBtn = createElement(
      "button",
      {
        type: "button",
        className: "btn-remove-skill",
        "aria-label": "Remove skill",
        title: "Remove skill",
        onClick: () => {
          markDirty();
          row.remove();
          updateSkillsState();
          validateFieldSkills();
        }
      },
      ["✕"]
    );

    input.addEventListener("input", () => {
      markDirty();
      validateFieldSkills();
    });

    input.addEventListener("blur", () => {
      validateFieldSkills();
    });

    row.appendChild(input);
    row.appendChild(removeBtn);
    skillsContainer.appendChild(row);

    updateSkillsState();
  }

  function updateSkillsState() {
    const rows = skillsContainer.querySelectorAll(".skill-row");
    const count = rows.length;

    skillsCountBadge.textContent = `${count} / 5 skills`;

    // Disable add button if limit reached
    addSkillBtn.disabled = count >= 5;

    // Hide or disable remove button if only 1 row remains
    const removeBtns = skillsContainer.querySelectorAll(".btn-remove-skill");
    removeBtns.forEach((btn) => {
      btn.style.visibility = count <= 1 ? "hidden" : "visible";
    });
  }

  addSkillBtn.addEventListener("click", () => {
    markDirty();
    const count = skillsContainer.querySelectorAll(".skill-row").length;
    if (count < 5) {
      renderSkillRow("");
      // Focus newly added input
      const inputs = skillsContainer.querySelectorAll(".skill-input");
      if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      }
      validateFieldSkills();
    }
  });

  // Initialize with 1 empty skill row
  renderSkillRow("");

  /* --- Password Visibility Toggles --- */
  const togglePwdBtn = document.getElementById("toggle-password");
  const toggleConfirmPwdBtn = document.getElementById("toggle-confirmPassword");

  function attachPasswordToggle(button, input) {
    if (!button || !input) return;
    button.addEventListener("click", () => {
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      button.textContent = isPassword ? "🙈" : "👁️";
      button.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
    });
  }

  attachPasswordToggle(togglePwdBtn, fields.password);
  attachPasswordToggle(toggleConfirmPwdBtn, fields.confirmPassword);

  /* --- Input & Blur Event Listeners for All Fields --- */
  fields.fullName.addEventListener("input", () => {
    markDirty();
    validateFieldFullName();
  });
  fields.fullName.addEventListener("blur", validateFieldFullName);

  fields.username.addEventListener("input", () => {
    markDirty();
    validateFieldUsername();
  });
  fields.username.addEventListener("blur", validateFieldUsername);

  fields.email.addEventListener("input", () => {
    markDirty();
    validateFieldEmail();
  });
  fields.email.addEventListener("blur", validateFieldEmail);

  fields.phone.addEventListener("input", () => {
    markDirty();
    validateFieldPhone();
  });
  fields.phone.addEventListener("blur", validateFieldPhone);

  fields.dob.addEventListener("input", () => {
    markDirty();
    validateFieldDob();
  });
  fields.dob.addEventListener("blur", validateFieldDob);

  fields.password.addEventListener("input", () => {
    markDirty();
    validateFieldPassword();
  });
  fields.password.addEventListener("blur", validateFieldPassword);

  fields.confirmPassword.addEventListener("input", () => {
    markDirty();
    validateFieldConfirmPassword();
  });
  fields.confirmPassword.addEventListener("blur", validateFieldConfirmPassword);

  fields.bio.addEventListener("input", () => {
    markDirty();
    validateFieldBio();
  });
  fields.bio.addEventListener("blur", validateFieldBio);

  fields.terms.addEventListener("change", () => {
    markDirty();
    validateFieldTerms();
  });

  /* --- Reset Form Handler --- */
  resetBtn.addEventListener("click", () => {
    modal.confirm({
      title: "Reset Registration Form?",
      message: "Are you sure you want to clear all entered fields? All progress will be lost.",
      confirmText: "Yes, Reset Form",
      confirmVariant: "danger",
      onConfirm: () => {
        form.reset();
        isRegisterFormDirty = false;

        // Reset inputs visual classes
        form.querySelectorAll(".is-valid, .is-invalid").forEach((el) => {
          el.classList.remove("is-valid", "is-invalid");
        });
        form.querySelectorAll(".validation-message").forEach((el) => {
          el.textContent = "";
        });

        // Reset dynamic skills
        skillsContainer.innerHTML = "";
        renderSkillRow("");

        // Reset strength meter
        strengthBar.style.width = "0%";
        strengthText.textContent = "Not entered";
        strengthText.style.color = "inherit";
        Object.values(ruleEls).forEach((el) => {
          el.classList.remove("rule-passed", "rule-failed");
        });

        // Reset dependent selects
        fields.state.disabled = true;
        fields.state.innerHTML = '<option value="">-- Select Country First --</option>';
        fields.city.disabled = true;
        fields.city.innerHTML = '<option value="">-- Select State First --</option>';

        // Reset bio counter
        bioCounter.textContent = "0 / 200";
        bioCounter.className = "character-counter";

        // Reset validation state
        Object.keys(validationState).forEach((k) => {
          validationState[k] = k === "bio";
        });
        updateFormSummaryAndSubmitButton();
        toast.show("Form has been reset.", "info");
      }
    });
  });

  /* --- Form Submission Handler --- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Trigger all validations once more
    validateFieldFullName();
    validateFieldUsername();
    validateFieldEmail();
    validateFieldPhone();
    validateFieldDob();
    validateFieldPassword();
    validateFieldConfirmPassword();
    validateFieldCountry();
    validateFieldState();
    validateFieldCity();
    validateFieldSkills();
    validateFieldBio();
    validateFieldTerms();

    const allPassed = Object.values(validationState).every(Boolean);

    if (!allPassed) {
      toast.show("Please fix all errors before submitting the form.", "error");
      const firstInvalid = form.querySelector(".is-invalid");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Collect validated skills
    const skillInputs = Array.from(skillsContainer.querySelectorAll(".skill-input"));
    const skills = skillInputs.map((i) => i.value.trim()).filter(Boolean);

    const newProfile = {
      fullName: fields.fullName.value.trim(),
      username: fields.username.value.trim(),
      email: fields.email.value.trim(),
      phone: fields.phone.value.replace(/\D/g, ""),
      dob: fields.dob.value,
      country: fields.country.value.trim(),
      state: fields.state.value.trim(),
      city: fields.city.value.trim(),
      skills,
      bio: fields.bio.value.trim()
    };

    // Save to localStorage
    const saved = store.saveProfile(newProfile);

    // Clear dirty state
    isRegisterFormDirty = false;

    // Show success feedback
    toast.show(`Profile for "${saved.fullName}" registered successfully!`, "success", 5000);

    // Navigate to dashboard
    router.navigate("/dashboard");
  });

  // Initial check
  updateFormSummaryAndSubmitButton();
}

/* ==========================================================================
   DYNAMIC DASHBOARD INTERACTIVITY & DOM MANIPULATION
   ========================================================================== */

function initDashboardView({ router }) {
  const profilesContainer = document.getElementById("profiles-container");
  const searchInput = document.getElementById("search-input");
  const searchClearBtn = document.getElementById("search-clear-btn");
  const filterCountry = document.getElementById("filter-country");
  const sortSelect = document.getElementById("sort-profiles");
  const visibleCountEl = document.getElementById("visible-count");
  const clearAllBtn = document.getElementById("btn-clear-all");
  const restoreDemoBtn = document.getElementById("btn-restore-demo");

  // Stats elements
  const statProfiles = document.getElementById("stat-total-profiles");
  const statCountries = document.getElementById("stat-total-countries");
  const statTopSkill = document.getElementById("stat-top-skill");

  if (!profilesContainer) return;

  let currentSearchQuery = "";
  let currentCountryFilter = "ALL";
  let currentSort = "newest";

  // Refresh country filter options based on existing profiles
  function refreshCountryFilterOptions() {
    const profiles = store.getProfiles();
    const countries = Array.from(
      new Set(profiles.map((p) => p.country && p.country.trim()).filter(Boolean))
    ).sort();

    filterCountry.innerHTML = '<option value="ALL">All Countries</option>';
    countries.forEach((country) => {
      const opt = createElement("option", { value: country }, [country]);
      if (country === currentCountryFilter) {
        opt.selected = true;
      }
      filterCountry.appendChild(opt);
    });
  }

  // Update statistics bar
  function updateStats() {
    const stats = store.getStatistics();
    statProfiles.textContent = stats.totalProfiles;
    statCountries.textContent = stats.totalCountries;
    statTopSkill.textContent = stats.mostCommonSkill;
  }

  // Filter and sort logic
  function getFilteredAndSortedProfiles() {
    let profiles = store.getProfiles();

    // 1. Filter by country
    if (currentCountryFilter !== "ALL") {
      profiles = profiles.filter((p) => p.country === currentCountryFilter);
    }

    // 2. Filter by search query (Name, username, email, skill)
    if (currentSearchQuery) {
      const q = currentSearchQuery.toLowerCase();
      profiles = profiles.filter((p) => {
        const nameMatch = p.fullName && p.fullName.toLowerCase().includes(q);
        const userMatch = p.username && p.username.toLowerCase().includes(q);
        const emailMatch = p.email && p.email.toLowerCase().includes(q);
        const skillMatch =
          Array.isArray(p.skills) &&
          p.skills.some((s) => typeof s === "string" && s.toLowerCase().includes(q));
        const cityMatch = p.city && p.city.toLowerCase().includes(q);
        return nameMatch || userMatch || emailMatch || skillMatch || cityMatch;
      });
    }

    // 3. Sort profiles
    profiles.sort((a, b) => {
      if (currentSort === "newest") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (currentSort === "oldest") {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (currentSort === "name-asc") {
        return (a.fullName || "").localeCompare(b.fullName || "");
      }
      if (currentSort === "name-desc") {
        return (b.fullName || "").localeCompare(a.fullName || "");
      }
      return 0;
    });

    return profiles;
  }

  // Helper to generate initials avatar with consistent background color
  function getAvatarInitials(name) {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getAvatarColor(name) {
    const colors = [
      "#4f46e5",
      "#0891b2",
      "#059669",
      "#d97706",
      "#dc2626",
      "#7c3aed",
      "#db2777",
      "#2563eb"
    ];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  // Render profiles strictly via safe DOM manipulation (XSS-safe)
  function renderProfiles() {
    updateStats();
    refreshCountryFilterOptions();

    const profiles = getFilteredAndSortedProfiles();
    visibleCountEl.textContent = profiles.length;

    // Clear previous elements
    profilesContainer.innerHTML = "";

    if (profiles.length === 0) {
      const allProfiles = store.getProfiles();
      const isEmptyStore = allProfiles.length === 0;

      const emptyCard = createElement("div", { className: "card empty-state-card" });
      const icon = createElement("div", { className: "empty-icon" }, [isEmptyStore ? "👥" : "🔍"]);
      const title = createElement(
        "h2",
        { className: "empty-title" },
        [isEmptyStore ? "No Registered Profiles Yet" : "No Matching Profiles Found"]
      );
      const text = createElement(
        "p",
        { className: "empty-text" },
        [
          isEmptyStore
            ? "Get started by creating your first profile using our advanced registration form, or load the default demo data."
            : `No profiles matched "${currentSearchQuery}". Try clearing your search or selecting a different country filter.`
        ]
      );

      const actionRow = createElement("div", { className: "empty-actions" });

      if (isEmptyStore) {
        const regLink = createElement(
          "a",
          { href: "/register", className: "btn btn-primary", dataset: { link: "true" } },
          ["+ Register First Profile"]
        );
        const demoBtn = createElement(
          "button",
          {
            type: "button",
            className: "btn btn-outline",
            onClick: () => {
              store.resetToDemo();
              toast.show("Demo profiles restored!", "success");
              renderProfiles();
            }
          },
          ["Load Sample Profiles"]
        );
        actionRow.appendChild(regLink);
        actionRow.appendChild(demoBtn);
      } else {
        const resetFiltersBtn = createElement(
          "button",
          {
            type: "button",
            className: "btn btn-secondary",
            onClick: () => {
              searchInput.value = "";
              currentSearchQuery = "";
              searchClearBtn.style.display = "none";
              filterCountry.value = "ALL";
              currentCountryFilter = "ALL";
              renderProfiles();
            }
          },
          ["Reset Search & Filters"]
        );
        actionRow.appendChild(resetFiltersBtn);
      }

      emptyCard.appendChild(icon);
      emptyCard.appendChild(title);
      emptyCard.appendChild(text);
      emptyCard.appendChild(actionRow);
      profilesContainer.appendChild(emptyCard);
      return;
    }

    // Build profile cards
    profiles.forEach((profile) => {
      const card = createElement("article", { className: "card profile-card" });

      // Card Header
      const header = createElement("div", { className: "profile-header" });
      const avatar = createElement(
        "div",
        {
          className: "profile-avatar",
          style: `background-color: ${getAvatarColor(profile.fullName)}`
        },
        [getAvatarInitials(profile.fullName)]
      );

      const identity = createElement("div", { className: "profile-identity" });
      const name = createElement("h3", { className: "profile-name" }, [profile.fullName]);
      const username = createElement("span", { className: "profile-username" }, [
        `@${profile.username}`
      ]);
      identity.appendChild(name);
      identity.appendChild(username);

      header.appendChild(avatar);
      header.appendChild(identity);

      // Card Body
      const body = createElement("div", { className: "profile-body" });

      // Info rows
      const contactRow = createElement("div", { className: "profile-detail-row" }, [
        createElement("span", { className: "detail-icon" }, ["✉"]),
        createElement("span", { className: "detail-text" }, [profile.email]),
        createElement("span", { className: "detail-divider" }, ["•"]),
        createElement("span", { className: "detail-icon" }, ["📞"]),
        createElement("span", { className: "detail-text" }, [
          profile.phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
        ])
      ]);

      const locationRow = createElement("div", { className: "profile-detail-row" }, [
        createElement("span", { className: "detail-icon" }, ["📍"]),
        createElement("span", { className: "detail-text" }, [
          `${profile.city}, ${profile.state}, ${profile.country}`
        ])
      ]);

      body.appendChild(contactRow);
      body.appendChild(locationRow);

      // Skills badges
      if (Array.isArray(profile.skills) && profile.skills.length > 0) {
        const skillsRow = createElement("div", { className: "profile-skills-row" });
        profile.skills.forEach((skill) => {
          const badge = createElement("span", { className: "skill-badge" }, [skill]);
          skillsRow.appendChild(badge);
        });
        body.appendChild(skillsRow);
      }

      // Bio text (safely rendered using textContent)
      if (profile.bio) {
        const bioEl = createElement("p", { className: "profile-bio" }, [profile.bio]);
        body.appendChild(bioEl);
      }

      // Card Footer
      const footer = createElement("div", { className: "profile-footer" });
      const dateText = profile.createdAt
        ? new Date(profile.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
          })
        : "Recent";

      const dateEl = createElement("span", { className: "profile-date" }, [`Joined: ${dateText}`]);

      const actions = createElement("div", { className: "profile-actions" });

      const editBtn = createElement(
        "button",
        {
          type: "button",
          className: "btn btn-outline btn-sm",
          onClick: () => openEditProfileModal(profile.id)
        },
        ["Edit"]
      );

      const deleteBtn = createElement(
        "button",
        {
          type: "button",
          className: "btn btn-danger-outline btn-sm",
          onClick: () => confirmDeleteProfile(profile)
        },
        ["Delete"]
      );

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      footer.appendChild(dateEl);
      footer.appendChild(actions);

      card.appendChild(header);
      card.appendChild(body);
      card.appendChild(footer);

      profilesContainer.appendChild(card);
    });
  }

  /* --- Delete Confirmation Modal --- */
  function confirmDeleteProfile(profile) {
    modal.confirm({
      title: "Delete Profile?",
      message: `Are you sure you want to delete the profile for "${profile.fullName}" (@${profile.username})? This action cannot be reversed.`,
      confirmText: "Yes, Delete Profile",
      confirmVariant: "danger",
      onConfirm: () => {
        store.deleteProfile(profile.id);
        toast.show(`Profile for "${profile.fullName}" was deleted.`, "info");
        renderProfiles();
      }
    });
  }

  /* --- Edit Profile Modal Dialog with Pure Validators --- */
  function openEditProfileModal(profileId) {
    const profile = store.getProfileById(profileId);
    if (!profile) return;

    // Create edit form DOM
    const form = createElement("form", { className: "modal-edit-form", novalidate: true });

    // Full name
    const nameGroup = createElement("div", { className: "form-group" });
    const nameLabel = createElement("label", { className: "form-label" }, ["Full Name"]);
    const nameInput = createElement("input", {
      type: "text",
      className: "form-input",
      value: profile.fullName || "",
      maxlength: 50
    });
    const nameError = createElement("span", { className: "validation-message" });
    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(nameInput);
    nameGroup.appendChild(nameError);

    // Email
    const emailGroup = createElement("div", { className: "form-group" });
    const emailLabel = createElement("label", { className: "form-label" }, ["Email Address"]);
    const emailInput = createElement("input", {
      type: "email",
      className: "form-input",
      value: profile.email || ""
    });
    const emailError = createElement("span", { className: "validation-message" });
    emailGroup.appendChild(emailLabel);
    emailGroup.appendChild(emailInput);
    emailGroup.appendChild(emailError);

    // Phone
    const phoneGroup = createElement("div", { className: "form-group" });
    const phoneLabel = createElement("label", { className: "form-label" }, ["Phone (10 Digits)"]);
    const phoneInput = createElement("input", {
      type: "tel",
      className: "form-input",
      value: profile.phone || ""
    });
    const phoneError = createElement("span", { className: "validation-message" });
    phoneGroup.appendChild(phoneLabel);
    phoneGroup.appendChild(phoneInput);
    phoneGroup.appendChild(phoneError);

    // Location (Dependent selects for edit)
    const locRow = createElement("div", { className: "form-row form-row-3" });

    // Country
    const cGroup = createElement("div", { className: "form-group" });
    const cLabel = createElement("label", { className: "form-label" }, ["Country"]);
    const cSelect = createElement("select", { className: "form-select" });
    cGroup.appendChild(cLabel);
    cGroup.appendChild(cSelect);

    // State
    const sGroup = createElement("div", { className: "form-group" });
    const sLabel = createElement("label", { className: "form-label" }, ["State"]);
    const sSelect = createElement("select", { className: "form-select" });
    sGroup.appendChild(sLabel);
    sGroup.appendChild(sSelect);

    // City
    const cityGroup = createElement("div", { className: "form-group" });
    const cityLabel = createElement("label", { className: "form-label" }, ["City"]);
    const citySelect = createElement("select", { className: "form-select" });
    cityGroup.appendChild(cityLabel);
    cityGroup.appendChild(citySelect);

    locRow.appendChild(cGroup);
    locRow.appendChild(sGroup);
    locRow.appendChild(cityGroup);

    // Populate countries
    cSelect.innerHTML = '<option value="">-- Choose Country --</option>';
    getCountries().forEach((c) => {
      const opt = createElement("option", { value: c }, [c]);
      if (c === profile.country) opt.selected = true;
      cSelect.appendChild(opt);
    });

    // Populate states
    function syncEditStates() {
      const states = getStates(cSelect.value);
      sSelect.innerHTML = '<option value="">-- Choose State --</option>';
      states.forEach((s) => {
        const opt = createElement("option", { value: s }, [s]);
        if (s === profile.state) opt.selected = true;
        sSelect.appendChild(opt);
      });
      sSelect.disabled = states.length === 0;
    }

    function syncEditCities() {
      const cities = getCities(cSelect.value, sSelect.value);
      citySelect.innerHTML = '<option value="">-- Choose City --</option>';
      cities.forEach((ct) => {
        const opt = createElement("option", { value: ct }, [ct]);
        if (ct === profile.city) opt.selected = true;
        citySelect.appendChild(opt);
      });
      citySelect.disabled = cities.length === 0;
    }

    syncEditStates();
    syncEditCities();

    cSelect.addEventListener("change", () => {
      syncEditStates();
      syncEditCities();
    });
    sSelect.addEventListener("change", syncEditCities);

    // Skills dynamic rows in Edit modal
    const skillsGroup = createElement("div", { className: "form-group" });
    const skillsLabel = createElement("label", { className: "form-label" }, ["Skills (1 to 5)"]);
    const editSkillsContainer = createElement("div", { className: "skills-container" });
    const editAddSkillBtn = createElement(
      "button",
      { type: "button", className: "btn btn-outline btn-sm mt-2" },
      ["+ Add Skill"]
    );
    const skillsError = createElement("span", { className: "validation-message" });

    function addEditSkillRow(val = "") {
      const row = createElement("div", { className: "skill-row" });
      const sInput = createElement("input", {
        type: "text",
        className: "form-input edit-skill-input",
        value: val
      });
      const rmBtn = createElement(
        "button",
        {
          type: "button",
          className: "btn-remove-skill",
          onClick: () => {
            row.remove();
            checkEditSkillsCount();
          }
        },
        ["✕"]
      );
      row.appendChild(sInput);
      row.appendChild(rmBtn);
      editSkillsContainer.appendChild(row);
      checkEditSkillsCount();
    }

    function checkEditSkillsCount() {
      const rows = editSkillsContainer.querySelectorAll(".skill-row");
      editAddSkillBtn.disabled = rows.length >= 5;
      const rms = editSkillsContainer.querySelectorAll(".btn-remove-skill");
      rms.forEach((b) => (b.style.visibility = rows.length <= 1 ? "hidden" : "visible"));
    }

    (profile.skills || ["JavaScript"]).forEach((s) => addEditSkillRow(s));
    editAddSkillBtn.addEventListener("click", () => {
      if (editSkillsContainer.querySelectorAll(".skill-row").length < 5) {
        addEditSkillRow("");
      }
    });

    skillsGroup.appendChild(skillsLabel);
    skillsGroup.appendChild(editSkillsContainer);
    skillsGroup.appendChild(editAddSkillBtn);
    skillsGroup.appendChild(skillsError);

    // Bio
    const bioGroup = createElement("div", { className: "form-group" });
    const bioLabel = createElement("label", { className: "form-label" }, ["Bio (Max 200 chars)"]);
    const bioInput = createElement("textarea", {
      className: "form-textarea",
      rows: 3,
      maxlength: 200
    });
    bioInput.value = profile.bio || "";
    const bioError = createElement("span", { className: "validation-message" });
    bioGroup.appendChild(bioLabel);
    bioGroup.appendChild(bioInput);
    bioGroup.appendChild(bioError);

    form.appendChild(nameGroup);
    form.appendChild(emailGroup);
    form.appendChild(phoneGroup);
    form.appendChild(locRow);
    form.appendChild(skillsGroup);
    form.appendChild(bioGroup);

    // Modal Footer
    const footer = createElement("div", { className: "modal-actions" });
    const cancelBtn = createElement(
      "button",
      {
        type: "button",
        className: "btn btn-secondary",
        onClick: () => modal.close()
      },
      ["Cancel"]
    );

    const saveBtn = createElement(
      "button",
      {
        type: "button",
        className: "btn btn-primary",
        onClick: () => {
          // Validate fields using pure validators
          const nameErr = validateFullName(nameInput.value);
          nameError.textContent = nameErr;

          const existingEmails = store.getAllEmails();
          const emailErr = validateEmail(emailInput.value, existingEmails, profile.email);
          emailError.textContent = emailErr;

          const phoneErr = validatePhone(phoneInput.value);
          phoneError.textContent = phoneErr;

          const editSkills = Array.from(
            editSkillsContainer.querySelectorAll(".edit-skill-input")
          ).map((i) => i.value.trim());
          const skillsErr = validateSkills(editSkills);
          skillsError.textContent = skillsErr;

          const bioErr = validateBio(bioInput.value);
          bioError.textContent = bioErr;

          if (nameErr || emailErr || phoneErr || skillsErr || bioErr) {
            toast.show("Please fix validation errors in the form.", "error");
            return;
          }

          // Save updates
          store.updateProfile(profile.id, {
            fullName: nameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.replace(/\D/g, ""),
            country: cSelect.value,
            state: sSelect.value,
            city: citySelect.value,
            skills: editSkills.filter(Boolean),
            bio: bioInput.value.trim()
          });

          modal.close();
          toast.show("Profile updated successfully!", "success");
          renderProfiles();
        }
      },
      ["Save Changes"]
    );

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    modal.open({
      title: `Edit Profile: ${profile.fullName}`,
      body: form,
      footer
    });
  }

  /* --- Toolbar Filter, Search, Sort Event Handlers --- */
  const onSearchChange = debounce((e) => {
    currentSearchQuery = searchInput.value.trim();
    searchClearBtn.style.display = currentSearchQuery ? "block" : "none";
    renderProfiles();
  }, 250);

  searchInput.addEventListener("input", onSearchChange);

  searchClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    currentSearchQuery = "";
    searchClearBtn.style.display = "none";
    searchInput.focus();
    renderProfiles();
  });

  filterCountry.addEventListener("change", () => {
    currentCountryFilter = filterCountry.value;
    renderProfiles();
  });

  sortSelect.addEventListener("change", () => {
    currentSort = sortSelect.value;
    renderProfiles();
  });

  /* --- Clear All Profiles Modal --- */
  clearAllBtn.addEventListener("click", () => {
    const total = store.getProfiles().length;
    if (total === 0) {
      toast.show("There are no profiles to clear.", "info");
      return;
    }

    modal.confirm({
      title: "Clear All Profiles?",
      message: `Are you sure you want to delete all ${total} profiles? This will completely clear your local storage profiles.`,
      confirmText: "Yes, Clear All",
      confirmVariant: "danger",
      onConfirm: () => {
        store.clearAllProfiles();
        toast.show("All profiles have been cleared.", "warning");
        renderProfiles();
      }
    });
  });

  /* --- Restore Demo Data --- */
  restoreDemoBtn.addEventListener("click", () => {
    modal.confirm({
      title: "Reset to Demo Profiles?",
      message: "This will replace the current profile directory with the default sample profiles.",
      confirmText: "Restore Demo Data",
      confirmVariant: "primary",
      onConfirm: () => {
        store.resetToDemo();
        toast.show("Demo profiles loaded successfully!", "success");
        renderProfiles();
      }
    });
  });

  // Initial render
  renderProfiles();
}

/* ==========================================================================
   APP INITIALIZATION & ROUTER CONFIGURATION
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const appContainer = document.getElementById("app");
  if (!appContainer) return;

  // Setup Mobile Nav Toggle
  const mobileToggleBtn = document.getElementById("mobile-nav-toggle");
  const navMenu = document.getElementById("nav-menu");

  if (mobileToggleBtn && navMenu) {
    mobileToggleBtn.addEventListener("click", () => {
      const isExpanded = mobileToggleBtn.getAttribute("aria-expanded") === "true";
      mobileToggleBtn.setAttribute("aria-expanded", String(!isExpanded));
      navMenu.classList.toggle("nav-menu-open");
    });

    // Close menu when a link is clicked
    navMenu.addEventListener("click", (e) => {
      if (e.target.closest("a[data-link]")) {
        mobileToggleBtn.setAttribute("aria-expanded", "false");
        navMenu.classList.remove("nav-menu-open");
      }
    });
  }

  // Initialize Router
  const router = new Router({
    appContainer,
    routes: {
      "/": {
        title: "ProfileHub - Developer Directory & SPA Validation",
        render: getHomeView
      },
      "/register": {
        title: "Register Developer Profile - ProfileHub",
        render: getRegisterView,
        init: initRegisterView
      },
      "/dashboard": {
        title: "Dynamic Dashboard - ProfileHub",
        render: getDashboardView,
        init: initDashboardView
      },
      "/about": {
        title: "About ProfileHub - Architecture & Tech Specs",
        render: getAboutView
      },
      "*": {
        title: "404 Page Not Found - ProfileHub",
        render: getNotFoundView
      }
    }
  });

  // Connect Router with Form Dirty Route Guard
  router.setUnsavedChangesGuard(() => isRegisterFormDirty);
});

