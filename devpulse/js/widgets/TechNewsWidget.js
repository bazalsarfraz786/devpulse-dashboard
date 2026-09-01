/**
 * TechNewsWidget - Live Dev.to News Feed with Tag Filtering & IntersectionObserver Infinite Scroll
 *
 * Responsibilities:
 * 1. Fetches articles from Dev.to API using NewsService.
 * 2. Implements tag filter chips ("All", "JavaScript", "React", "AI", "CSS").
 * 3. Uses IntersectionObserver on a bottom sentinel element to handle infinite scroll loading natively.
 * 4. Batches article DOM additions using DocumentFragment.
 * 5. Cleans up observer in destroy() to prevent memory leaks.
 */
export class TechNewsWidget {
  #container;
  #newsService;

  #currentTag;
  #currentPage;
  #isLoading;
  #hasMore;
  #observer;

  // DOM node references
  #articlesListEl;
  #sentinelEl;

  constructor(container, dependencies) {
    this.#container = container;
    this.#newsService = dependencies.services?.newsService;

    this.#currentTag = 'all';
    this.#currentPage = 1;
    this.#isLoading = false;
    this.#hasMore = true;
    this.#observer = null;

    this.render();
  }

  /**
   * Main render execution.
   */
  render() {
    this.#container.innerHTML = `
      <div class="widget-card tech-news-card">
        <div class="widget-header">
          <div class="widget-title">
            <svg class="widget-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
              <path d="M18 14h-8"/>
              <path d="M15 18h-5"/>
              <path d="M10 6h8v4h-8V6Z"/>
            </svg>
            <span>Tech News</span>
          </div>
        </div>

        <!-- Filter Chips Row -->
        <div class="news-chips-row">
          <button type="button" class="news-chip active" data-tag="all">All</button>
          <button type="button" class="news-chip" data-tag="javascript">JavaScript</button>
          <button type="button" class="news-chip" data-tag="react">React</button>
          <button type="button" class="news-chip" data-tag="ai">AI</button>
          <button type="button" class="news-chip" data-tag="css">CSS</button>
        </div>

        <!-- Scrollable Articles List -->
        <div class="news-articles-list" id="newsArticlesList">
          <!-- IntersectionObserver Sentinel Sentinel Node -->
          <div id="newsSentinel" style="height: 20px; text-align: center; font-size: 11px; color: var(--text-secondary);">
            Loading news...
          </div>
        </div>
      </div>
    `;

    this.#articlesListEl = this.#container.querySelector('#newsArticlesList');
    this.#sentinelEl = this.#container.querySelector('#newsSentinel');

    this.#bindFilterChips();
    this.#setupIntersectionObserver();
    this.#loadArticles(true);
  }

  /**
   * Binds tag filter chip click events.
   */
  #bindFilterChips() {
    const chips = this.#container.querySelectorAll('.news-chip');

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.getAttribute('data-tag');
        if (tag === this.#currentTag) return;

        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        this.#currentTag = tag;
        this.#currentPage = 1;
        this.#hasMore = true;
        this.#loadArticles(true);
      });
    });
  }

  /**
   * Sets up IntersectionObserver for native infinite scroll.
   */
  #setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;

    this.#observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && !this.#isLoading && this.#hasMore) {
        this.#loadArticles(false);
      }
    }, {
      root: this.#articlesListEl,
      rootMargin: '50px',
      threshold: 0.1
    });

    if (this.#sentinelEl) {
      this.#observer.observe(this.#sentinelEl);
    }
  }

  /**
   * Loads articles from NewsService and appends them to list.
   * @param {boolean} isReset - If true, clears list before appending.
   */
  async #loadArticles(isReset = false) {
    if (this.#isLoading || !this.#newsService) return;
    this.#isLoading = true;

    if (this.#sentinelEl) {
      this.#sentinelEl.textContent = 'Loading news...';
      this.#sentinelEl.style.display = 'block';
    }

    if (isReset && this.#articlesListEl) {
      // Clear existing articles except sentinel node
      const sentinel = this.#sentinelEl;
      this.#articlesListEl.innerHTML = '';
      if (sentinel) this.#articlesListEl.appendChild(sentinel);
    }

    const result = await this.#newsService.fetchArticles(this.#currentTag, this.#currentPage, 8);
    this.#isLoading = false;

    if (result.error) {
      if (this.#sentinelEl) {
        this.#sentinelEl.textContent = 'Unable to load news feed.';
      }
      return;
    }

    const articles = result.articles || [];

    if (articles.length === 0) {
      this.#hasMore = false;
      if (this.#sentinelEl) {
        this.#sentinelEl.textContent = 'No more articles.';
      }
      return;
    }

    // Use DocumentFragment to batch append article nodes
    const fragment = document.createDocumentFragment();

    articles.forEach(art => {
      const itemNode = document.createElement('a');
      itemNode.className = 'news-article-item';
      itemNode.href = art.url;
      itemNode.target = '_blank';
      itemNode.rel = 'noopener noreferrer';

      const thumbUrl = art.coverImage || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%238B9099" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Z"/></svg>';

      itemNode.innerHTML = `
        <img class="article-thumb" src="${thumbUrl}" alt="Article thumbnail" loading="lazy">
        <div class="article-details">
          <span class="article-title">${this.#escapeHtml(art.title)}</span>
          <span class="article-meta">${this.#escapeHtml(art.author)} • ${art.publishedAt}</span>
        </div>
      `;

      fragment.appendChild(itemNode);
    });

    if (this.#articlesListEl && this.#sentinelEl) {
      this.#articlesListEl.insertBefore(fragment, this.#sentinelEl);
    }

    this.#currentPage++;
  }

  #escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  destroy() {
    if (this.#observer) {
      this.#observer.disconnect();
      this.#observer = null;
    }
  }
}
