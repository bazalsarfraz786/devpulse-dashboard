import { StorageManager } from './StorageManager.js';

/**
 * StateManager - Singleton Pattern Implementation
 *
 * DESIGN PATTERN RATIONALE:
 * The Singleton pattern restricts instantiation of a class to a single, globally shared instance.
 * In a client-side Single Page Application, having multiple state managers can lead to race conditions
 * and out-of-sync UI widgets. StateManager guarantees a single source of truth for in-memory app state
 * (user info, task board list, code snippets, timer settings) while handling automatic local storage syncing.
 */
export class StateManager {
  // Static private field holding the single instance handle
  static #instance = null;

  // Private state variables
  #storageManager;
  #currentUser;
  #tasks;
  #snippets;
  #reminders;

  constructor() {
    // Prevent direct instantiation if an instance already exists
    if (StateManager.#instance) {
      return StateManager.#instance;
    }

    this.#storageManager = new StorageManager();
    this.#currentUser = null;
    this.#tasks = [];
    this.#snippets = [];
    this.#reminders = { enabled: false, intervalMinutes: 60, message: 'Time to stretch and drink some water!' };

    StateManager.#instance = this;
  }

  /**
   * Static accessor returning the single shared instance of StateManager.
   * @returns {StateManager}
   */
  static getInstance() {
    if (!StateManager.#instance) {
      StateManager.#instance = new StateManager();
    }
    return StateManager.#instance;
  }

  /**
   * Initializes state with logged-in user details and loads persisted data.
   * @param {Object} user - Logged in user profile object.
   */
  initialize(user) {
    this.#currentUser = user;
    if (!user || !user.id) return;

    const userId = user.id;

    // Load user tasks from localStorage
    const savedTasks = this.#storageManager.get(`devpulse_tasks_${userId}`, 'local');
    this.#tasks = Array.isArray(savedTasks) ? savedTasks : this.#getDefaultTasks();

    // Load user snippets from localStorage
    const savedSnippets = this.#storageManager.get(`devpulse_snippets_${userId}`, 'local');
    this.#snippets = Array.isArray(savedSnippets) ? savedSnippets : this.#getDefaultSnippets();

    // Load posture reminder settings from localStorage
    const savedReminders = this.#storageManager.get(`devpulse_reminders_${userId}`, 'local');
    if (savedReminders) {
      this.#reminders = { ...this.#reminders, ...savedReminders };
    }
  }

  /* ==========================================
     User Accessors
     ========================================== */
  getUser() {
    return this.#currentUser;
  }

  /**
   * Updates and persists current user's themePreference ('dark' | 'light') in localStorage.
   * @param {'dark'|'light'} theme
   */
  setThemePreference(theme) {
    if (!this.#currentUser) return;
    this.#currentUser.themePreference = theme;

    // Update record in devpulse_users array
    const users = this.#storageManager.getUsers();
    const index = users.findIndex(u => u.id === this.#currentUser.id);
    if (index !== -1) {
      users[index].themePreference = theme;
      this.#storageManager.saveUsers(users);
    }
  }

  /**
   * Updates current user profile fields (e.g. avatar) and persists in storage.
   * @param {Object} updates
   */
  updateUserProfile(updates) {
    if (!this.#currentUser || !this.#currentUser.id) return;
    this.#currentUser = { ...this.#currentUser, ...updates };
    this.#storageManager.updateUser(this.#currentUser.id, updates);
  }

  /**
   * Deletes the currently logged in user's account permanently.
   */
  deleteCurrentAccount() {
    if (!this.#currentUser || !this.#currentUser.id) return;
    this.#storageManager.deleteUserAccount(this.#currentUser.id);
    this.#currentUser = null;
  }

  /* ==========================================
     Task Management Methods
     ========================================== */
  getTasks() {
    return [...this.#tasks];
  }

  saveTasks(newTasks) {
    this.#tasks = [...newTasks];
    if (this.#currentUser && this.#currentUser.id) {
      this.#storageManager.set(`devpulse_tasks_${this.#currentUser.id}`, this.#tasks, 'local');
    }
    return this.#tasks;
  }

  addTask(task) {
    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: task.title,
      priority: task.priority || 'medium',
      column: task.column || 'todo',
      category: task.category || 'task',
      createdAt: new Date().toISOString()
    };
    this.#tasks.push(newTask);
    this.saveTasks(this.#tasks);
    return newTask;
  }

  updateTask(taskId, updates) {
    const index = this.#tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      this.#tasks[index] = { ...this.#tasks[index], ...updates };
      this.saveTasks(this.#tasks);
      return this.#tasks[index];
    }
    return null;
  }

  deleteTask(taskId) {
    this.#tasks = this.#tasks.filter(t => t.id !== taskId);
    this.saveTasks(this.#tasks);
  }

  /* ==========================================
     Snippet Vault Methods
     ========================================== */
  getSnippets() {
    return [...this.#snippets];
  }

  saveSnippets(newSnippets) {
    this.#snippets = [...newSnippets];
    if (this.#currentUser && this.#currentUser.id) {
      this.#storageManager.set(`devpulse_snippets_${this.#currentUser.id}`, this.#snippets, 'local');
    }
    return this.#snippets;
  }

  addSnippet(snippet) {
    const newSnippet = {
      id: 'snip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: snippet.title,
      language: snippet.language || 'js',
      code: snippet.code,
      createdAt: new Date().toISOString()
    };
    this.#snippets.unshift(newSnippet);
    this.saveSnippets(this.#snippets);
    return newSnippet;
  }

  deleteSnippet(snippetId) {
    this.#snippets = this.#snippets.filter(s => s.id !== snippetId);
    this.saveSnippets(this.#snippets);
  }

  /* ==========================================
     Health & Posture Reminder Settings
     ========================================== */
  getReminders() {
    return { ...this.#reminders };
  }

  saveReminders(settings) {
    this.#reminders = { ...this.#reminders, ...settings };
    if (this.#currentUser && this.#currentUser.id) {
      this.#storageManager.set(`devpulse_reminders_${this.#currentUser.id}`, this.#reminders, 'local');
    }
    return this.#reminders;
  }

  /* ==========================================
     Default Initial Seed Data
     ========================================== */
  #getDefaultTasks() {
    return [
      { id: 'task_demo_1', title: 'Refactor Authentication module to ES6', priority: 'high', column: 'done', category: 'chore', createdAt: new Date().toISOString() },
      { id: 'task_demo_2', title: 'Integrate Web Crypto API SHA-256 hashing', priority: 'high', column: 'done', category: 'feature', createdAt: new Date().toISOString() },
      { id: 'task_demo_3', title: 'Build Kanban task board with AI Organize', priority: 'medium', column: 'in-progress', category: 'feature', createdAt: new Date().toISOString() },
      { id: 'task_demo_4', title: 'Setup Gemini API Rubber Duck debugging', priority: 'medium', column: 'todo', category: 'feature', createdAt: new Date().toISOString() }
    ];
  }

  #getDefaultSnippets() {
    return [
      {
        id: 'snip_demo_1',
        title: 'Async SHA-256 Hash Helper',
        language: 'js',
        code: 'async function hashString(str) {\n  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));\n  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");\n}',
        createdAt: new Date().toISOString()
      },
      {
        id: 'snip_demo_2',
        title: 'Observer EventBus Setup',
        language: 'js',
        code: 'class EventBus {\n  #listeners = {};\n  subscribe(event, cb) { (this.#listeners[event] ||= []).push(cb); }\n  publish(event, data) { (this.#listeners[event] || []).forEach(cb => cb(data)); }\n}',
        createdAt: new Date().toISOString()
      }
    ];
  }
}
