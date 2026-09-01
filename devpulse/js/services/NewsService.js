/**
 * NewsService - Client Wrapper for Dev.to Public REST API
 *
 * Responsibilities:
 * 1. Fetches tech articles from https://dev.to/api/articles.
 * 2. Supports tag filtering ('javascript', 'react', 'ai', 'css', etc.) and page pagination.
 * 3. Formats articles payload for TechNewsWidget lazy-load infinite scroll.
 */
export class NewsService {
  #baseUrl;

  constructor() {
    this.#baseUrl = 'https://dev.to/api/articles';
  }

  /**
   * Fetches articles from Dev.to API.
   *
   * @param {string} [tag=''] - Optional tag filter (e.g., 'javascript', 'react').
   * @param {number} [page=1] - Page number for pagination.
   * @param {number} [perPage=10] - Number of articles per page request.
   * @returns {Promise<{ error: boolean, articles?: Array<Object>, message?: string }>}
   */
  async fetchArticles(tag = '', page = 1, perPage = 10) {
    let endpoint = `${this.#baseUrl}?per_page=${perPage}&page=${page}`;

    if (tag && tag.toLowerCase() !== 'all') {
      endpoint += `&tag=${encodeURIComponent(tag.toLowerCase().trim())}`;
    }

    try {
      const response = await fetch(endpoint);

      if (!response.ok) {
        return { error: true, message: `Dev.to API error (Status ${response.status}).` };
      }

      const rawArticles = await response.json();

      if (!Array.isArray(rawArticles)) {
        return { error: true, message: 'Invalid articles data format returned.' };
      }

      const articles = rawArticles.map(art => ({
        id: art.id,
        title: art.title,
        url: art.url,
        coverImage: art.social_image || art.cover_image || null,
        author: art.user?.name || 'Dev.to Author',
        publishedAt: this.#formatRelativeTime(art.published_at),
        readablePublishDate: art.readable_publish_date,
        tags: art.tag_list || []
      }));

      return { error: false, articles };
    } catch (err) {
      console.error('[NewsService] Fetch exception:', err);
      return { error: true, message: 'Network error fetching tech news feed.' };
    }
  }

  /**
   * Helper formatting ISO date strings into relative time labels ("3h ago", "2d ago").
   */
  #formatRelativeTime(isoDateString) {
    if (!isoDateString) return 'recently';
    const date = new Date(isoDateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}
