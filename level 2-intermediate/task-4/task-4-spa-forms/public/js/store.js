/**
 * store.js
 * Persistent client-side data layer backed by localStorage.
 * Handles profile CRUD operations, demo data seeding, and statistical aggregations.
 */

const STORAGE_KEY = "profilehub_profiles_v1";

const DEMO_PROFILES = [
  {
    id: "demo-1",
    fullName: "Alex Rivera",
    username: "alex_rivera",
    email: "alex.rivera@example.com",
    phone: "4155552671",
    dob: "1996-04-12",
    country: "United States",
    state: "California",
    city: "San Francisco",
    skills: ["JavaScript", "Node.js", "CSS", "Express"],
    bio: "Senior front-end engineer passionate about accessible interfaces and clean architectural design.",
    createdAt: "2026-11-01T10:30:00.000Z"
  },
  {
    id: "demo-2",
    fullName: "Priya Sharma",
    username: "priya_dev",
    email: "priya.sharma@example.org",
    phone: "9876543210",
    dob: "1998-08-23",
    country: "India",
    state: "Karnataka",
    city: "Bengaluru",
    skills: ["JavaScript", "HTML", "CSS", "Python"],
    bio: "Full stack enthusiast building high-performance web applications and single-page apps.",
    createdAt: "2026-11-05T14:15:00.000Z"
  },
  {
    id: "demo-3",
    fullName: "Oliver Bennett",
    username: "oliver_b",
    email: "oliver.b@example.co.uk",
    phone: "7911123456",
    dob: "1992-11-30",
    country: "United Kingdom",
    state: "England",
    city: "London",
    skills: ["JavaScript", "Accessibility", "Design Systems"],
    bio: "UI developer and design technologist creating human-centered digital experiences.",
    createdAt: "2026-11-09T09:00:00.000Z"
  }
];

class ProfileStore {
  constructor() {
    this._initStore();
  }

  _initStore() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Seed initial demo data for rich first-time exploration
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_PROFILES));
      }
    } catch (err) {
      console.warn("localStorage is not available or blocked:", err);
    }
  }

  /**
   * Retrieves all profiles from localStorage.
   * @returns {Array<Object>}
   */
  getProfiles() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error("Error reading profiles from localStorage:", err);
      return [];
    }
  }

  /**
   * Finds a single profile by ID.
   * @param {string} id
   */
  getProfileById(id) {
    const profiles = this.getProfiles();
    return profiles.find((p) => p.id === id) || null;
  }

  /**
   * Saves a new profile.
   * @param {Object} profileData
   * @returns {Object} saved profile
   */
  saveProfile(profileData) {
    const profiles = this.getProfiles();
    const newProfile = {
      ...profileData,
      id: "profile_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString()
    };
    profiles.unshift(newProfile);
    this._persist(profiles);
    return newProfile;
  }

  /**
   * Updates an existing profile by ID.
   * @param {string} id
   * @param {Object} updatedFields
   * @returns {Object|null}
   */
  updateProfile(id, updatedFields) {
    const profiles = this.getProfiles();
    const index = profiles.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const updated = {
      ...profiles[index],
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };
    profiles[index] = updated;
    this._persist(profiles);
    return updated;
  }

  /**
   * Deletes a profile by ID.
   * @param {string} id
   * @returns {boolean}
   */
  deleteProfile(id) {
    const profiles = this.getProfiles();
    const filtered = profiles.filter((p) => p.id !== id);
    if (filtered.length !== profiles.length) {
      this._persist(filtered);
      return true;
    }
    return false;
  }

  /**
   * Clears all profiles.
   */
  clearAllProfiles() {
    this._persist([]);
  }

  /**
   * Resets the store back to the default demo profiles.
   */
  resetToDemo() {
    this._persist(DEMO_PROFILES);
  }

  /**
   * Returns all registered usernames.
   */
  getAllUsernames() {
    return this.getProfiles().map((p) => p.username).filter(Boolean);
  }

  /**
   * Returns all registered emails.
   */
  getAllEmails() {
    return this.getProfiles().map((p) => p.email).filter(Boolean);
  }

  /**
   * Calculates dashboard summary statistics.
   */
  getStatistics() {
    const profiles = this.getProfiles();
    const totalProfiles = profiles.length;

    // Unique countries
    const countries = new Set(
      profiles.map((p) => p.country && p.country.trim()).filter(Boolean)
    );
    const totalCountries = countries.size;

    // Most common skill
    const skillCounts = {};
    for (const p of profiles) {
      if (Array.isArray(p.skills)) {
        for (const skill of p.skills) {
          const s = skill.trim();
          if (s) {
            skillCounts[s] = (skillCounts[s] || 0) + 1;
          }
        }
      }
    }

    let mostCommonSkill = "None";
    let highestCount = 0;
    for (const [skill, count] of Object.entries(skillCounts)) {
      if (count > highestCount) {
        highestCount = count;
        mostCommonSkill = `${skill} (${count})`;
      }
    }

    return {
      totalProfiles,
      totalCountries,
      mostCommonSkill,
      skillCounts
    };
  }

  _persist(profiles) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch (err) {
      console.error("Failed to save to localStorage:", err);
    }
  }
}

export const store = new ProfileStore();

