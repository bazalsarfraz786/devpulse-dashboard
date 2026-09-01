import { StorageManager } from '../core/StorageManager.js';

/**
 * OnboardingController - Onboarding Access & Data Persistence Logic
 *
 * Responsibilities:
 * 1. Validates active user session from sessionStorage.
 * 2. Checks per-user completion status flag in localStorage ('devpulse_onboarding_complete_<userId>').
 * 3. Accumulates 3-step setup responses across user interactions.
 * 4. Reuses StorageManager to update the user record in 'devpulse_users' and flag completion.
 */
export class OnboardingController {
  #storageManager;
  #currentUser;
  #collectedData;

  constructor() {
    this.#storageManager = new StorageManager();
    this.#currentUser = null;
    this.#collectedData = {
      githubUsername: '',
      primaryFocus: '',
      themePreference: ''
    };
  }

  /**
   * Enforces onboarding access policies.
   * - Redirects to auth.html if no session exists.
   * - Redirects to dashboard.html if onboarding flag is already true for this user.
   *
   * @returns {{ allowed: boolean, redirect?: string, user?: Object }} Access status payload.
   */
  checkAccess() {
    // 1. Verify active user session in sessionStorage
    const session = this.#storageManager.getSession();
    if (!session || !session.userId) {
      return { allowed: false, redirect: 'auth.html' };
    }

    // 2. Check per-user completion flag in localStorage
    const flagKey = `devpulse_onboarding_complete_${session.userId}`;
    const isComplete = this.#storageManager.get(flagKey, 'local');

    if (isComplete === 'true' || isComplete === true) {
      return { allowed: false, redirect: 'dashboard.html' };
    }

    // 3. Locate matching user record
    const users = this.#storageManager.getUsers();
    const user = users.find(u => u.id === session.userId);

    this.#currentUser = user || { id: session.userId, email: session.email, fullName: session.fullName };

    return {
      allowed: true,
      userId: session.userId,
      user: this.#currentUser
    };
  }

  /**
   * Stores answer data for a specific step.
   * @param {'githubUsername'|'primaryFocus'|'themePreference'} key - Data key.
   * @param {string} value - User answer.
   */
  saveStepData(key, value) {
    if (key in this.#collectedData) {
      this.#collectedData[key] = value;
    }
  }

  /**
   * Retrieves step data stored so far.
   * @param {string} key
   * @returns {string}
   */
  getStepData(key) {
    return this.#collectedData[key] || '';
  }

  /**
   * Finalizes onboarding setup:
   * 1. Updates user record in 'devpulse_users' with githubUsername, primaryFocus, and themePreference.
   * 2. Sets 'devpulse_onboarding_complete_<userId>' flag to true in localStorage.
   *
   * @returns {{ success: boolean, message?: string }} Result status.
   */
  completeOnboarding() {
    if (!this.#currentUser || !this.#currentUser.id) {
      return { success: false, message: 'No active session user found.' };
    }

    const userId = this.#currentUser.id;
    const users = this.#storageManager.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex !== -1) {
      // Update existing record
      users[userIndex] = {
        ...users[userIndex],
        githubUsername: this.#collectedData.githubUsername.trim(),
        primaryFocus: this.#collectedData.primaryFocus,
        themePreference: this.#collectedData.themePreference,
        onboardedAt: new Date().toISOString()
      };
      this.#storageManager.saveUsers(users);
    }

    // Set per-user completion flag in localStorage
    const flagKey = `devpulse_onboarding_complete_${userId}`;
    this.#storageManager.set(flagKey, 'true', 'local');

    return { success: true };
  }
}
