/**
 * GithubStatsWidget - Live GitHub Profile & Repositories Statistics Card
 *
 * Responsibilities:
 * 1. Fetches live profile statistics via GithubService using user's saved githubUsername.
 * 2. Displays pulsing skeleton loading state while fetch is in-flight.
 * 3. Shows informative empty state if githubUsername was skipped during onboarding.
 * 4. Displays inline error messages if username is invalid (404) or rate limit is reached.
 */
export class GithubStatsWidget {
  #container;
  #stateManager;
  #githubService;

  constructor(container, dependencies) {
    this.#container = container;
    this.#stateManager = dependencies.stateManager;
    this.#githubService = dependencies.services?.githubService;

    this.render();
  }

  /**
   * Primary render execution.
   */
  async render() {
    this.#container.innerHTML = `
      <div class="widget-card github-stats-card">
        <div class="widget-header">
          <div class="widget-title">
            <svg class="widget-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span>GitHub Stats</span>
          </div>
        </div>

        <div id="githubBodyContent">
          <!-- Skeleton Loader Default -->
          <div class="github-profile-row">
            <div class="skeleton-box" style="width: 44px; height: 44px; border-radius: 50%;"></div>
            <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
              <div class="skeleton-box" style="height: 14px; width: 60%;"></div>
              <div class="skeleton-box" style="height: 10px; width: 40%;"></div>
            </div>
          </div>
          <div class="github-stats-grid">
            <div class="skeleton-box" style="height: 48px;"></div>
            <div class="skeleton-box" style="height: 48px;"></div>
            <div class="skeleton-box" style="height: 48px;"></div>
          </div>
        </div>
      </div>
    `;

    const user = this.#stateManager.getUser();
    const username = user?.githubUsername;

    const bodyContainer = this.#container.querySelector('#githubBodyContent');
    if (!bodyContainer) return;

    // Check empty state
    if (!username) {
      bodyContainer.innerHTML = `
        <div style="text-align: center; padding: 12px 0; color: var(--text-secondary); font-size: 13px;">
          <p style="margin-bottom: 10px;">Add your GitHub username in Settings to view live stats.</p>
          <button type="button" class="widget-action-btn" id="openSettingsLink" style="margin: 0 auto;">Open Settings</button>
        </div>
      `;
      const settingsBtn = bodyContainer.querySelector('#openSettingsLink');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
          const popover = document.getElementById('settingsPopover');
          if (popover) popover.classList.toggle('visible');
        });
      }
      return;
    }

    // Fetch data via GithubService
    if (!this.#githubService) return;

    const result = await this.#githubService.fetchUserData(username);

    if (result.error) {
      bodyContainer.innerHTML = `
        <div style="color: var(--error); font-size: 13px; padding: 12px 0; text-align: center;">
          <p>${this.#escapeHtml(result.message)}</p>
        </div>
      `;
      return;
    }

    // Render populated profile stats
    const d = result.data;
    bodyContainer.innerHTML = `
      <div class="github-profile-row">
        <img class="github-avatar" src="${d.avatarUrl}" alt="${this.#escapeHtml(d.name)}">
        <div class="github-user-info">
          <a href="${d.profileUrl}" target="_blank" rel="noopener noreferrer" class="github-display-name" style="text-decoration: none;">${this.#escapeHtml(d.name)}</a>
          <span class="github-username-handle">@${this.#escapeHtml(d.username)}</span>
        </div>
      </div>

      <div class="github-stats-grid">
        <div class="stat-box">
          <span class="stat-number">${d.publicRepos}</span>
          <span class="stat-label">Repos</span>
        </div>
        <div class="stat-box">
          <span class="stat-number">${d.followers}</span>
          <span class="stat-label">Followers</span>
        </div>
        <div class="stat-box">
          <span class="stat-number">${d.following}</span>
          <span class="stat-label">Following</span>
        </div>
      </div>
    `;
  }

  #escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  destroy() {}
}
