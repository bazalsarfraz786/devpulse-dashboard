import { PomodoroWidget } from '../widgets/PomodoroWidget.js';
import { KanbanWidget } from '../widgets/KanbanWidget.js';
import { GithubStatsWidget } from '../widgets/GithubStatsWidget.js';
import { SnippetVaultWidget } from '../widgets/SnippetVaultWidget.js';
import { TechNewsWidget } from '../widgets/TechNewsWidget.js';
import { AIAssistantWidget } from '../widgets/AIAssistantWidget.js';

/**
 * WidgetFactory - Factory Pattern Implementation
 *
 * DESIGN PATTERN RATIONALE:
 * The Factory pattern provides an interface for creating objects without specifying their exact
 * concrete classes in the client code. Instead of the DashboardController hardcoding explicit
 * `new PomodoroWidget()`, `new KanbanWidget()`, etc. throughout the layout rendering code,
 * `WidgetFactory.create(type, container, dependencies)` encapsulates instantiation logic.
 * This makes adding, removing, or re-ordering dashboard widgets configuration-driven and scalable.
 */
export class WidgetFactory {
  // Registry of supported widget type string keys mapped to class constructors
  static WIDGET_REGISTRY = {
    'pomodoro': PomodoroWidget,
    'kanban': KanbanWidget,
    'github': GithubStatsWidget,
    'snippets': SnippetVaultWidget,
    'news': TechNewsWidget,
    'ai_assistant': AIAssistantWidget
  };

  /**
   * Factory method instantiating a concrete widget based on widget type string.
   *
   * @param {string} widgetType - Registered type identifier (e.g. 'pomodoro', 'kanban').
   * @param {HTMLElement} container - Target DOM container node where widget renders.
   * @param {Object} dependencies - Shared dependency injection payload (stateManager, eventBus, services).
   * @returns {Object|null} Concrete widget instance or null if unrecognized type.
   */
  static create(widgetType, container, dependencies) {
    const WidgetClass = this.WIDGET_REGISTRY[widgetType];

    if (!WidgetClass) {
      console.error(`[WidgetFactory] Unknown widget type: "${widgetType}". Registered types:`, Object.keys(this.WIDGET_REGISTRY));
      return null;
    }

    if (!container || !(container instanceof HTMLElement)) {
      console.error(`[WidgetFactory] Invalid container specified for widget "${widgetType}".`);
      return null;
    }

    try {
      // Instantiate concrete widget with container and injected dependencies
      const widgetInstance = new WidgetClass(container, dependencies);
      console.log(`[WidgetFactory] Created widget instance: ${WidgetClass.name}`);
      return widgetInstance;
    } catch (err) {
      console.error(`[WidgetFactory] Failed to instantiate widget "${widgetType}":`, err);
      return null;
    }
  }
}
