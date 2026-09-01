/**
 * GithubService - Client Wrapper for GitHub Public REST API
 *
 * Responsibilities:
 * 1. Fetches user profile data from https://api.github.com/users/{username}.
 * 2. Normalizes response data for GitHub Stats Widget.
 * 3. Handles 404 (User Not Found), rate limits (403), and network errors gracefully.
 */
export class GithubService {
  #baseUrl;

  constructor() {
    this.#baseUrl = 'https://api.github.com/users';
  }

  /**
   * Fetches profile statistics for a given GitHub username.
   *
   * @param {string} username - Target GitHub username handle.
   * @returns {Promise<{ error: boolean, data?: Object, message?: string }>} Normalized result.
   */
  async fetchUserData(username) {
    if (!username || typeof username !== 'string' || !username.trim()) {
      return { error: true, message: 'No GitHub username provided.' };
    }

    const cleanUsername = username.trim();
    const endpoint = `${this.#baseUrl}/${encodeURIComponent(cleanUsername)}`;

    try {
      const response = await fetch(endpoint, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { error: true, message: `GitHub user "${cleanUsername}" not found.` };
        }
        if (response.status === 403) {
          return { error: true, message: 'GitHub API rate limit exceeded. Please try again later.' };
        }
        return { error: true, message: `GitHub API error (Status ${response.status}).` };
      }

      const user = await response.json();

      return {
        error: false,
        data: {
          username: user.login,
          name: user.name || user.login,
          avatarUrl: user.avatar_url,
          publicRepos: user.public_repos || 0,
          followers: user.followers || 0,
          following: user.following || 0,
          bio: user.bio || '',
          profileUrl: user.html_url
        }
      };
    } catch (err) {
      console.error('[GithubService] Fetch exception:', err);
      return { error: true, message: 'Network error connecting to GitHub API.' };
    }
  }
}
