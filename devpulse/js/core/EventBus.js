/**
 * EventBus - Observer / Pub-Sub Pattern Implementation
 *
 * DESIGN PATTERN RATIONALE:
 * The Observer (Publish-Subscribe) pattern decouples components by allowing them to communicate
 * through event channels without maintaining direct references to one another.
 * For instance, when a new task is created in the Kanban board or Pomodoro timer completes a session,
 * publishing an event ('task:added', 'timer:completed') alerts interested listeners (e.g. StateManager,
 * NotificationService, sound player) without coupling the widgets together.
 */
export class EventBus {
  // Private Map storing event names mapped to arrays of callback functions
  #listeners;

  constructor() {
    this.#listeners = new Map();
  }

  /**
   * Registers a subscriber callback for a specific event channel.
   * @param {string} eventName - Target event channel name.
   * @param {Function} callback - Function executed when event is published.
   * @returns {Function} Unsubscribe function handle for easy cleanup.
   */
  subscribe(eventName, callback) {
    if (typeof callback !== 'function') {
      console.warn(`[EventBus] Subscriber callback for "${eventName}" must be a function.`);
      return () => {};
    }

    if (!this.#listeners.has(eventName)) {
      this.#listeners.set(eventName, []);
    }

    this.#listeners.get(eventName).push(callback);

    // Return unsubscribe function handle
    return () => this.unsubscribe(eventName, callback);
  }

  /**
   * Removes a registered callback from an event channel.
   * @param {string} eventName - Target event channel name.
   * @param {Function} callback - Specific callback reference to remove.
   */
  unsubscribe(eventName, callback) {
    if (!this.#listeners.has(eventName)) return;

    const callbacks = this.#listeners.get(eventName).filter(cb => cb !== callback);
    if (callbacks.length === 0) {
      this.#listeners.delete(eventName);
    } else {
      this.#listeners.set(eventName, callbacks);
    }
  }

  /**
   * Broadcasts an event payload to all active channel subscribers.
   * @param {string} eventName - Target event channel name.
   * @param {any} [data] - Event payload data.
   */
  publish(eventName, data) {
    if (!this.#listeners.has(eventName)) return;

    const callbacks = this.#listeners.get(eventName);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`[EventBus] Error executing subscriber for "${eventName}":`, err);
      }
    });
  }

  /**
   * Clears all registered event channel subscribers.
   */
  clear() {
    this.#listeners.clear();
  }
}
