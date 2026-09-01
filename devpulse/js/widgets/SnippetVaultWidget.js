/**
 * SnippetVaultWidget - Code Snippets Manager with Clipboard Copy & AI Generation
 *
 * Responsibilities:
 * 1. Manages stored code snippets in StateManager (localStorage).
 * 2. Provides 1-click clipboard copy (`navigator.clipboard.writeText`) with toast notification feedback.
 * 3. Supports expanding code rows to inspect preformatted `<pre><code>` blocks.
 * 4. Includes manual "+ New Snippet" creation form and "✨ Generate with AI" prompt generator.
 */
export class SnippetVaultWidget {
  #container;
  #stateManager;
  #eventBus;
  #geminiService;

  constructor(container, dependencies) {
    this.#container = container;
    this.#stateManager = dependencies.stateManager;
    this.#eventBus = dependencies.eventBus;
    this.#geminiService = dependencies.services?.geminiService;

    this.render();
  }

  /**
   * Main render execution.
   */
  render() {
    this.#container.innerHTML = `
      <div class="widget-card snippet-vault-card">
        <div class="widget-header">
          <div class="widget-title">
            <svg class="widget-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span>Snippet Vault</span>
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="widget-action-btn" id="newSnippetBtn">+ New</button>
            <button type="button" class="widget-action-btn" id="aiGenerateSnippetBtn">✨ AI Generate</button>
          </div>
        </div>

        <!-- Inline New / AI Form Container -->
        <div id="snippetFormArea" style="display: none; margin-bottom: 12px; padding: 10px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px;"></div>

        <!-- Snippets List View -->
        <div class="snippets-list" id="snippetsList"></div>
      </div>
    `;

    this.#populateSnippets();
    this.#bindActionButtons();
  }

  /**
   * Populates snippets list using DocumentFragment to batch DOM inserts.
   */
  #populateSnippets() {
    const listEl = this.#container.querySelector('#snippetsList');
    if (!listEl) return;

    const snippets = this.#stateManager.getSnippets();
    listEl.innerHTML = '';

    if (snippets.length === 0) {
      listEl.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-secondary); font-size: 13px;">No code snippets stored yet. Click "+ New" or "✨ AI Generate" to add one!</div>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    snippets.forEach(snippet => {
      const itemNode = document.createElement('div');
      itemNode.className = 'snippet-item';
      itemNode.setAttribute('data-id', snippet.id);

      itemNode.innerHTML = `
        <div class="snippet-row-main">
          <div class="snippet-left">
            <span class="lang-pill">${this.#escapeHtml(snippet.language || 'js')}</span>
            <span class="snippet-title">${this.#escapeHtml(snippet.title)}</span>
          </div>
          <div style="display: flex; gap: 4px; align-items: center;">
            <button type="button" class="snippet-copy-btn" aria-label="Copy snippet code" title="Copy snippet code">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button type="button" class="snippet-delete-btn" aria-label="Delete snippet" title="Delete snippet">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </div>
        <div class="snippet-code-expanded"><code>${this.#escapeHtml(snippet.code)}</code></div>
      `;

      // Expand/Collapse code view on item click
      itemNode.addEventListener('click', (e) => {
        if (e.target.closest('.snippet-copy-btn') || e.target.closest('.snippet-delete-btn')) return;
        itemNode.classList.toggle('expanded');
      });

      // Copy code to clipboard
      const copyBtn = itemNode.querySelector('.snippet-copy-btn');
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.#copyToClipboard(snippet.code);
      });

      // Delete snippet handler
      const deleteBtn = itemNode.querySelector('.snippet-delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Delete snippet "${snippet.title}"?`)) {
            this.#stateManager.deleteSnippet(snippet.id);
            this.#populateSnippets();
          }
        });
      }

      fragment.appendChild(itemNode);
    });

    listEl.appendChild(fragment);
  }

  /**
   * Binds header buttons (+ New Snippet and ✨ AI Generate).
   */
  #bindActionButtons() {
    const newBtn = this.#container.querySelector('#newSnippetBtn');
    const aiBtn = this.#container.querySelector('#aiGenerateSnippetBtn');
    const formArea = this.#container.querySelector('#snippetFormArea');

    if (newBtn) {
      newBtn.addEventListener('click', () => {
        this.#renderManualForm(formArea);
      });
    }

    if (aiBtn) {
      aiBtn.addEventListener('click', () => {
        this.#renderAIForm(formArea);
      });
    }
  }

  /**
   * Displays manual "+ New Snippet" inline form.
   */
  #renderManualForm(container) {
    container.style.display = 'block';
    container.innerHTML = `
      <form id="manualSnippetForm" style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; gap: 6px;">
          <input type="text" id="snipTitleInput" placeholder="Snippet Title" class="form-input" style="height: 34px; font-size: 12px; flex: 2;" required>
          <select id="snipLangSelect" class="form-select" style="height: 34px; font-size: 12px; flex: 1;">
            <option value="js">JS</option>
            <option value="css">CSS</option>
            <option value="html">HTML</option>
            <option value="python">Python</option>
            <option value="sql">SQL</option>
          </select>
        </div>
        <textarea id="snipCodeInput" placeholder="Paste code here..." class="form-input" style="height: 65px; font-size: 12px; font-family: var(--font-mono); resize: vertical;" required></textarea>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 2px;">
          <button type="button" id="cancelSnipFormBtn" class="widget-action-btn" style="height: 34px; padding: 0 14px; font-size: 12px;">Cancel</button>
          <button type="submit" class="snip-submit-btn">💾 Save Snippet</button>
        </div>
      </form>
    `;

    container.querySelector('#cancelSnipFormBtn').addEventListener('click', () => {
      container.style.display = 'none';
      container.innerHTML = '';
    });

    container.querySelector('#manualSnippetForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const title = container.querySelector('#snipTitleInput').value.trim();
      const language = container.querySelector('#snipLangSelect').value;
      const code = container.querySelector('#snipCodeInput').value;

      if (!title || !code) return;

      this.#stateManager.addSnippet({ title, language, code });
      container.style.display = 'none';
      container.innerHTML = '';
      this.#populateSnippets();
    });
  }

  /**
   * Displays "✨ AI Generate Snippet" prompt input form.
   */
  #renderAIForm(container) {
    container.style.display = 'block';
    container.innerHTML = `
      <form id="aiSnippetForm" style="display: flex; flex-direction: column; gap: 8px;">
        <input type="text" id="aiPromptInput" placeholder="Describe the code you need (e.g. JS debounce function)..." class="form-input" style="height: 34px; font-size: 12px;" required>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 2px;">
          <button type="button" id="cancelAiFormBtn" class="widget-action-btn" style="height: 34px; padding: 0 14px; font-size: 12px;">Cancel</button>
          <button type="submit" id="submitAiBtn" class="snip-submit-btn">✨ Generate with AI</button>
        </div>
      </form>
    `;

    container.querySelector('#cancelAiFormBtn').addEventListener('click', () => {
      container.style.display = 'none';
      container.innerHTML = '';
    });

    container.querySelector('#aiSnippetForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const prompt = container.querySelector('#aiPromptInput').value.trim();
      const submitBtn = container.querySelector('#submitAiBtn');

      if (!prompt || !this.#geminiService) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Generating...';

      const result = await this.#geminiService.generateSnippet(prompt);

      if (result.error) {
        alert(result.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate with AI';
        return;
      }

      this.#stateManager.addSnippet({
        title: result.title,
        language: result.language,
        code: result.code
      });

      container.style.display = 'none';
      container.innerHTML = '';
      this.#populateSnippets();
    });
  }

  /**
   * Copies code to clipboard and displays toast feedback.
   */
  #copyToClipboard(codeText) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(codeText).then(() => {
        this.#showToast('Copied to clipboard!');
      }).catch(err => {
        console.error('[SnippetVaultWidget] Copy failed:', err);
      });
    }
  }

  /**
   * Displays brief copy feedback toast notification.
   */
  #showToast(message) {
    let toast = document.getElementById('copyToastNotification');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'copyToastNotification';
      toast.className = 'copy-toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('visible');

    setTimeout(() => {
      toast.classList.remove('visible');
    }, 1500);
  }

  #escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  destroy() {}
}
