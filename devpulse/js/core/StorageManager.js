/**
 * StorageManager - Centralized Storage Wrapper
 *
 * Responsibilities:
 * 1. Provides a single source of truth for storage keys ('devpulse_users' and 'devpulse_session').
 * 2. Wraps localStorage and sessionStorage reads and writes with reliable JSON parsing and serialization.
 * 3. Gracefully handles quota errors or corrupt storage data using try/catch blocks.
 */
export class StorageManager {
  // Static key constants serving as the single source of truth across the application
  static KEYS = {
    USERS: 'devpulse_users',
    SESSION: 'devpulse_session'
  };

  /**
   * Retrieves and parses JSON data from localStorage or sessionStorage.
   * @param {string} key - Storage key to read.
   * @param {'local'|'session'} [storageType='local'] - Target Web Storage instance.
   * @returns {any|null} Parsed object/array or null if not found/corrupted.
   */
  get(key, storageType = 'local') {
    const storage = storageType === 'session' ? sessionStorage : localStorage;
    try {
      const item = storage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`[StorageManager] Failed to parse item "${key}" from ${storageType}Storage:`, error);
      return null;
    }
  }

  /**
   * Serializes and writes data to localStorage or sessionStorage.
   * @param {string} key - Storage key to write.
   * @param {any} value - Value to serialize and store.
   * @param {'local'|'session'} [storageType='local'] - Target Web Storage instance.
   * @returns {boolean} True if write succeeded, false otherwise.
   */
  set(key, value, storageType = 'local') {
    const storage = storageType === 'session' ? sessionStorage : localStorage;
    try {
      const serialized = JSON.stringify(value);
      storage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error(`[StorageManager] Failed to set item "${key}" in ${storageType}Storage:`, error);
      return false;
    }
  }

  /**
   * Removes a specific item from storage.
   * @param {string} key - Storage key to delete.
   * @param {'local'|'session'} [storageType='local'] - Target Web Storage instance.
   */
  remove(key, storageType = 'local') {
    const storage = storageType === 'session' ? sessionStorage : localStorage;
    try {
      storage.removeItem(key);
    } catch (error) {
      console.error(`[StorageManager] Failed to remove item "${key}" from ${storageType}Storage:`, error);
    }
  }

  /* ==========================================
     DevPulse Specific Domain Methods
     ========================================== */

  /**
   * Fetches all registered users array from localStorage.
   * @returns {Array<Object>} Array of stored user objects.
   */
  getUsers() {
    const users = this.get(StorageManager.KEYS.USERS, 'local');
    return Array.isArray(users) ? users : [];
  }

  /**
   * Saves updated users array to localStorage.
   * @param {Array<Object>} users - Complete users array.
   * @returns {boolean} Success status.
   */
  saveUsers(users) {
    return this.set(StorageManager.KEYS.USERS, users, 'local');
  }

  /**
   * Retrieves active session object from sessionStorage.
   * @returns {Object|null} Session details or null if unauthenticated.
   */
  getSession() {
    return this.get(StorageManager.KEYS.SESSION, 'session');
  }

  /**
   * Creates an active user session in sessionStorage.
   * @param {Object} sessionData - Session object containing userId and login timestamp.
   * @returns {boolean} Success status.
   */
  setSession(sessionData) {
    return this.set(StorageManager.KEYS.SESSION, sessionData, 'session');
  }

  /**
   * Clears active session from sessionStorage.
   */
  clearSession() {
    this.remove(StorageManager.KEYS.SESSION, 'session');
  }

  /**
   * Updates specific fields for a user by userId in localStorage.
   * @param {string} userId
   * @param {Object} updates
   * @returns {boolean} Success status
   */
  updateUser(userId, updates) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      return this.saveUsers(users);
    }
    return false;
  }

  /**
   * Permanently deletes a user account and associated user data from localStorage.
   * @param {string} userId
   */
  deleteUserAccount(userId) {
    if (!userId) return;
    const users = this.getUsers().filter(u => u.id !== userId);
    this.saveUsers(users);

    // Remove user specific data
    this.remove(`devpulse_tasks_${userId}`, 'local');
    this.remove(`devpulse_snippets_${userId}`, 'local');
    this.remove(`devpulse_reminders_${userId}`, 'local');
    this.clearSession();
  }
}
