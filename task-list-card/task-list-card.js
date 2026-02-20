const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

class TaskListCard extends LitElement {
  static get properties() {
    return { hass: {}, config: {}, _items: { state: true } };
  }

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
    this._items = [];
    this._fetchItems();
  }

  _debounceTimer;

  updated(changedProps) {
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
    }, 250);
  }

  _getEntities() {
    return (this.config.entities || (this.config.entity ? [this.config.entity] : []))
      .map(e => (typeof e === 'object' ? e.entity : e));
  }

  async _fetchItems() {
    if (!this.hass) return;

    const entities = this._getEntities();
    let allItems = [];
    for (const entity_id of entities) {
      if (!this.hass.states[entity_id]) continue;
      try {
        const response = await this.hass.callWS({
          type: "todo/item/list",
          entity_id
        });
        if (response && response.items) {
          const items = response.items.map(item => ({ ...item, entity_id }));
          allItems = allItems.concat(items);
        }
      } catch (e) {
        console.error("Error fetching items for", entity_id, e);
      }
    }

    const maxDays = this.config.max_days !== undefined && this.config.max_days !== null && this.config.max_days !== '' ? parseInt(this.config.max_days) : null;
    const showNoDueDate = this.config.show_no_due_date !== false;
    const showCompleted = this.config.show_completed !== false;

    if (maxDays !== null || !showNoDueDate || !showCompleted) {
      const cutoff = new Date();
      if (maxDays !== null) {
        cutoff.setDate(cutoff.getDate() + maxDays);
        cutoff.setHours(23, 59, 59, 999);
      }

      allItems = allItems.filter(item => {
        if (!showCompleted && item.status === 'completed') return false;
        if (!item.due) return showNoDueDate;
        if (maxDays !== null) return new Date(item.due) <= cutoff;
        return true;
      });
    }

    allItems.sort((a, b) => {
      if (a.due === b.due) return 0;
      if (!a.due) return -1;
      if (!b.due) return 1;
      return a.due < b.due ? -1 : 1;
    });
    this._items = allItems;
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

  render() {
    if (!this.config || !this.hass) return html``;

    let lastDate = null;
    const groups = [];

    if (this.config.merge_tasks_same_day) {
      this._items.forEach(task => {
        const taskDate = task.due ? (task.due.length > 10 ? task.due.substring(0, 10) : task.due) : 'no-date';
        if (groups.length > 0 && groups[groups.length - 1].date === taskDate) {
          groups[groups.length - 1].tasks.push(task);
        } else {
          groups.push({ date: taskDate, tasks: [task] });
        }
      });
    } else {
      this._items.forEach(task => {
        const taskDate = task.due ? (task.due.length > 10 ? task.due.substring(0, 10) : task.due) : 'no-date';
        groups.push({ date: taskDate, tasks: [task] });
      });
    }

    const taskCount = groups.reduce((total, group) => total + group.tasks.length, 0);

    return html`
      <link rel="stylesheet" href="/local/ha-controls/task-list-card/task-list-card.css">
      <ha-card>
        ${this.config.title ? html`
          <div class="header-row">
            <div class="header-title">
              ${this.config.icon ? html`<ha-icon class="header-icon" icon="${this.config.icon}"></ha-icon>` : ""}
              ${this.config.title}
            </div>
            ${taskCount > 0 ? html`
              <div class="task-count-badge">
                <ha-icon icon="mdi:calendar-check-outline"></ha-icon>
                <span>${taskCount}</span>
              </div>
            ` : ""}
          </div>
        ` : ""}
        <div class="task-list">
          ${groups.map((group) => {
      let daySeparator = html``;
      const taskDate = group.date;
      if (this.config.day_separator_color && lastDate && lastDate !== taskDate) {
        let showSeparator = false;
        const mode = this.config.separator_mode || 'day';
        if (lastDate === 'no-date' || taskDate === 'no-date') {
          showSeparator = true;
        } else if (mode === 'day') {
          showSeparator = true;
        } else if (mode === 'month') {
          showSeparator = lastDate.substring(0, 7) !== taskDate.substring(0, 7);
        } else if (mode === 'week') {
          const d1 = new Date(lastDate);
          const d2 = new Date(taskDate);
          showSeparator = this._getWeek(d1) !== this._getWeek(d2);
        }
        if (showSeparator) {
          daySeparator = html`<div class="day-separator" style="border-top-color: ${this.config.day_separator_color};"></div>`;
        }
      }
      lastDate = taskDate;

      return html`
              ${daySeparator}
              <task-list-card-row
                .hass=${this.hass}
                .config=${this.config}
                .tasks=${group.tasks}
                @toggle-task=${(e) => this._toggleTask(e.detail.task)}
              ></task-list-card-row>
            `;
    })}
          ${this._items.length === 0 ? html`<div class="task-row">No tasks</div>` : ''}
        </div>
      </ha-card>
          ${this.config.show_delete_completed_button ? html`
          <ha-card>
            <div class="tile-button" @click="${() => this._deleteCompletedTasks()}">
              <div class="tile-icon-container">
                <ha-icon icon="mdi:delete-sweep"></ha-icon>
              </div>
              <div class="tile-info">
                <span class="tile-name">Delete Completed</span>
                <span class="tile-state">Delete all completed tasks</span>
              </div>
            </div>
          </ha-card>
          ` : ''}
          ${this.config.show_refresh_button ? html`
          <ha-card>
            <div class="tile-button" @click="${() => this.updateTodos()}">
              <div class="tile-icon-container">
                <ha-icon icon="mdi:refresh"></ha-icon>
              </div>
              <div class="tile-info">
                <span class="tile-name">Refresh</span>
                <span class="tile-state">Update task list</span>
              </div>
            </div>
          </ha-card>
          ` : ''}
    `;
  }

  async updateTodos() {
    if (!this.hass) return;

    const entityIds = this._getEntities();
    if (entityIds.length === 0) return;

    try {
      await this.hass.callService("homeassistant", "reload_config_entry", {
        entity_id: entityIds
      });
    } catch (e) {
      console.error("Error updating todo entities", e);
    }
  }

  async _deleteCompletedTasks() {
    if (!this.hass) return;

    const entityIds = this._getEntities();
    if (entityIds.length === 0) return;

    try {
      await this.hass.callService("todo", "remove_completed_items", {
        entity_id: entityIds
      });
    } catch (e) {
      console.error("Error deleting completed tasks", e);
    }
  }

  _toggleTask(task) {
    const newStatus = task.status === 'completed' ? 'needs_action' : 'completed';
    this.hass.callService("todo", "update_item", {
      entity_id: task.entity_id,
      item: task.uid,
      status: newStatus
    });

    const showCompleted = this.config.show_completed !== false;

    if (!showCompleted && newStatus === 'completed') {
      this._items = this._items.filter(item => item.uid !== task.uid);
    } else {
      this._items = this._items.map(item => {
        if (item.uid === task.uid) {
          return { ...item, status: newStatus };
        }
        return item;
      });
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