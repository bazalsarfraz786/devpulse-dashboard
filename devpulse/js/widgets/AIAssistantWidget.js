import { StorageManager } from '../core/StorageManager.js';

/**
 * AIAssistantWidget - Executive IDE Rubber Duck AI Debugging Companion
 *
 * Responsibilities:
 * 1. Provides a high-tech IDE debugging assistant partner UI.
 * 2. Formats markdown code blocks with copy-to-clipboard functionality.
 * 3. Includes 1-click Quick Prompt Chips (Debug, Optimize, Explain).
 * 4. Displays live status badge and clear chat controls.
 * 5. Persists chat history in sessionStorage ('devpulse_chat_history').
 */
export class AIAssistantWidget {
  #container;
  #geminiService;
  #storageManager;
  #history;

  #chatListEl;
  #textareaEl;
  #sendBtnEl;

  constructor(container, dependencies) {
    this.#container = container;
    this.#geminiService = dependencies.services?.geminiService;
    this.#storageManager = new StorageManager();
    this.#history = [];

    this.render();
  }

  /**
   * Main render execution.
   */
  render() {
    this.#container.innerHTML = `
      <div class="widget-card ai-assistant-card">
        <div class="widget-header" style="display: flex; justify-content: space-between; align-items: center;">
          <div class="widget-title" style="display: flex; align-items: center; gap: 8px;">
            <svg class="widget-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Rubber Duck AI</span>
            <span class="ai-status-pill" style="font-size: 10px; background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); padding: 2px 6px; border-radius: 10px; font-weight: 500;">
              🟢 Live
            </span>
          </div>
          <button type="button" class="icon-btn-ghost" id="clearAiChatBtn" title="Clear Chat History" style="width: 26px; height: 26px; font-size: 11px;">
            🗑️
          </button>
        </div>

        <div class="chat-messages-container" id="chatMessagesList"></div>

        <!-- Quick Prompt Chips -->
        <div class="ai-prompt-chips" style="display: flex; gap: 4px; margin: 8px 0; overflow-x: auto; padding-bottom: 2px;">
          <button type="button" class="ai-chip-btn" data-prompt="Help me debug this code for errors:\n\n">🐛 Debug Code</button>
          <button type="button" class="ai-chip-btn" data-prompt="Optimize this code for performance:\n\n">⚡ Optimize</button>
          <button type="button" class="ai-chip-btn" data-prompt="Explain step-by-step how this works:\n\n">📝 Explain</button>
        </div>

        <form class="chat-input-row" id="chatInputForm">
          <textarea class="chat-textarea" id="chatInputText" placeholder="Paste code or describe a bug..." required></textarea>
          <button type="submit" class="chat-send-btn" id="chatSendBtn" aria-label="Send message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    `;

    this.#chatListEl = this.#container.querySelector('#chatMessagesList');
    this.#textareaEl = this.#container.querySelector('#chatInputText');
    this.#sendBtnEl = this.#container.querySelector('#chatSendBtn');

    this.#loadChatHistory();
    this.#bindEvents();
  }

  /**
   * Loads chat history from sessionStorage.
   */
  #loadChatHistory() {
    const saved = this.#storageManager.get('devpulse_chat_history', 'session');
    this.#history = Array.isArray(saved) ? saved : [
      { role: 'model', content: "Hello! I'm your Rubber Duck AI Assistant. Paste code or describe any bug, and I'll help you solve it step-by-step." }
    ];
    this.#renderMessages();
  }

  /**
   * Renders chat bubbles with formatted code blocks and copy buttons.
   */
  #renderMessages() {
    if (!this.#chatListEl) return;
    this.#chatListEl.innerHTML = '';

    const fragment = document.createDocumentFragment();

    this.#history.forEach(msg => {
      const bubble = document.createElement('div');
      const isUser = msg.role === 'user';
      bubble.className = `chat-bubble ${isUser ? 'user' : 'ai'}`;

      const avatarLabel = isUser ? '👤 You' : '🦆 AI';
      const formattedText = this.#formatMessageContent(msg.content);

      bubble.innerHTML = `
        <div class="chat-bubble-header" style="font-size: 10px; opacity: 0.7; margin-bottom: 4px; font-weight: 600;">${avatarLabel}</div>
        <div class="chat-bubble-body">${formattedText}</div>
      `;

      fragment.appendChild(bubble);
    });

    this.#chatListEl.appendChild(fragment);
    this.#bindCopyButtons();
    this.#scrollToBottom();
  }

  /**
   * Binds form submission, quick prompt chips, and clear history events.
   */
  #bindEvents() {
    const form = this.#container.querySelector('#chatInputForm');
    const clearBtn = this.#container.querySelector('#clearAiChatBtn');
    const chipBtns = this.#container.querySelectorAll('.ai-chip-btn');

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear chat history?')) {
          this.#history = [
            { role: 'model', content: "Chat reset. How can I help you debug today?" }
          ];
          this.#storageManager.set('devpulse_chat_history', this.#history, 'session');
          this.#renderMessages();
        }
      });
    }

    chipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const promptPrefix = btn.getAttribute('data-prompt');
        if (this.#textareaEl) {
          this.#textareaEl.value = promptPrefix + this.#textareaEl.value;
          this.#textareaEl.focus();
        }
      });
    });

    if (!form || !this.#textareaEl) return;

    this.#textareaEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = this.#textareaEl.value.trim();
      if (!text || !this.#geminiService) return;

      this.#history.push({ role: 'user', content: text });
      this.#storageManager.set('devpulse_chat_history', this.#history, 'session');
      this.#textareaEl.value = '';
      this.#renderMessages();

      const loadingBubble = this.#showTypingIndicator();

      const result = await this.#geminiService.chat(this.#history.slice(0, -1), text);
      this.#removeTypingIndicator(loadingBubble);

      if (result.error) {
        this.#history.push({ role: 'model', content: `⚠️ ${result.message}` });
      } else {
        this.#history.push({ role: 'model', content: result.content });
      }

      this.#storageManager.set('devpulse_chat_history', this.#history, 'session');
      this.#renderMessages();
    });
  }

  #bindCopyButtons() {
    const copyBtns = this.#chatListEl.querySelectorAll('.code-copy-btn');
    copyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const codeText = btn.nextElementSibling?.textContent || '';
        navigator.clipboard.writeText(codeText).then(() => {
          btn.textContent = 'Copied!';
          setTimeout(() => btn.textContent = 'Copy Code', 2000);
        });
      });
    });
  }

  #showTypingIndicator() {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ai';
    bubble.innerHTML = `
      <div class="chat-bubble-header" style="font-size: 10px; opacity: 0.7; margin-bottom: 4px; font-weight: 600;">🦆 AI</div>
      <div class="typing-dots">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    this.#chatListEl.appendChild(bubble);
    this.#scrollToBottom();
    return bubble;
  }

  #removeTypingIndicator(bubble) {
    if (bubble && bubble.parentNode) {
      bubble.parentNode.removeChild(bubble);
    }
  }

  #scrollToBottom() {
    if (this.#chatListEl) {
      this.#chatListEl.scrollTop = this.#chatListEl.scrollHeight;
    }
  }

  /**
   * Formats response text into Markdown code blocks, section headers, bold terms, inline code, and lists.
   */
  #formatMessageContent(content) {
    if (!content) return '';

    // Step 1: Extract code blocks (```lang ... ```) and replace with placeholder tokens
    const codeBlocks = [];
    const codeBlockRegex = /```([a-z0-9_-]+)?\n([\s\S]*?)```/gi;

    let processed = content.replace(codeBlockRegex, (match, lang, code) => {
      const index = codeBlocks.length;
      const escapedCode = this.#escapeHtml(code.trim());
      const langLabel = (lang || 'code').toUpperCase();
      codeBlocks.push(`
        <div class="ai-code-block" style="position: relative; margin: 10px 0; background: rgba(15, 23, 42, 0.85); border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 4px 10px; border-bottom: 1px solid var(--border); font-size: 10px; color: var(--text-secondary); font-weight: 600;">
            <span>${langLabel}</span>
            <button type="button" class="code-copy-btn" style="background: rgba(255, 255, 255, 0.1); border: 1px solid var(--border); color: var(--text-primary); font-size: 10px; padding: 2px 8px; border-radius: 4px; cursor: pointer;">Copy Code</button>
          </div>
          <pre style="margin: 0; padding: 10px; white-space: pre-wrap; overflow-x: auto; font-family: var(--font-mono); font-size: 11.5px; line-height: 1.45;"><code>${escapedCode}</code></pre>
        </div>
      `);
      return `___CODE_BLOCK_${index}___`;
    });

    // Step 2: Escape HTML on non-code content
    processed = this.#escapeHtml(processed);

    // Step 3: Headings (### Header, ## Header, # Header)
    processed = processed.replace(/^### (.*$)/gim, '<h4 class="ai-section-title">$1</h4>');
    processed = processed.replace(/^## (.*$)/gim, '<h4 class="ai-section-title">$1</h4>');
    processed = processed.replace(/^# (.*$)/gim, '<h4 class="ai-section-title">$1</h4>');

    // Step 4: Bold text (**bold**)
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary); font-weight: 600;">$1</strong>');

    // Step 5: Inline code (`code`)
    processed = processed.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');

    // Step 6: Bullet lists (- item or * item or 1. item)
    processed = processed.replace(/^[\*\-\+] (.*$)/gim, '<div class="ai-list-item"><span class="ai-bullet">•</span><span>$1</span></div>');
    processed = processed.replace(/^(\d+)\. (.*$)/gim, '<div class="ai-list-item"><span class="ai-bullet">$1.</span><span>$2</span></div>');

    // Step 7: Paragraph line breaks
    processed = processed.replace(/\n\n/g, '<div style="height: 6px;"></div>');
    processed = processed.replace(/\n/g, '<br>');

    // Step 8: Re-insert saved code blocks
    codeBlocks.forEach((block, index) => {
      processed = processed.replace(`___CODE_BLOCK_${index}___`, block);
    });

    return processed;
  }

  #escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  destroy() {}
}
