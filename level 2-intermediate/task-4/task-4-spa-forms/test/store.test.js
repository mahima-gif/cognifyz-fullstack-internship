import test from "node:test";
import assert from "node:assert/strict";

// Mock localStorage for Node.js environment
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new LocalStorageMock();

// Dynamically import store after localStorage mock is configured
const { store } = await import("../public/js/store.js");

test("Store: Persistence, CRUD, and Statistics", async (t) => {
  await t.test("initializes with demo profiles", () => {
    const profiles = store.getProfiles();
    assert.ok(profiles.length >= 3, "Should have at least 3 initial demo profiles");
    assert.equal(profiles[0].fullName, "Alex Rivera");
  });

  await t.test("saves a new profile and retrieves by id", () => {
    const newProfile = {
      fullName: "Samantha Carter",
      username: "sam_carter",
      email: "sam.carter@example.com",
      phone: "5551234567",
      dob: "1994-06-15",
      country: "United States",
      state: "California",
      city: "Los Angeles",
      skills: ["JavaScript", "TypeScript", "Node.js"],
      bio: "Senior engineer building scalable SPA applications."
    };

    const saved = store.saveProfile(newProfile);
    assert.ok(saved.id.startsWith("profile_"), "ID should be generated");
    assert.ok(saved.createdAt, "createdAt timestamp should exist");

    const retrieved = store.getProfileById(saved.id);
    assert.equal(retrieved.fullName, "Samantha Carter");
    assert.equal(retrieved.username, "sam_carter");
  });

  await t.test("updates an existing profile", () => {
    const all = store.getProfiles();
    const target = all.find((p) => p.username === "sam_carter");
    assert.ok(target, "Should find saved profile");

    const updated = store.updateProfile(target.id, {
      bio: "Updated bio for Samantha.",
      skills: ["JavaScript", "TypeScript", "Node.js", "Express"]
    });

    assert.equal(updated.bio, "Updated bio for Samantha.");
    assert.equal(updated.skills.length, 4);
    assert.ok(updated.updatedAt, "Should stamp updatedAt");
  });

  await t.test("calculates statistics accurately", () => {
    const stats = store.getStatistics();
    assert.ok(stats.totalProfiles >= 4);
    assert.ok(stats.totalCountries >= 3);
    assert.ok(stats.mostCommonSkill.includes("JavaScript"));
  });

  await t.test("deletes a profile by id", () => {
    const all = store.getProfiles();
    const countBefore = all.length;
    const target = all[0];

    const deleted = store.deleteProfile(target.id);
    assert.equal(deleted, true);

    const allAfter = store.getProfiles();
    assert.equal(allAfter.length, countBefore - 1);
    assert.equal(store.getProfileById(target.id), null);
  });

  await t.test("resets to demo profiles", () => {
    store.clearAllProfiles();
    assert.equal(store.getProfiles().length, 0);

    store.resetToDemo();
    assert.equal(store.getProfiles().length, 3);
  });
});

