import { GEMINI_API_KEY } from '../config.js';

/**
 * GeminiService - Client Integration for Google Gemini REST API
 *
 * Responsibilities:
 * 1. Wraps API calls to Google Gemini (`generateContent` endpoint).
 * 2. Powers AI Rubber Duck Debugging Assistant, Kanban AI Organize, and AI Snippet Generation.
 * 3. Provides automatic fallback between `gemini-1.5-flash` and `gemini-2.0-flash`.
 * 4. Provides clean error responses for missing/unconfigured API keys or HTTP errors.
 */
export class GeminiService {
  #apiKey;
  #models;

  constructor() {
    this.#apiKey = GEMINI_API_KEY;
    this.#models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
  }

  /**
   * Checks if API key is configured.
   * @returns {boolean}
   */
  isConfigured() {
    return !!this.#apiKey && 
           this.#apiKey !== 'PASTE_YOUR_GEMINI_KEY_HERE' && 
           typeof this.#apiKey === 'string' &&
           this.#apiKey.trim().length > 0;
  }

  /**
   * General text generation helper executing fetch requests against Gemini API.
   * Automatically attempts model fallbacks if a specific model returns 404.
   *
   * @param {string} prompt - User or system formatted prompt string.
   * @param {string} [systemInstruction] - Optional system instruction message.
   * @returns {Promise<{ error: boolean, content?: string, message?: string }>}
   */
  async generateText(prompt, systemInstruction = '') {
    if (!this.isConfigured()) {
      return {
        error: true,
        message: 'AI service unavailable — please set a valid GEMINI_API_KEY in js/config.js.'
      };
    }

    if (!this.#apiKey.startsWith('AIzaSy')) {
      return {
        error: true,
        message: `Invalid Google Gemini API Key format in js/config.js. Google AI Studio keys MUST start with "AIzaSy..." (e.g. AIzaSyA1b2C3...). The current key starts with "${this.#apiKey.substring(0, 4)}".`
      };
    }

    const contents = [];

    if (systemInstruction) {
      contents.push({
        role: 'user',
        parts: [{ text: `System Instruction: ${systemInstruction}` }]
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will follow these instructions.' }]
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    let lastErrorStatus = null;

    // Try models in sequence
    for (const model of this.#models) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.#apiKey}`;

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents })
        });

        if (response.ok) {
          const data = await response.json();
          const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!generatedText) {
            return { error: true, message: 'No text content returned from AI response.' };
          }

          return { error: false, content: generatedText.trim() };
        }

        lastErrorStatus = response.status;

        // If 400/401/403, key is invalid, stop looping
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          return { error: true, message: 'AI service error — Invalid Google Gemini API Key. Keys from Google AI Studio must start with "AIzaSy...".' };
        }
        if (response.status === 429) {
          return { error: true, message: 'AI service rate limit exceeded (429). Please try again in a moment.' };
        }

        // If 404, try next model in loop
        if (response.status === 404) {
          console.warn(`[GeminiService] Model ${model} returned 404. Trying next model...`);
          continue;
        }
      } catch (err) {
        console.error(`[GeminiService] Network error on model ${model}:`, err);
      }
    }

    return {
      error: true,
      message: `Gemini API returned status ${lastErrorStatus || 404}. Please verify your API key is created at https://aistudio.google.com/app/apikey (starts with AIzaSy...).`
    };
  }

  /**
   * AI Rubber Duck Assistant - Chat completion.
   * @param {Array<{ role: string, content: string }>} conversationHistory
   * @param {string} userMessage
   * @returns {Promise<{ error: boolean, content?: string, message?: string }>}
   */
  async chat(conversationHistory, userMessage) {
    const systemPrompt = `You are a world-class senior AI software engineer and rubber duck debugging partner (like ChatGPT and Claude).

CRITICAL FORMATTING & STYLE RULES:
1. Be concise, direct, and highly professional. Avoid conversational fluff or filler phrases.
2. Structure your answer using short, focused paragraphs (1-3 sentences max per paragraph).
3. Use clear section headers (e.g. ### 1. Key Optimization) for distinct logical steps.
4. Highlight important technical terms using **bold text** and inline \`code\`.
5. Use clean bullet points (- or 1.) for lists of recommendations, features, or steps.
6. Provide executable code snippets in markdown code blocks (\`\`\`javascript ... \`\`\`).`;

    const formattedPrompt = conversationHistory.length > 0
      ? `Previous Conversation:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${userMessage}`
      : userMessage;

    return this.generateText(formattedPrompt, systemPrompt);
  }

  /**
   * Kanban Board - AI Organize Tasks.
   * Categorizes and assigns priority to unorganized task titles.
   *
   * @param {Array<{ id: string, title: string }>} tasks - Tasks to organize.
   * @returns {Promise<{ error: boolean, organizedTasks?: Array<Object>, message?: string }>}
   */
  async organizeTasks(tasks) {
    if (!tasks || tasks.length === 0) {
      return { error: true, message: 'No tasks provided to organize.' };
    }

    const taskListText = tasks.map((t, idx) => `${idx + 1}. [ID: ${t.id}] ${t.title}`).join('\n');
    const prompt = `Analyze the following developer tasks and assign each task a priority ("high", "medium", or "low") and a category ("bug", "feature", or "chore").

Return ONLY a valid JSON array of objects with keys "id", "priority", and "category". Do NOT include markdown code fences or conversational text.

Tasks:
${taskListText}`;

    const response = await this.generateText(prompt);
    if (response.error) return response;

    try {
      let cleanJson = response.content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (Array.isArray(parsed)) {
        return { error: false, organizedTasks: parsed };
      }
      return { error: true, message: 'Failed to parse AI response array.' };
    } catch (err) {
      console.error('[GeminiService] JSON parse error in organizeTasks:', err);
      return { error: true, message: 'AI response was not valid JSON format.' };
    }
  }

  /**
   * Snippet Vault - AI Code Generator.
   * Generates code snippets based on user prompts.
   *
   * @param {string} promptDescription
   * @returns {Promise<{ error: boolean, title?: string, language?: string, code?: string, message?: string }>}
   */
  async generateSnippet(promptDescription) {
    const prompt = `Generate a high quality code snippet for: "${promptDescription}".
Return ONLY a valid JSON object with keys "title", "language" (lowercase extension like js, css, html, python, sql), and "code".
Do NOT include markdown code fences or conversational text.`;

    const response = await this.generateText(prompt);
    if (response.error) return response;

    try {
      let cleanJson = response.content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed && parsed.title && parsed.code) {
        return {
          error: false,
          title: parsed.title,
          language: (parsed.language || 'js').toLowerCase(),
          code: parsed.code
        };
      }
      return { error: true, message: 'Parsed AI snippet was missing required fields.' };
    } catch (err) {
      console.error('[GeminiService] JSON parse error in generateSnippet:', err);
      return { error: true, message: 'Failed to parse AI code snippet response.' };
    }
  }
}
