import { HAControlBase, html } from "../ha-control-base.js?v=0.6.9";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.2';

import { Task } from "../utilities/task/task-dto-task.js?v=1.0.22";
import { Day } from "../utilities/task/task-dto-day.js?v=1.0.22";
import { TaskDataManager } from "../utilities/task/task-data-manager.js?v=1.0.22";

/**
 * TaskListCard
 * A custom Home Assistant Lovelace dashboard card that fetches, aggregates, groups, and displays tasks
 * from Home Assistant `todo` list entities. Supports multi-list sourcing, day/week/month grouping,
 * dynamic due calculations, reload entry triggers, bulk deletions, and toggling overrides.
 * 
 * @extends HAControlBase
 */
class TaskListCard extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Inherits properties from HAControlBase and tracks configuration, groups, and execution states.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return { ...super.properties, config: {}, _groups: { state: true }, _processing: { state: true } };
  }

  /**
   * Resolves the directory path hosting the translation localizations.
   * 
   * @type {string}
   */
  get translationPath() { return "/local/ha-controls/task-list-card/translations"; }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() { return VERSION; }

  /**
   * Creates and returns the configuration editor element for this card.
   * Home Assistant Lovelace visual editor links to this method.
   * 
   * @static
   * @returns {HTMLElement} The task-list-card-editor configuration element
   */
  static getConfigElement() {
    return document.createElement("task-list-card-editor");
  }

  /**
   * Returns default stub configuration details for this custom card.
   * Used when users click to add this card to their dashboards.
   * 
   * @static
   * @returns {Object} Stub configuration details
   */
  static getStubConfig() {
    return {
      entity: "todo.shopping_list",
      icon: "mdi:calendar-check"
    };
  }

  /**
   * Sets the configuration object for the card, setting default configuration options.
   * 
   * @param {Object} config - Lovelace configuration schema
   * @throws {Error} If entity/entities list is missing in configuration schema
   */
  setConfig(config) {
    if (!config.entity && !config.entities) {
      throw new Error("Please define an entity");
    }
    this.config = {
      show_no_due_date: true,
      show_completed: true,
      show_due_date: true,
      show_description: false,
      show_due_in_days: false,
      show_refresh_button: false,
      show_delete_completed_button: false,
      show_source: false,
      merge_tasks_same_day: false,
      source_color: '',
      date_separator_color: 'transparent',
      day_separator_color: '',
      due_in_days_separator_color: '',
      merged_tasks_separator_color: 'var(--divider-color)',
      separator_mode: 'day',
      icon: 'mdi:calendar-check',
      block_future_toggles: true,
      ...config
    };
    this._groups = null;
    this._toggledItems = [];
    this._processing = 'loading';
    // Memoize entity list so _getEntities() doesn't reconstruct the array on every call
    this._entities = (this.config.entities || (this.config.entity ? [this.config.entity] : []))
      .map(e => (typeof e === 'object' ? e.entity : e));
    this._hassEntityChanged = false;
    this._fetchItems();
  }

  /**
   * Internal debounce timer identifier for tracking state changes.
   * @type {number|null}
   * @private
   */
  _debounceTimer = null;

  /**
   * Array storing local copies of tasks currently being toggled in the UI.
   * Used to filter updates during state reconciliation.
   * @type {Array<Object>}
   * @private
   */
  _toggledItems = [];

  /**
   * Controls when the element should re-render to optimize dashboard performance.
   * Only returns true if configured todo entities actually change state.
   * 
   * @param {Map<string, any>} changedProps - Map of properties that changed in this cycle
   * @returns {boolean} True if the card should re-render, false otherwise
   */
  shouldUpdate(changedProps) {
    if (changedProps.has('config')) {
      return true;
    }

    if (!changedProps.has("hass")) {
      return true;
    }

    const oldHass = changedProps.get("hass");
    if (!oldHass) {
      this._hassEntityChanged = true;
      return true;
    }

    const entities = this._getEntities();
    let hasChanged = false;
    let ignoredCount = 0;
    let changeCount = 0;

    for (const entityId of entities) {
      const oldState = oldHass.states[entityId];
      const newState = this.hass.states[entityId];

      if (!newState || ["unavailable", "unknown"].includes(newState.state)) {
        continue;
      }

      if (oldState && oldState.last_updated !== newState?.last_updated) {
        hasChanged = true;
        changeCount++;

        const idx = this._toggledItems.findIndex(i => i.entity_id === entityId);
        if (idx !== -1) {
          this._toggledItems.splice(idx, 1);
          ignoredCount++;
        }
      }
    }

    // Record result so updated() can skip its own duplicate scan
    this._hassEntityChanged = hasChanged && changeCount !== ignoredCount;

    if (hasChanged && changeCount === ignoredCount) {
      return false;
    }

    return super.shouldUpdate(changedProps);
  }

  /**
   * LitElement lifecycle trigger. Captures todo list updates and triggers debounced item refetches.
   * 
   * @param {Map<string, any>} changedProps - Map of properties that changed in this cycle
   */
  /**
   * LitElement lifecycle hook. Destroys debounced fetch timers to prevent memory leaks.
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
  }

  /**
   * LitElement lifecycle trigger. Captures todo list updates and triggers debounced item refetches.
   * 
   * @param {Map<string, any>} changedProps - Map of properties that changed in this cycle
   */
  updated(changedProps) {
    super.updated(changedProps);
    if (!changedProps.has("hass")) { return; }
    
    const oldHass = changedProps.get("hass");
    if (!oldHass) {
      // First update cycle - hass set for the first time, trigger initial fetch
      this._fetchItems();
      return;
    }

    // Reuse the flag set in shouldUpdate to avoid a duplicate entity scan
    if (!this._hassEntityChanged) { return; }
    this._hassEntityChanged = false;

    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this._fetchItems();
    }, 500);
  }

  /**
   * Helper parsing entities from configured target entity or custom entities array.
   * Returns the memoized entity list cached in setConfig to avoid rebuilding on every call.
   * 
   * @private
   * @returns {Array<string>} List of todo list entity IDs
   */
  _getEntities() {
    return this._entities || [];
  }

  /**
   * Asynchronously queries the Home Assistant todo list entities API, parses items into Task objects,
   * sorts them chronologically, and groups them by day depending on dashboard configurations.
   * 
   * @private
   * @returns {Promise<void>} Resolves when grouping lists are updated
   */
  async _fetchItems() {
    if (!this.hass) return;

    if (!this._processing) {
      this._processing = 'loading';
    }

    try {
      const maxDays = this.config.max_days !== undefined && this.config.max_days !== null && this.config.max_days !== '' ? parseInt(this.config.max_days) : null;

      const entities = this.config.entities || (this.config.entity ? [this.config.entity] : []);
      const dataManager = new TaskDataManager(this.hass);
      let allItems = await dataManager.fetchTasks(entities);

      if (maxDays !== null) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + maxDays);
        cutoff.setHours(23, 59, 59, 999);

        allItems = allItems.filter(item => {
          if (maxDays !== null && item.due) return new Date(item.due) <= cutoff;
          return true;
        });
      }

      const taskObjects = allItems.map(item => new Task(item, this.config));

      taskObjects.sort((a, b) => {
        if (a.due === b.due) return 0;
        if (!a.due) return -1;
        if (!b.due) return 1;
        return a.due < b.due ? -1 : 1;
      });

      const groups = [];

      if (this.config.merge_tasks_same_day) {
        taskObjects.forEach(task => {
          const taskDate = task.due ? (task.due.length > 10 ? task.due.substring(0, 10) : task.due) : 'no-date';
          if (groups.length > 0 && groups[groups.length - 1].date === taskDate) {
            groups[groups.length - 1].tasks.push(task);
          } else {
            groups.push(new Day(taskDate, [task]));
          }
        });
      } else {
        taskObjects.forEach(task => {
          const taskDate = task.due ? (task.due.length > 10 ? task.due.substring(0, 10) : task.due) : 'no-date';
          groups.push(new Day(taskDate, [task]));
        });
      }
      this._groups = groups;
    } catch (e) {
      console.error("Error fetching tasks:", e);
    } finally {
      if (this._processing === 'loading') {
        this._processing = null;
      }
    }
  }

  /**
   * Helper utility calculating ISO year and calendar week number for week-separator grouping mode.
   * 
   * @param {Date} date - Input date object
   * @private
   * @returns {string} Date week sequence string (e.g. '2026-24')
   */
  _getWeek(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const year = d.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${year}-${week}`;
  }

  /**
   * Evaluates separator conditions between contiguous task group day nodes.
   * 
   * @param {string} lastDate - Date string of the previous task day group
   * @param {string} taskDate - Date string of the current task day group
   * @private
   * @returns {boolean} True if a separator should be injected, false otherwise
   */
  _shouldShowSeparator(lastDate, taskDate) {
    if (!this.config.day_separator_color || !lastDate || lastDate === taskDate) {
      return false;
    }
    const mode = this.config.separator_mode || 'day';
    if (lastDate === 'no-date' || taskDate === 'no-date') {
      return true;
    } else if (mode === 'day') {
      return true;
    } else if (mode === 'month') {
      return lastDate.substring(0, 7) !== taskDate.substring(0, 7);
    } else if (mode === 'week') {
      const d1 = new Date(lastDate);
      const d2 = new Date(taskDate);
      return this._getWeek(d1) !== this._getWeek(d2);
    }
    return false;
  }

  /**
   * Renders the custom card's HTML template.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.config || !this.hass) return html``;

    let lastDate = null;
    const groups = this._groups || [];
    const isLoading = !!this._processing;

    return html`
      ${this.renderStyle('task-list-card.css')}
      <ha-card>
        ${this.config.title ? html`
          <div class="header-row">
            <div class="header-title">
              ${this.config.icon ? html`<ha-icon class="header-icon" icon="${this.config.icon}"></ha-icon>` : ""}
              ${this.config.title}
            </div>
          </div>
        ` : ""}
        <div class="task-list-wrapper">
          <div class="task-list">
            ${groups.map((group) => {
        if (!group.isVisible) return html``;
        const taskDate = group.date;
        const daySeparator = this._shouldShowSeparator(lastDate, taskDate)
          ? html`<div class="day-separator" style="border-top-color: ${this.config.day_separator_color};"></div>`
          : html``;
        lastDate = taskDate;

        return html`
                ${daySeparator}
                <task-list-card-row
                  .hass=${this.hass}
                  .config=${this.config}
                  .day=${group}
                  .readonly=${isLoading}
                  @toggle-task=${(e) => this._toggleTask(e.detail.task)}
                ></task-list-card-row>
              `;
      })}
            ${(!isLoading && groups.length === 0) ? html`<div class="task-row">${this._localize('no_tasks')}</div>` : ''}
          </div>
          ${isLoading ? html`
            <div class="loading-overlay">
              <ha-icon icon="mdi:loading" class="spinning"></ha-icon>
            </div>
          ` : ''}
        </div>
      </ha-card>
          ${this.config.show_delete_completed_button ? html`
          <ha-card>
            <div class="tile-button ${isLoading ? 'disabled' : ''}" @click="${() => this._deleteCompletedTasks()}">
              <div class="tile-icon-container">
                <ha-icon icon="${this._processing === 'delete' ? 'mdi:refresh' : 'mdi:delete-sweep'}" class="${this._processing === 'delete' ? 'spinning' : ''}"></ha-icon>
              </div>
              <div class="tile-info">
                <span class="tile-name">${this._localize('delete_completed')}</span>
                <span class="tile-state">${this._localize('delete_completed_desc')}</span>
              </div>
            </div>
          </ha-card>
          ` : ''}
          ${this.config.show_refresh_button ? html`
          <ha-card>
            <div class="tile-button ${isLoading ? 'disabled' : ''}" @click="${() => this.updateTodos()}">
              <div class="tile-icon-container">
                <ha-icon icon="mdi:refresh" class="${this._processing === 'refresh' ? 'spinning' : ''}"></ha-icon>
              </div>
              <div class="tile-info">
                <span class="tile-name">${this._localize('refresh')}</span>
                <span class="tile-state">${this._localize('refresh_desc')}</span>
              </div>
            </div>
          </ha-card>
          ` : ''}
    `;
  }

  /**
   * Reloads the config entry for todo helper integration, triggering fresh syncs.
   * 
   * @async
   * @returns {Promise<void>} Resolves when reloading concludes
   */
  async updateTodos() {
    if (!this.hass || this._processing) return;
    this._processing = 'refresh';
    this.requestUpdate();

    const entityIds = this._getEntities();
    if (entityIds.length === 0) {
      this._processing = null;
      this.requestUpdate();
      return;
    }

    try {
      try {
        await this.hass.callService("homeassistant", "reload_config_entry", {
          entity_id: entityIds
        });
      } catch (e) {
        console.warn("Could not reload config entry for todo entities:", e);
      }
      await this._fetchItems();
    } catch (e) {
      console.error("Error updating todo entities", e);
    } finally {
      this._processing = null;
      this.requestUpdate();
    }
  }

  /**
   * Bulk-removes completed tasks from target lists, calling todo service APIs.
   * 
   * @async
   * @returns {Promise<void>} Resolves when deletion sequence concludes
   * @private
   */
  async _deleteCompletedTasks() {
    if (!this.hass || this._processing) return;
    this._processing = 'delete';
    this.requestUpdate();

    const entityIds = this._getEntities();
    if (entityIds.length === 0) {
      this._processing = null;
      this.requestUpdate();
      return;
    }

    try {
      await this.hass.callService("todo", "remove_completed_items", {
        entity_id: entityIds
      });
      try {
        await this.hass.callService("homeassistant", "reload_config_entry", {
          entity_id: entityIds
        });
      } catch (e) {
        console.warn("Could not reload config entry after removing completed items:", e);
      }
      await this._fetchItems();
    } catch (e) {
      console.error("Error deleting completed tasks", e);
    } finally {
      this._processing = null;
      this.requestUpdate();
    }
  }

  /**
   * Asynchronously toggles a task completion status (between 'needs_action' and 'completed').
   * Supports block_future_toggles checking to prevent ticking tasks scheduled ahead.
   * Updates matching child visual rows and dispatches update_item service calls.
   * 
   * @param {Task} task - The task data transfer object being toggled
   * @async
   * @private
   */
  async _toggleTask(task) {
    if (this._processing) return;
    const blockFuture = String(this.config.block_future_toggles) !== 'false';
    if (blockFuture && task.isFuture) return;
    this._toggledItems.push({ uid: task.uid, entity_id: task.entity_id });
    const oldStatus = task.status;
    const newStatus = task.status === 'completed' ? 'needs_action' : 'completed';

    const wasVisible = task.isVisible;
    task.status = newStatus;
    const isVisible = task.isVisible;

    // Always update the specific row and item to ensure UI reflects state change
    const rows = this.shadowRoot.querySelectorAll('task-list-card-row');
    for (const row of rows) {
      if (row.day && row.day.tasks.includes(task)) {
        row.updateTask(task);
        break;
      }
    }

    // Only re-render the whole card if visibility changed (e.g. item needs to be hidden/shown)
    if (wasVisible !== isVisible) {
      this.requestUpdate();
    }

    try {
      await this.hass.callService("todo", "update_item", {
        entity_id: task.entity_id,
        item: task.uid,
        status: newStatus
      });
    } catch (e) {
      console.error("Error updating task status", e);
      task.status = oldStatus;
      this.requestUpdate();
    }
  }
}

customElements.define("task-list-card", TaskListCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "task-list-card",
  name: "Task List Card",
  description: "This card will display tasks from a todo list entity, allowing you to see due dates and mark tasks as completed.",
  preview: true
});