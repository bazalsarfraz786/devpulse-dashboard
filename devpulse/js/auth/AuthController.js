import { StorageManager } from '../core/StorageManager.js';
import { Validator } from '../core/Validator.js';

/**
 * AuthController - Authentication Business Logic
 *
 * Responsibilities:
 * 1. Handles registration (signup) and authentication (login) operations.
 * 2. Client-side password security: Hashes passwords using Web Crypto API SHA-256 before storage.
 * 3. Enforces unique email constraints across registered users.
 * 4. Manages user session creation in sessionStorage.
 *
 * Note on Async Design:
 * Methods return Promises (via async/await) despite Web Storage being synchronous.
 * This preserves standard async API conventions for seamless future integration with backend REST/GraphQL APIs.
 */
export class AuthController {
  // Private field for StorageManager instance to prevent direct external mutation
  #storageManager;

  constructor() {
    this.#storageManager = new StorageManager();
  }

  /**
   * Hashes plain-text password using native Web Crypto API (SHA-256).
   * Web Crypto API is built into modern browsers and operates asynchronously.
   *
   * @param {string} password - Plaintext password input.
   * @returns {Promise<string>} Hexadecimal SHA-256 hash string.
   */
  async #hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Handles new user registration.
   *
   * @param {Object} formData - Registration details.
   * @param {string} formData.fullName
   * @param {string} formData.email
   * @param {string} formData.password
   * @param {string} formData.confirmPassword
   * @returns {Promise<{ success: boolean, message: string, user?: Object }>} Result status payload.
   */
  async signup({ fullName, email, password, confirmPassword }) {
    // 1. Inputs validation check
    if (!Validator.validateFullName(fullName)) {
      return { success: false, message: 'Please enter your full name (minimum 2 characters).' };
    }

    if (!Validator.validateEmail(email)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    if (!Validator.validatePassword(password)) {
      return { success: false, message: 'Password must be at least 8 characters with letters and numbers.' };
    }

    if (!Validator.passwordsMatch(password, confirmPassword)) {
      return { success: false, message: 'Passwords do not match.' };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = this.#storageManager.getUsers();

    // 2. Duplicate Account Prevention
    const existingUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
      return {
        success: false,
        message: 'An account with this email address already exists. Please log in instead.'
      };
    }

    // 3. Hash password using Web Crypto API SHA-256
    const passwordHash = await this.#hashPassword(password);

    // 4. Construct user object
    const newUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash: passwordHash,
      createdAt: new Date().toISOString()
    };

    // 5. Persist to localStorage
    users.push(newUser);
    const saved = this.#storageManager.saveUsers(users);

    if (!saved) {
      return { success: false, message: 'Storage error: Unable to save account. Please try again.' };
    }

    // 6. Return success without establishing session (user will log in on login view)
    return {
      success: true,
      message: 'Account created successfully! Please log in with your credentials.',
      user: { id: newUser.id, fullName: newUser.fullName, email: newUser.email }
    };
  }

  /**
   * Handles user authentication & login.
   *
   * @param {Object} formData - Login credentials.
   * @param {string} formData.email
   * @param {string} formData.password
   * @returns {Promise<{ success: boolean, message: string, user?: Object }>} Result status payload.
   */
  async login({ email, password }) {
    // 1. Basic validation check
    if (!Validator.validateEmail(email)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    if (!password) {
      return { success: false, message: 'Please enter your password.' };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = this.#storageManager.getUsers();

    // 2. Locate user record
    const user = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      // Generic error message to prevent user enumeration security issues
      return { success: false, message: 'Invalid email or password.' };
    }

    // 3. Hash provided password & verify match against stored hash
    const inputHash = await this.#hashPassword(password);
    if (inputHash !== user.passwordHash) {
      return { success: false, message: 'Invalid email or password.' };
    }

    // 4. Create active session in sessionStorage
    const session = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      loginAt: new Date().toISOString()
    };
    this.#storageManager.setSession(session);

    return {
      success: true,
      message: 'Authentication successful! Redirecting...',
      user: { id: user.id, fullName: user.fullName, email: user.email }
    };
  }

  /**
   * Checks if user has an active session in sessionStorage.
   * @returns {boolean} True if authenticated.
   */
  isAuthenticated() {
    return !!this.#storageManager.getSession();
  }
}
