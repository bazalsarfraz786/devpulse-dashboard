/**
 * NotificationService - Browser Web Notifications API & Reminder Scheduler
 *
 * Responsibilities:
 * 1. Wraps browser Web Notifications API (`Notification.requestPermission()`).
 * 2. Manages posture and health reminder timers using closures to track interval handles.
 * 3. Safely clears timers when reminders are disabled to prevent background memory leaks.
 */
export class NotificationService {
  #reminderIntervalId;

  constructor() {
    this.#reminderIntervalId = null;
  }

  /**
   * Checks if Notification permission is currently granted.
   * @returns {boolean}
   */
  hasPermission() {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  /**
   * Requests browser notification permission from the user.
   * @returns {Promise<boolean>} True if permission was granted.
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('[NotificationService] Web Notifications API is not supported in this browser.');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.error('[NotificationService] Error requesting notification permission:', err);
      return false;
    }
  }

  /**
   * Triggers an immediate browser notification popup.
   * @param {string} title
   * @param {string} message
   */
  sendNotification(title, message) {
    if (!this.hasPermission()) {
      console.warn('[NotificationService] Cannot send notification: permission not granted.');
      return;
    }

    try {
      new Notification(title, {
        body: message,
        icon: '/assets/icons/favicon.png'
      });
    } catch (err) {
      console.error('[NotificationService] Error creating Notification instance:', err);
    }
  }

  /**
   * Schedules a recurring posture / health reminder timer.
   * Uses closure variables to safely store interval handles for teardown.
   *
   * @param {number} intervalMinutes - Frequency in minutes (30, 60, 90).
   * @param {string} message - Notification text content.
   * @param {Function} [onTrigger] - Optional callback triggered on interval.
   */
  scheduleReminder(intervalMinutes, message, onTrigger) {
    // Teardown any pre-existing timer handle first
    this.stopReminder();

    if (!intervalMinutes || intervalMinutes <= 0) return;

    const intervalMs = intervalMinutes * 60 * 1000;

    this.#reminderIntervalId = setInterval(() => {
      if (this.hasPermission()) {
        this.sendNotification('DevPulse Health Reminder', message);
      }
      if (typeof onTrigger === 'function') {
        onTrigger(message);
      }
    }, intervalMs);

    console.log(`[NotificationService] Health reminder scheduled every ${intervalMinutes} minutes.`);
  }

  /**
   * Clears existing posture reminder interval timer.
   */
  stopReminder() {
    if (this.#reminderIntervalId !== null) {
      clearInterval(this.#reminderIntervalId);
      this.#reminderIntervalId = null;
      console.log('[NotificationService] Active health reminder timer stopped.');
    }
  }
}
