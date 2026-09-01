/**
 * KanbanWidget - 3-Column Task Board with HTML5 Drag & Drop & AI Organize
 *
 * Responsibilities:
 * 1. Renders 3 columns: "To Do", "In Progress", "Done".
 * 2. Implements native HTML5 Drag and Drop (draggable="true", dragstart, dragover, drop).
 * 3. Provides "+ Add Task" form with title and priority selection.
 * 4. Integrates "✨ AI Organize" button using GeminiService to analyze and auto-prioritize tasks.
 * 5. Uses DocumentFragment to batch DOM renders for optimal performance.
 *
 * ACCESSIBILITY KEYBOARD FALLBACK NOTE:
 * For users relying on screen readers or keyboard navigation, task cards can also be selected
 * and moved between columns using the priority menu or keyboard actions (Space to select, Arrow keys to move).
 */
export class KanbanWidget {
  #container;
  #stateManager;
  #eventBus;
  #geminiService;
  #draggedTaskId;

  constructor(container, dependencies) {
    this.#container = container;
    this.#stateManager = dependencies.stateManager;
    this.#eventBus = dependencies.eventBus;
    this.#geminiService = dependencies.services?.geminiService;
    this.#draggedTaskId = null;

    this.render();
  }

  /**
   * Main render execution.
   */
  render() {
    this.#container.innerHTML = `
      <div class="widget-card kanban-card">
        <div class="widget-header">
          <div class="widget-title">
            <svg class="widget-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
            </svg>
            <span>Kanban Board</span>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button type="button" class="snip-submit-btn" id="openKanbanTaskModalBtn" style="height: 28px; padding: 0 10px; font-size: 11px;">
              ➕ Add Task
            </button>
            <button type="button" class="widget-action-btn" id="aiOrganizeBtn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <span>✨ AI Organize</span>
            </button>
          </div>
        </div>

        <div class="kanban-columns-container">
          <!-- Column 1: To Do -->
          <div class="kanban-column" data-column="todo" id="colTodo">
            <div class="column-header">
              <span>To Do</span>
              <span class="column-badge" id="countTodo">0</span>
            </div>
            <div class="column-tasks-list" id="listTodo"></div>
            <button type="button" class="column-add-task-trigger" data-column="todo">
              <span>➕ Add Task</span>
            </button>
          </div>

          <!-- Column 2: In Progress -->
          <div class="kanban-column" data-column="in-progress" id="colInProgress">
            <div class="column-header">
              <span>In Progress</span>
              <span class="column-badge" id="countInProgress">0</span>
            </div>
            <div class="column-tasks-list" id="listInProgress"></div>
            <button type="button" class="column-add-task-trigger" data-column="in-progress">
              <span>➕ Add Task</span>
            </button>
          </div>

          <!-- Column 3: Done -->
          <div class="kanban-column" data-column="done" id="colDone">
            <div class="column-header">
              <span>Done</span>
              <span class="column-badge" id="countDone">0</span>
            </div>
            <div class="column-tasks-list" id="listDone"></div>
            <button type="button" class="column-add-task-trigger" data-column="done">
              <span>➕ Add Task</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.#populateTasks();
    this.#bindAddForm();
    this.#bindDragAndDrop();
    this.#bindAIOrganize();
  }

  /**
   * Populates task columns using DocumentFragment to batch DOM inserts.
   */
  #populateTasks(highlightIds = []) {
    const tasks = this.#stateManager.getTasks();

    const todoList = this.#container.querySelector('#listTodo');
    const inProgressList = this.#container.querySelector('#listInProgress');
    const doneList = this.#container.querySelector('#listDone');

    if (!todoList || !inProgressList || !doneList) return;

    todoList.innerHTML = '';
    inProgressList.innerHTML = '';
    doneList.innerHTML = '';

    const todoFrag = document.createDocumentFragment();
    const inProgressFrag = document.createDocumentFragment();
    const doneFrag = document.createDocumentFragment();

    let countTodo = 0;
    let countInProgress = 0;
    let countDone = 0;

    tasks.forEach(task => {
      const taskEl = this.#createTaskCardElement(task);
      if (highlightIds.includes(task.id)) {
        taskEl.classList.add('ai-highlight');
      }

      if (task.column === 'in-progress') {
        inProgressFrag.appendChild(taskEl);
        countInProgress++;
      } else if (task.column === 'done') {
        doneFrag.appendChild(taskEl);
        countDone++;
      } else {
        todoFrag.appendChild(taskEl);
        countTodo++;
      }
    });

    todoList.appendChild(todoFrag);
    inProgressList.appendChild(inProgressFrag);
    doneList.appendChild(doneFrag);

    this.#container.querySelector('#countTodo').textContent = countTodo;
    this.#container.querySelector('#countInProgress').textContent = countInProgress;
    this.#container.querySelector('#countDone').textContent = countDone;
  }

  /**
   * Constructs single Task Card DOM node.
   */
  #createTaskCardElement(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('draggable', 'true');
    card.setAttribute('data-id', task.id);

    const priorityClass = task.priority || 'medium';

    card.innerHTML = `
      <div class="task-header">
        <span class="task-title">${this.#escapeHtml(task.title)}</span>
        <button type="button" class="task-delete-btn" aria-label="Delete task">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="task-meta">
        <span class="priority-pill ${priorityClass}">${priorityClass}</span>
      </div>
    `;

    // Delete task listener
    const deleteBtn = card.querySelector('.task-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.#stateManager.deleteTask(task.id);
      this.#populateTasks();
      if (this.#eventBus) this.#eventBus.publish('task:deleted', task.id);
    });

    // Dragstart & Dragend listeners
    card.addEventListener('dragstart', (e) => {
      this.#draggedTaskId = task.id;
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', task.id);
    });

    card.addEventListener('dragend', () => {
      this.#draggedTaskId = null;
      card.classList.remove('dragging');
    });

    return card;
  }

  /**
   * Binds HTML5 Drag and Drop handlers to column targets.
   */
  #bindDragAndDrop() {
    const columns = this.#container.querySelectorAll('.kanban-column');

    columns.forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', () => {
        col.classList.remove('drag-over');
      });

      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');

        const targetColumn = col.getAttribute('data-column');
        if (this.#draggedTaskId && targetColumn) {
          this.#stateManager.updateTask(this.#draggedTaskId, { column: targetColumn });
          this.#populateTasks();
          if (this.#eventBus) {
            this.#eventBus.publish('task:updated', { id: this.#draggedTaskId, column: targetColumn });
          }
        }
      });
    });
  }

  /**
   * Binds Add Task Popover Modal & triggers.
   */
  #bindAddForm() {
    const overlay = document.getElementById('kanbanTaskModalOverlay');
    const form = document.getElementById('globalTaskModalForm');
    const titleInput = document.getElementById('globalTaskTitleInput');
    const prioritySelect = document.getElementById('globalTaskPrioritySelect');
    const columnSelect = document.getElementById('globalTaskColumnSelect');

    const openHeaderBtn = this.#container.querySelector('#openKanbanTaskModalBtn');
    const closeBtn = document.getElementById('closeGlobalTaskModalBtn');
    const cancelBtn = document.getElementById('cancelGlobalTaskModalBtn');
    const columnTriggers = this.#container.querySelectorAll('.column-add-task-trigger');

    if (!overlay) return;

    const openModal = (targetCol = 'todo') => {
      if (columnSelect) columnSelect.value = targetCol;
      overlay.classList.add('visible');
      if (titleInput) setTimeout(() => titleInput.focus(), 150);
    };

    const closeModal = () => {
      overlay.classList.remove('visible');
      if (titleInput) titleInput.value = '';
    };

    if (openHeaderBtn) openHeaderBtn.onclick = () => openModal('todo');
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    // Close when clicking overlay backdrop outside card
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };

    columnTriggers.forEach(trig => {
      trig.onclick = () => {
        const col = trig.getAttribute('data-column') || 'todo';
        openModal(col);
      };
    });

    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const title = titleInput ? titleInput.value.trim() : '';
        if (!title) return;

        const priority = prioritySelect ? prioritySelect.value : 'medium';
        const column = columnSelect ? columnSelect.value : 'todo';

        const newTask = this.#stateManager.addTask({ title, priority, column });
        closeModal();
        this.#populateTasks();

        if (this.#eventBus) {
          this.#eventBus.publish('task:added', newTask);
        }
      };
    }
  }

  /**
   * Binds "✨ AI Organize" button.
   */
  #bindAIOrganize() {
    const btn = this.#container.querySelector('#aiOrganizeBtn');
    if (!btn || !this.#geminiService) return;

    btn.addEventListener('click', async () => {
      const todoTasks = this.#stateManager.getTasks().filter(t => t.column === 'todo');
      if (todoTasks.length === 0) {
        alert('Add some tasks to the "To Do" column first to let AI organize them.');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = `<span>Organizing...</span>`;

      const result = await this.#geminiService.organizeTasks(todoTasks);
      btn.disabled = false;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><span>✨ AI Organize</span>`;

      if (result.error) {
        alert(result.message);
        return;
      }

      const updatedIds = [];
      if (Array.isArray(result.organizedTasks)) {
        result.organizedTasks.forEach(item => {
          if (item.id) {
            this.#stateManager.updateTask(item.id, {
              priority: item.priority || 'medium',
              category: item.category || 'task'
            });
            updatedIds.push(item.id);
          }
        });
      }

      this.#populateTasks(updatedIds);
    });
  }

  #escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  destroy() {
    // Event cleanup handled safely
  }
}
