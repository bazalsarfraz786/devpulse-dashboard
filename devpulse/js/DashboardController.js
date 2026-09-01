import { StorageManager } from './core/StorageManager.js';
import { StateManager } from './core/StateManager.js';
import { EventBus } from './core/EventBus.js';
import { WidgetFactory } from './core/WidgetFactory.js';

import { GeminiService } from './services/GeminiService.js';
import { GithubService } from './services/GithubService.js';
import { NewsService } from './services/NewsService.js';
import { NotificationService } from './services/NotificationService.js';

/**
 * DashboardController - Top Level Dashboard Controller
 *
 * Responsibilities:
 * 1. Enforces authentication session policies on load.
 * 2. Initializes Singleton StateManager and Pub-Sub EventBus.
 * 3. Handles theme preference loading & real-time Dark/Light theme switching.
 * 4. Connects sidebar navigation scroll-to-section & active highlighting.
 * 5. Builds top header (greeting, date, live clock) and sidebar profile details.
 * 6. Dynamically instantiates all 6 widgets via WidgetFactory.
 * 7. Manages Settings popover & posture/health reminder timers via NotificationService.
 */
export class DashboardController {
  #storageManager;
  #stateManager;
  #eventBus;
  #services;
  #widgets;
  #clockIntervalId;

  constructor() {
    this.#storageManager = new StorageManager();
    this.#stateManager = StateManager.getInstance();
    this.#eventBus = new EventBus();
    this.#widgets = [];
    this.#clockIntervalId = null;

    this.init();
  }

  /**
   * Initializes application state and view setup.
   */
  async init() {
    // 1. Session verification check
    const session = this.#storageManager.getSession();
    if (!session || !session.userId) {
      console.warn('[DashboardController] No active session found. Redirecting to auth.html...');
      window.location.href = 'auth.html';
      return;
    }

    // 2. Load user record
    const users = this.#storageManager.getUsers();
    const user = users.find(u => u.id === session.userId) || {
      id: session.userId,
      fullName: session.fullName || 'Developer',
      email: session.email
    };

    // 3. Initialize StateManager with user data
    this.#stateManager.initialize(user);

    // 4. Initialize Theme (BUG 3 Fix)
    this.#setupTheme(user);

    // 5. Instantiate Service instances
    this.#services = {
      geminiService: new GeminiService(),
      githubService: new GithubService(),
      newsService: new NewsService(),
      notificationService: new NotificationService()
    };

    // 6. Initialize UI header, sidebar, and navigation
    this.#setupHeader(user);
    this.#setupSidebar(user);
    this.#setupNavigation();
    this.#setupSettingsPopover();
    this.#setupWidgetVisibilityToggles();
    this.#setupCheatSheetsModal();
    this.#setupSprintStopwatch();

    // 7. Build Widgets Layout via WidgetFactory
    this.#initializeWidgets();

    // 8. Restore active posture/health reminders if enabled
    this.#restoreReminders();
  }

  /**
   * BUG 3 FIX: Theme setup & Sun/Moon toggle handler.
   */
  #setupTheme(user) {
    const rawPref = user.themePreference || 'dark';
    const isLight = rawPref.toLowerCase().includes('light');
    const initialTheme = isLight ? 'light' : 'dark';

    const applyTheme = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
      if (theme === 'light') {
        document.documentElement.classList.add('light-theme');
        document.body.classList.add('light-theme');
        document.documentElement.classList.remove('dark-theme');
        document.body.classList.remove('dark-theme');
      } else {
        document.documentElement.classList.add('dark-theme');
        document.body.classList.add('dark-theme');
        document.documentElement.classList.remove('light-theme');
        document.body.classList.remove('light-theme');
      }
    };

    applyTheme(initialTheme);

    const themeBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeToggleIcon');
    const themeText = document.getElementById('themeToggleText');

    const headerThemeBtn = document.getElementById('headerThemeToggleBtn');
    const headerThemeIcon = document.getElementById('headerThemeToggleIcon');

    const updateButtonUI = (theme) => {
      if (themeIcon) themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
      if (themeText) themeText.textContent = theme === 'light' ? 'Dark Mode' : 'Light Mode';
      if (headerThemeIcon) headerThemeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
    };

    updateButtonUI(initialTheme);

    const toggleTheme = (e) => {
      if (e) e.preventDefault();
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';

      applyTheme(newTheme);
      updateButtonUI(newTheme);
      this.#stateManager.setThemePreference(newTheme);
    };

    if (themeBtn) themeBtn.onclick = toggleTheme;
    if (headerThemeBtn) headerThemeBtn.onclick = toggleTheme;
  }

  /**
   * Navigation view filtering & section focus handling.
   */
  #setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    const kanbanBox = document.getElementById('kanbanWidgetContainer');
    const pomodoroBox = document.getElementById('pomodoroWidgetContainer');
    const aiBox = document.getElementById('aiAssistantWidgetContainer');

    const snippetsBox = document.getElementById('snippetsWidgetContainer');

    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();

        // Active selection styling toggle
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        const action = item.getAttribute('data-action');

        if (action === 'settings') {
          const popover = document.getElementById('settingsPopover');
          if (popover) popover.classList.toggle('visible');
          return;
        }

        if (action === 'cheatsheets') {
          const cheatModal = document.getElementById('cheatSheetsModal');
          if (cheatModal) cheatModal.classList.toggle('visible');
        } else if (action === 'stopwatch') {
          const widget = document.getElementById('sidebarStopwatchWidget');
          if (widget) {
            const isHidden = widget.style.display === 'none';
            widget.style.display = isHidden ? 'block' : 'none';
            if (isHidden) this.#startStopwatchTimer();
          }
        } else if (action === 'profile') {
          const profileModal = document.getElementById('profileModal');
          if (profileModal) profileModal.classList.toggle('visible');
        }
      });
    });
  }

  /**
   * Sets up Developer Cheat Sheets Modal tab switches & copy handler.
   */
  #setupCheatSheetsModal() {
    const modal = document.getElementById('cheatSheetsModal');
    const closeBtn = document.getElementById('closeCheatModalBtn');
    const refreshBtn = document.getElementById('refreshCheatSheetsBtn');
    if (!modal) return;

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('visible');
      });
    }

    // Tab switching
    const tabs = modal.querySelectorAll('.cheat-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-tab');

        tabs.forEach(t => {
          t.classList.remove('active');
          t.style.background = 'var(--bg)';
          t.style.color = 'var(--text-secondary)';
        });
        tab.classList.add('active');
        tab.style.background = 'var(--surface-hover)';
        tab.style.color = 'var(--accent)';

        const panels = modal.querySelectorAll('.cheat-panel');
        panels.forEach(p => p.style.display = 'none');

        const activePanel = modal.querySelector(`#cheatPanel${target.charAt(0).toUpperCase() + target.slice(1)}`);
        if (activePanel) activePanel.style.display = 'flex';
      });
    });

    // Copy command buttons
    const bindCopyCmds = () => {
      modal.querySelectorAll('.copy-cmd-btn').forEach(btn => {
        btn.onclick = () => {
          const cmd = btn.getAttribute('data-cmd');
          if (cmd) {
            navigator.clipboard.writeText(cmd).then(() => {
              const orig = btn.textContent;
              btn.textContent = 'Copied!';
              setTimeout(() => btn.textContent = orig, 1500);
            });
          }
        };
      });
    };
    bindCopyCmds();

    // Refresh Dataset Pools
    const gitPool = [
      [
        { title: "Stash Uncommitted", cmd: 'git stash push -m "wip"' },
        { title: "Interactive Rebase", cmd: 'git rebase -i HEAD~3' },
        { title: "Soft Undo Commit", cmd: 'git reset --soft HEAD~1' },
        { title: "Cherry Pick", cmd: 'git cherry-pick <commit-hash>' }
      ],
      [
        { title: "Amend Commit Message", cmd: 'git commit --amend -m "new msg"' },
        { title: "View Reflog History", cmd: 'git reflog' },
        { title: "Clean Untracked Files", cmd: 'git clean -fd' },
        { title: "Stash List", cmd: 'git stash list' }
      ],
      [
        { title: "Detailed Graph Log", cmd: 'git log --oneline --graph --all' },
        { title: "Discard File Changes", cmd: 'git checkout -- <file>' },
        { title: "Create & Switch Branch", cmd: 'git checkout -b feature/new-ui' },
        { title: "Show Staged Diff", cmd: 'git diff --staged' }
      ]
    ];

    const regexPool = [
      [
        { title: "Email Regex", cmd: '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/' },
        { title: "URL Regex", cmd: '/https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}/' }
      ],
      [
        { title: "Phone Number", cmd: '/^\\+?[1-9]\\d{1,14}$/' },
        { title: "Hex Color", cmd: '/^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/' }
      ],
      [
        { title: "Password (8+ char, 1 num)", cmd: '/^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$/' },
        { title: "Slug Pattern", cmd: '/^[a-z0-9]+(?:-[a-z0-9]+)*$/' }
      ]
    ];

    const cssPool = [
      [
        "display: flex; align-items: center; justify-content: center;",
        "display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));",
        "backdrop-filter: blur(16px); background: rgba(15, 23, 42, 0.75);"
      ],
      [
        "font-size: clamp(1rem, 2.5vw, 2.5rem);",
        "aspect-ratio: 16 / 9; object-fit: cover;",
        "box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);"
      ],
      [
        "scroll-behavior: smooth; font-smoothing: antialiased;",
        "overflow: hidden; text-overflow: ellipsis; white-space: nowrap;",
        "user-select: none; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);"
      ]
    ];

    let currentSetIdx = 0;

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        currentSetIdx = (currentSetIdx + 1) % 3;

        // Render Git
        const gitPanel = document.getElementById('cheatPanelGit');
        if (gitPanel) {
          gitPanel.innerHTML = gitPool[currentSetIdx].map(item => `
            <div class="cheat-code-card" style="display: flex; justify-content: space-between; align-items: center; background: var(--bg); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border);">
              <div><strong style="font-size: 11px; color: var(--accent);">${item.title}:</strong> <code style="font-size: 11px;">${item.cmd}</code></div>
              <button type="button" class="copy-cmd-btn" data-cmd="${item.cmd.replace(/"/g, '&quot;')}" style="font-size: 10px; padding: 2px 6px; background: rgba(255,255,255,0.1); border: 1px solid var(--border); color: var(--text-primary); border-radius: 4px; cursor: pointer;">Copy</button>
            </div>
          `).join('');
        }

        // Render Regex
        const regexPanel = document.getElementById('cheatPanelRegex');
        if (regexPanel) {
          regexPanel.innerHTML = regexPool[currentSetIdx].map(item => `
            <div class="cheat-code-card" style="display: flex; justify-content: space-between; align-items: center; background: var(--bg); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--border);">
              <div><strong style="font-size: 11px; color: var(--accent);">${item.title}:</strong> <code style="font-size: 10px;">${item.cmd}</code></div>
              <button type="button" class="copy-cmd-btn" data-cmd="${item.cmd.replace(/"/g, '&quot;')}" style="font-size: 10px; padding: 2px 6px; background: rgba(255,255,255,0.1); border: 1px solid var(--border); color: var(--text-primary); border-radius: 4px; cursor: pointer;">Copy</button>
            </div>
          `).join('');
        }

        // Render CSS
        const cssPanel = document.getElementById('cheatPanelCss');
        if (cssPanel) {
          cssPanel.innerHTML = cssPool[currentSetIdx].map(snippet => `
            <div style="font-size: 11px; padding: 6px; background: var(--bg); border-radius: 6px;"><code>${snippet}</code></div>
          `).join('');
        }

        bindCopyCmds();
      });
    }
  }

  /**
   * Live Sprint Session Stopwatch logic.
   */
  #stopwatchSeconds = 0;
  #stopwatchIntervalId = null;
  #stopwatchRunning = false;

  #setupSprintStopwatch() {
    const toggleBtn = document.getElementById('stopwatchToggleBtn');
    const resetBtn = document.getElementById('stopwatchResetBtn');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (this.#stopwatchRunning) {
          this.#pauseStopwatchTimer();
          toggleBtn.textContent = 'Resume';
        } else {
          this.#startStopwatchTimer();
          toggleBtn.textContent = 'Pause';
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.#pauseStopwatchTimer();
        this.#stopwatchSeconds = 0;
        this.#updateStopwatchDisplay();
        if (toggleBtn) toggleBtn.textContent = 'Start';
      });
    }
  }

  #startStopwatchTimer() {
    if (this.#stopwatchRunning) return;
    this.#stopwatchRunning = true;
    this.#stopwatchIntervalId = setInterval(() => {
      this.#stopwatchSeconds++;
      this.#updateStopwatchDisplay();
    }, 1000);
  }

  #pauseStopwatchTimer() {
    this.#stopwatchRunning = false;
    if (this.#stopwatchIntervalId) {
      clearInterval(this.#stopwatchIntervalId);
      this.#stopwatchIntervalId = null;
    }
  }

  #updateStopwatchDisplay() {
    const displayEl = document.getElementById('sidebarStopwatchTime');
    if (!displayEl) return;
    const h = String(Math.floor(this.#stopwatchSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((this.#stopwatchSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(this.#stopwatchSeconds % 60).padStart(2, '0');
    displayEl.textContent = `${h}:${m}:${s}`;
  }

  /**
   * Setup checkbox toggles in Settings Popover for individual widget show/hide preference.
   */
  #setupWidgetVisibilityToggles() {
    const toggles = {
      kanban: document.getElementById('toggleWidgetTasks'),
      pomodoro: document.getElementById('toggleWidgetPomodoro'),
      github: document.getElementById('toggleWidgetGithub'),
      ai: document.getElementById('toggleWidgetAi')
    };

    const savedVisibility = JSON.parse(localStorage.getItem('devpulse_widget_visibility') || '{}');

    Object.keys(toggles).forEach(key => {
      const el = toggles[key];
      if (!el) return;

      el.checked = savedVisibility[key] !== false;

      el.addEventListener('change', () => {
        const state = {};
        Object.keys(toggles).forEach(k => {
          if (toggles[k]) state[k] = toggles[k].checked;
        });
        localStorage.setItem('devpulse_widget_visibility', JSON.stringify(state));
        this.#applyWidgetVisibilityOverrides();
      });
    });

    this.#applyWidgetVisibilityOverrides();
  }

  #applyWidgetVisibilityOverrides() {
    const savedVisibility = JSON.parse(localStorage.getItem('devpulse_widget_visibility') || '{}');

    const map = {
      kanban: document.getElementById('kanbanWidgetContainer'),
      pomodoro: document.getElementById('pomodoroWidgetContainer'),
      github: document.getElementById('githubWidgetContainer'),
      ai: document.getElementById('aiAssistantWidgetContainer')
    };

    Object.keys(map).forEach(key => {
      const container = map[key];
      if (!container) return;
      if (savedVisibility[key] === false) {
        container.style.display = 'none';
      } else if (container.style.display === 'none' && savedVisibility[key] === true) {
        container.style.display = '';
      }
    });
  }

  /**
   * Initializes Top Header bar greeting, date, and live digital clock.
   */
  #setupHeader(user) {
    const greetingEl = document.getElementById('headerGreetingText');
    const dateEl = document.getElementById('headerGreetingDate');
    const clockEl = document.getElementById('liveClockText');
    const bellBtn = document.getElementById('settingsBellBtn');

    const firstName = user.fullName ? user.fullName.split(' ')[0] : 'Developer';
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';

    if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon';
    } else if (hour >= 17) {
      timeGreeting = 'Good evening';
    }

    if (greetingEl) {
      greetingEl.textContent = `${timeGreeting}, ${firstName}`;
    }

    if (dateEl) {
      const now = new Date();
      dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }

    // Update live digital clock (JetBrains Mono)
    const updateClock = () => {
      if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    };
    updateClock();
    this.#clockIntervalId = setInterval(updateClock, 1000);

    // Bell button toggles Settings popover
    if (bellBtn) {
      bellBtn.addEventListener('click', () => {
        const popover = document.getElementById('settingsPopover');
        if (popover) {
          popover.classList.toggle('visible');
        }
      });
    }
  }

  /**
   * Initializes Sidebar profile badge and logout button.
   */
  #setupSidebar(user) {
    const avatarEl = document.getElementById('userAvatarInitials');
    const nameEl = document.getElementById('sidebarUserName');
    const roleEl = document.getElementById('sidebarUserRole');
    const logoutBtn = document.getElementById('logoutBtn');

    if (avatarEl) {
      const initials = user.fullName
        ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : 'DP';
      avatarEl.textContent = initials;
    }

    if (nameEl) {
      nameEl.textContent = user.fullName || 'Developer';
    }

    if (roleEl) {
      roleEl.textContent = user.primaryFocus ? `${user.primaryFocus} Developer` : 'Fullstack Developer';
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        this.#storageManager.clearSession();
        window.location.href = 'auth.html';
      });
    }

    // Profile Modal & Avatar / Account Management
    const profileBadge = document.querySelector('.user-profile-badge');
    const profileModal = document.getElementById('profileModal');
    const closeProfileModalBtn = document.getElementById('closeProfileModalBtn');
    const imageInput = document.getElementById('profileImageInput');
    const removeAvatarBtn = document.getElementById('removeAvatarBtn');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');

    const updateAvatarDisplay = () => {
      const currentUser = this.#stateManager.getUser();
      const initials = currentUser?.fullName
        ? currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : 'DP';

      // Sidebar avatar
      if (avatarEl) {
        if (currentUser?.avatar) {
          avatarEl.innerHTML = `<img src="${currentUser.avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
          avatarEl.textContent = initials;
        }
      }

      // Header avatar (Mobile Profile Btn)
      const headerInitials = document.getElementById('headerUserAvatarInitials');
      const headerImg = document.getElementById('headerUserAvatarImg');
      if (headerImg && headerInitials) {
        if (currentUser?.avatar) {
          headerImg.src = currentUser.avatar;
          headerImg.style.display = 'block';
          headerInitials.style.display = 'none';
        } else {
          headerImg.style.display = 'none';
          headerInitials.style.display = 'block';
          headerInitials.textContent = initials;
        }
      }

      // Modal avatar
      const modalInitials = document.getElementById('modalUserAvatarInitials');
      const modalImg = document.getElementById('modalUserAvatarImg');
      const modalName = document.getElementById('modalUserName');
      const modalEmail = document.getElementById('modalUserEmail');

      if (modalName) modalName.textContent = currentUser?.fullName || 'Developer';
      if (modalEmail) modalEmail.textContent = currentUser?.email || 'user@devpulse.com';

      if (modalImg && modalInitials) {
        if (currentUser?.avatar) {
          modalImg.src = currentUser.avatar;
          modalImg.style.display = 'block';
          modalInitials.style.display = 'none';
        } else {
          modalImg.style.display = 'none';
          modalInitials.style.display = 'block';
          modalInitials.textContent = initials;
        }
      }
    };

    updateAvatarDisplay();

    // Open profile modal on clicking user profile badge
    if (profileBadge && profileModal) {
      profileBadge.style.cursor = 'pointer';
      profileBadge.addEventListener('click', () => {
        updateAvatarDisplay();
        profileModal.classList.toggle('visible');
      });
    }

    // Open profile modal on clicking mobile header profile button
    const headerProfileBtn = document.getElementById('headerProfileBtn');
    if (headerProfileBtn && profileModal) {
      headerProfileBtn.addEventListener('click', () => {
        updateAvatarDisplay();
        profileModal.classList.toggle('visible');
      });
    }

    if (closeProfileModalBtn && profileModal) {
      closeProfileModalBtn.addEventListener('click', () => {
        profileModal.classList.remove('visible');
      });
    }

    // Profile photo upload handler (Base64 conversion & persistence)
    if (imageInput) {
      imageInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
          alert('Please select an image file under 2MB.');
          return;
        }

        const reader = new FileReader();
        reader.onload = (evt) => {
          const base64Url = evt.target.result;
          this.#stateManager.updateUserProfile({ avatar: base64Url });
          updateAvatarDisplay();
        };
        reader.readAsDataURL(file);
      });
    }

    // Remove photo handler
    if (removeAvatarBtn) {
      removeAvatarBtn.addEventListener('click', () => {
        this.#stateManager.updateUserProfile({ avatar: null });
        updateAvatarDisplay();
      });
    }

    // Delete account handler
    if (deleteAccountBtn) {
      deleteAccountBtn.addEventListener('click', () => {
        const currentUser = this.#stateManager.getUser();
        const confirmMessage = `Are you sure you want to permanently delete your DevPulse account (${currentUser?.email || 'this user'})?\n\nThis will remove all your saved tasks, code snippets, and settings from local storage. This action cannot be undone.`;

        if (confirm(confirmMessage)) {
          this.#stateManager.deleteCurrentAccount();
          alert('Account successfully deleted.');
          window.location.href = 'auth.html';
        }
      });
    }
  }

  /**
   * Builds dashboard widgets layout using Factory pattern.
   */
  #initializeWidgets() {
    const dependencies = {
      stateManager: this.#stateManager,
      eventBus: this.#eventBus,
      services: this.#services
    };

    const widgetConfigs = [
      { type: 'pomodoro', containerId: 'pomodoroWidgetContainer' },
      { type: 'kanban', containerId: 'kanbanWidgetContainer' },
      { type: 'github', containerId: 'githubWidgetContainer' },
      { type: 'snippets', containerId: 'snippetsWidgetContainer' },
      { type: 'ai_assistant', containerId: 'aiAssistantWidgetContainer' }
    ];

    widgetConfigs.forEach(cfg => {
      const containerNode = document.getElementById(cfg.containerId);
      if (containerNode) {
        const instance = WidgetFactory.create(cfg.type, containerNode, dependencies);
        if (instance) {
          this.#widgets.push(instance);
        }
      }
    });
  }

  /**
   * Sets up Settings Popover and Health Reminders.
   */
  #setupSettingsPopover() {
    const popover = document.getElementById('settingsPopover');
    const closeBtn = document.getElementById('closeSettingsBtn');
    const toggleSwitch = document.getElementById('reminderToggle');
    const intervalSelect = document.getElementById('reminderIntervalSelect');
    const messageInput = document.getElementById('reminderMessageInput');
    const saveBtn = document.getElementById('saveSettingsBtn');

    if (!popover) return;

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        popover.classList.remove('visible');
      });
    }

    const currentReminders = this.#stateManager.getReminders();
    if (toggleSwitch) toggleSwitch.checked = !!currentReminders.enabled;
    if (intervalSelect) intervalSelect.value = String(currentReminders.intervalMinutes || 60);
    if (messageInput) messageInput.value = currentReminders.message || 'Time to stretch and drink some water!';

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const enabled = toggleSwitch.checked;
        const intervalMinutes = parseInt(intervalSelect.value, 10);
        const message = messageInput.value.trim() || 'Time to stretch and drink some water!';

        if (enabled) {
          const granted = await this.#services.notificationService.requestPermission();
          if (!granted) {
            alert('Please allow browser notifications to enable posture and health reminders.');
            toggleSwitch.checked = false;
            return;
          }
          this.#services.notificationService.scheduleReminder(intervalMinutes, message);
        } else {
          this.#services.notificationService.stopReminder();
        }

        this.#stateManager.saveReminders({ enabled, intervalMinutes, message });
        popover.classList.remove('visible');
      });
    }
  }

  /**
   * Restores active posture reminders if enabled in stored settings.
   */
  #restoreReminders() {
    const reminders = this.#stateManager.getReminders();
    if (reminders.enabled && this.#services.notificationService) {
      this.#services.notificationService.scheduleReminder(
        reminders.intervalMinutes || 60,
        reminders.message || 'Time to stretch and drink some water!'
      );
    }
  }

  destroy() {
    if (this.#clockIntervalId !== null) {
      clearInterval(this.#clockIntervalId);
    }
    this.#widgets.forEach(w => {
      if (typeof w.destroy === 'function') w.destroy();
    });
  }
}
