import { AudioPlayerWidget } from './AudioPlayerWidget.js';

/**
 * PomodoroWidget - Circular SVG Timer & Focus Ambient Audio Player
 *
 * Responsibilities:
 * 1. Tracks 25-min Focus Sessions and 5-min Break cycles.
 * 2. Renders a smooth circular SVG progress ring updating on tick intervals.
 * 3. Uses private fields and closures to guarantee interval state integrity.
 * 4. Embeds AudioPlayerWidget controls (Rain, Cafe, Lo-Fi) and volume slider directly.
 * 5. Clears all interval handles in destroy() to prevent memory leaks.
 */
export class PomodoroWidget {
  // Private timer & audio state variables
  #container;
  #stateManager;
  #eventBus;
  #audioPlayer;

  #timerMode; // 'focus' | 'break'
  #isRunning;
  #remainingSeconds;
  #totalSeconds;
  #intervalId;

  // DOM node references
  #timeTextEl;
  #statusBadgeEl;
  #progressCircleEl;
  #startPauseBtn;
  #resetBtn;

  constructor(container, dependencies) {
    this.#container = container;
    this.#stateManager = dependencies.stateManager;
    this.#eventBus = dependencies.eventBus;
    this.#audioPlayer = new AudioPlayerWidget();

    this.#timerMode = 'focus';
    this.#isRunning = false;
    this.#totalSeconds = 25 * 60;
    this.#remainingSeconds = this.#totalSeconds;
    this.#intervalId = null;

    this.render();
  }

  /**
   * Renders widget HTML shell into container.
   */
  render() {
    this.#container.innerHTML = `
      <div class="widget-card pomodoro-card">
        <div class="widget-header">
          <div class="widget-title">
            <svg class="widget-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>Focus Timer</span>
          </div>
        </div>

        <div class="timer-display-container">
          <div class="timer-svg-wrapper">
            <svg class="timer-svg" viewBox="0 0 140 140">
              <circle class="timer-circle-bg" cx="70" cy="70" r="60"/>
              <circle class="timer-circle-progress" id="timerProgressCircle" cx="70" cy="70" r="60"/>
            </svg>
            <div class="timer-clock-text" id="timerClockText">25:00</div>
          </div>
          <span class="timer-status-badge focus" id="timerStatusBadge">Focus Session</span>
        </div>

        <div class="timer-controls">
          <button type="button" class="timer-btn-primary" id="timerStartPauseBtn">
            <svg class="play-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>Start Focus</span>
          </button>
          <button type="button" class="timer-btn-reset" id="timerResetBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            <span>Reset</span>
          </button>
        </div>

        <!-- Embedded Focus Ambient Audio Player Control Row -->
        <div class="embedded-audio-player">
          <div class="audio-track-toggles" style="display: flex; gap: 6px;">
            <button type="button" class="audio-track-btn" data-track="deep" title="Deep Focus (432Hz Binaural Flow)" style="flex: 1;">
              <span>🎧 Deep Focus</span>
            </button>
            <button type="button" class="audio-track-btn" data-track="rain" title="Cosy Rain Ambient" style="flex: 1;">
              <span>🌧️ Cosy Rain</span>
            </button>
            <button type="button" class="audio-track-btn" data-track="lofi" title="Lo-Fi Chill Beats" style="flex: 1;">
              <span>☕ Lo-Fi Beats</span>
            </button>
          </div>
          <div class="audio-volume-row">
            <span>Vol</span>
            <input type="range" class="audio-volume-slider" id="audioVolumeSlider" min="0" max="1" step="0.05" value="0.5">
          </div>
        </div>
      </div>
    `;

    // Cache DOM queries
    this.#timeTextEl = this.#container.querySelector('#timerClockText');
    this.#statusBadgeEl = this.#container.querySelector('#timerStatusBadge');
    this.#progressCircleEl = this.#container.querySelector('#timerProgressCircle');
    this.#startPauseBtn = this.#container.querySelector('#timerStartPauseBtn');
    this.#resetBtn = this.#container.querySelector('#timerResetBtn');

    this.#bindTimerEvents();
    this.#bindAudioEvents();
    this.#updateDisplay();
  }

  /**
   * Binds timer control button events.
   */
  #bindTimerEvents() {
    this.#startPauseBtn.addEventListener('click', () => {
      if (this.#isRunning) {
        this.pause();
      } else {
        this.start();
      }
    });

    this.#resetBtn.addEventListener('click', () => {
      this.reset();
    });
  }

  /**
   * Binds audio track buttons and volume slider events.
   */
  #bindAudioEvents() {
    const trackBtns = this.#container.querySelectorAll('.audio-track-btn');
    const volumeSlider = this.#container.querySelector('#audioVolumeSlider');

    trackBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const track = btn.getAttribute('data-track');
        const isActive = btn.classList.contains('active');

        trackBtns.forEach(b => b.classList.remove('active'));

        if (isActive) {
          this.#audioPlayer.stop();
        } else {
          btn.classList.add('active');
          this.#audioPlayer.playTrack(track);
        }
      });
    });

    if (volumeSlider) {
      volumeSlider.addEventListener('input', () => {
        this.#audioPlayer.setVolume(parseFloat(volumeSlider.value));
      });
    }
  }

  /**
   * Starts or resumes countdown timer.
   */
  start() {
    if (this.#isRunning) return;
    this.#isRunning = true;
    this.#startPauseBtn.textContent = 'Pause';

    this.#intervalId = setInterval(() => {
      this.#tick();
    }, 1000);

    if (this.#eventBus) {
      this.#eventBus.publish('timer:start', { mode: this.#timerMode });
    }
  }

  /**
   * Pauses timer.
   */
  pause() {
    if (!this.#isRunning) return;
    this.#isRunning = false;
    this.#startPauseBtn.textContent = 'Start';
    if (this.#intervalId !== null) {
      clearInterval(this.#intervalId);
      this.#intervalId = null;
    }
  }

  /**
   * Resets timer to start of current mode.
   */
  reset() {
    this.pause();
    this.#totalSeconds = this.#timerMode === 'focus' ? 25 * 60 : 5 * 60;
    this.#remainingSeconds = this.#totalSeconds;
    this.#updateDisplay();
  }

  /**
   * Timer tick execution.
   */
  #tick() {
    if (this.#remainingSeconds > 0) {
      this.#remainingSeconds--;
      this.#updateDisplay();
    } else {
      this.#onTimerComplete();
    }
  }

  /**
   * Handles timer session completion.
   */
  #onTimerComplete() {
    this.pause();

    // Auto-switch between Focus (25m) and Break (5m)
    if (this.#timerMode === 'focus') {
      this.#timerMode = 'break';
      this.#totalSeconds = 5 * 60;
    } else {
      this.#timerMode = 'focus';
      this.#totalSeconds = 25 * 60;
    }

    this.#remainingSeconds = this.#totalSeconds;
    this.#updateDisplay();

    if (this.#eventBus) {
      this.#eventBus.publish('timer:completed', { completedMode: this.#timerMode === 'break' ? 'focus' : 'break' });
    }
  }

  /**
   * Updates clock text and SVG progress ring offset.
   */
  #updateDisplay() {
    const minutes = Math.floor(this.#remainingSeconds / 60);
    const seconds = this.#remainingSeconds % 60;
    const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (this.#timeTextEl) {
      this.#timeTextEl.textContent = formatted;
    }

    // Update SVG stroke-dashoffset (circumference = 377)
    if (this.#progressCircleEl) {
      const progressFraction = this.#remainingSeconds / this.#totalSeconds;
      const offset = 377 * (1 - progressFraction);
      this.#progressCircleEl.style.strokeDashoffset = offset.toString();
    }

    if (this.#statusBadgeEl) {
      if (this.#timerMode === 'focus') {
        this.#statusBadgeEl.textContent = 'Focus Session';
        this.#statusBadgeEl.className = 'timer-status-badge focus';
      } else {
        this.#statusBadgeEl.textContent = 'Break';
        this.#statusBadgeEl.className = 'timer-status-badge break';
      }
    }

    if (this.#startPauseBtn) {
      if (this.#isRunning) {
        this.#startPauseBtn.classList.add('running');
        this.#startPauseBtn.innerHTML = `
          <svg class="pause-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
          <span>Pause Focus</span>
        `;
      } else {
        this.#startPauseBtn.classList.remove('running');
        this.#startPauseBtn.innerHTML = `
          <svg class="play-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          <span>Start Focus</span>
        `;
      }
    }
  }

  /**
   * Teardown method clearing intervals and audio handles to prevent memory leaks.
   */
  destroy() {
    this.pause();
    if (this.#audioPlayer) {
      this.#audioPlayer.destroy();
    }
  }
}
