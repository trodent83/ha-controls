import { HAControlBase, html } from "../ha-control-base.js?v=0.5.1";

const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.2';

import { Task } from "./task-list-dto-task.js";
import { Day } from "./task-list-dto-day.js";

class TaskListCard extends HAControlBase {
  static get properties() {
    return { ...super.properties, config: {}, _groups: { state: true }, _processing: { state: true } };
  }

  get translationPath() { return "/local/ha-controls/task-list-card/translations"; }
  get translationVersion() { return VERSION; }

  static getConfigElement() {
    return document.createElement("task-list-card-editor");
  }

  static getStubConfig() {
    return {
      entity: "todo.shopping_list",
      icon: "mdi:calendar-check"
    };
  }

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
      ...config
    };
    this._groups = [];
    this._toggledItems = [];
    this._processing = null;
    this._fetchItems();
  }

  _debounceTimer;
  _toggledItems = [];

  shouldUpdate(changedProps) {
    if (!changedProps.has("hass")) {
      return true;
    }

    const entities = this._getEntities();
    let hasChanged = false;
    let ignoredCount = 0;
    let changeCount = 0;

    for (const entityId of entities) {
      const oldState = changedProps.get("hass")?.states[entityId];
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

    if (hasChanged && changeCount === ignoredCount) {
      return false;
    }

    return true;
  }

  updated(changedProps) {
    super.updated(changedProps);
    if (!changedProps.has("hass")) { return; }
    const entities = this._getEntities();
    let hasChanged = false;

    for (const entityId of entities) {
      const oldState = changedProps.get("hass")?.states[entityId];
      const newState = this.hass.states[entityId];

      if (!newState || ["unavailable", "unknown"].includes(newState.state)) {
        return;
      }

      if (!hasChanged && (!oldState || oldState.last_updated !== newState?.last_updated)) {
        hasChanged = true;
      }
    }

    if (!hasChanged) { return; }
    clearTimeout(this._debounceTimer);

    this._debounceTimer = setTimeout(() => {
      this._fetchItems();
      console.groupEnd();
    }, 500);
  }

  _getEntities() {
    return (this.config.entities || (this.config.entity ? [this.config.entity] : []))
      .map(e => (typeof e === 'object' ? e.entity : e));
  }

  async *_fetchItemsGenerator() {
    if (!this.hass) return;

    const entities = this.config.entities || (this.config.entity ? [this.config.entity] : []);
    for (const entityConf of entities) {
      const entity_id = typeof entityConf === 'object' ? entityConf.entity : entityConf;
      if (!this.hass.states[entity_id]) continue;
      try {
        const response = await this.hass.callWS({
          type: "todo/item/list",
          entity_id
        });
        if (response && response.items) {
          let items = response.items;
          if (typeof entityConf === 'object') {
            const filters = [];
            if (entityConf.filters) {
              filters.push(...entityConf.filters);
            }
            if (entityConf.filter) {
              filters.push({ pattern: entityConf.filter, case_sensitive: entityConf.case_sensitive });
            }

            if (filters.length > 0) {
              items = items.filter(item => {
                return !filters.some(filter => {
                  if (!filter || !filter.pattern) return false;
                  try {
                    const flags = filter.case_sensitive === false ? 'i' : '';
                    return new RegExp(filter.pattern, flags).test(item.summary || '');
                  } catch (e) {
                    console.warn(`Invalid regex filter for ${entity_id}: ${filter.pattern}`);
                    return false;
                  }
                });
              });
            }
          }
          yield items.map(item => ({ ...item, entity_id }));
        }
      } catch (e) {
        console.error("Error fetching items for", entity_id, e);
      }
    }
  }

  async _fetchItems() {
    let allItems = [];
    for await (const items of this._fetchItemsGenerator()) {
      allItems = allItems.concat(items);
    }

    const maxDays = this.config.max_days !== undefined && this.config.max_days !== null && this.config.max_days !== '' ? parseInt(this.config.max_days) : null;

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
  }

  _getWeek(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const year = d.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${year}-${week}`;
  }

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

  render() {
    if (!this.config || !this.hass) return html``;

    let lastDate = null;
    const groups = this._groups || [];

    return html`
      <link rel="stylesheet" href="/local/ha-controls/task-list-card/task-list-card.css?v=${VERSION}">
      <style>
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      </style>
      <ha-card>
        ${this.config.title ? html`
          <div class="header-row">
            <div class="header-title">
              ${this.config.icon ? html`<ha-icon class="header-icon" icon="${this.config.icon}"></ha-icon>` : ""}
              ${this.config.title}
            </div>
          </div>
        ` : ""}
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
                .readonly=${!!this._processing}
                @toggle-task=${(e) => this._toggleTask(e.detail.task)}
              ></task-list-card-row>
            `;
    })}
          ${groups.length === 0 ? html`<div class="task-row">${this._localize('no_tasks')}</div>` : ''}
        </div>
      </ha-card>
          ${this.config.show_delete_completed_button ? html`
          <ha-card>
            <div class="tile-button" @click="${() => this._deleteCompletedTasks()}">
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
            <div class="tile-button" @click="${() => this.updateTodos()}">
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
      await this.hass.callService("homeassistant", "reload_config_entry", {
        entity_id: entityIds
      });
    } catch (e) {
      console.error("Error updating todo entities", e);
    } finally {
      this._processing = null;
      this.requestUpdate();
    }
  }

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
      await this.hass.callService("homeassistant", "reload_config_entry", {
        entity_id: entityIds
      });
    } catch (e) {
      console.error("Error deleting completed tasks", e);
    } finally {
      this._processing = null;
      this.requestUpdate();
    }
  }

  async _toggleTask(task) {
    if (this._processing) return;
    this._toggledItems.push({ uid: task.uid, entity_id: task.entity_id });
    const oldStatus = task.status;
    const newStatus = task.status === 'completed' ? 'needs_action' : 'completed';

    const wasVisible = task.isVisible;
    task.status = newStatus;
    const isVisible = task.isVisible;

    // Always update the specific row and item to ensure UI reflects state change
    // (Lit might skip update if object reference 'day' hasn't changed)
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