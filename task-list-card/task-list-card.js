const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

class TaskListCard extends LitElement {
  static get properties() {
    return { hass: {}, config: {}, _items: { state: true }, _isLoading: { state: true }, _loadingAction: { state: true } };
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
    this._loadingAction = null;
    this._fetchItems();
  }

  _debounceTimer;

  updated(changedProps) {
    if (changedProps.has("hass")) {
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

      if (hasChanged) {
        clearTimeout(this._debounceTimer);

        this._debounceTimer = setTimeout(() => {
          console.groupCollapsed("fetching");
          console.log("Fetch");
          this._fetchItems();
          console.groupEnd();
        }, 100);
      }
    }
  }

  _getEntities() {
    return (this.config.entities || (this.config.entity ? [this.config.entity] : []))
      .map(e => (typeof e === 'object' ? e.entity : e));
  }

  async _fetchItems() {
    if (!this.hass) return;
    this._isLoading = true;
    this._loadingAction = 'refresh';
    try {
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
    } finally {
      this._isLoading = false;
      this._loadingAction = null;
    }
  }

  _formatDate(dateStr) {
    if (!dateStr) return null;
    let date;
    if (dateStr.length === 10) {
      const [year, month, day] = dateStr.split('-').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(dateStr);
    }
    if (isNaN(date.getTime())) return null;

    const locale = this.hass.locale || { language: 'en' };
    return {
      weekday: date.toLocaleDateString(locale.language, { weekday: 'short' }),
      day: date.toLocaleDateString(locale.language, { day: 'numeric' }),
      month: date.toLocaleDateString(locale.language, { month: 'short' })
    };
  }

  _getDiffDays(task) {
    if (!task.due) return null;
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    let taskDate;
    if (task.due.length === 10) {
      const [year, month, day] = task.due.split('-').map(Number);
      taskDate = new Date(Date.UTC(year, month - 1, day));
    } else {
      const d = new Date(task.due);
      taskDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    const diffTime = taskDate - today;
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  _getDueDateColor(task) {
    if (!task.due || task.status === 'completed') return undefined;

    const diffDays = this._getDiffDays(task);

    const colors = this.config.due_date_colors;
    if (colors && colors.length) {
      const sortedColors = [...colors].sort((a, b) => a.days - b.days);
      const match = sortedColors.find(rule => {
        const operator = rule.operator || '<=';
        const days = parseInt(rule.days);
        switch (operator) {
          case '==':
          case '=': return diffDays === days;
          case '!=':
          case '<>': return diffDays !== days;
          case '&lt;':
          case '<': return diffDays < days;
          case '&lt;=':
          case '<=': return diffDays <= days;
          case '&gt;':
          case '>': return diffDays > days;
          case '&gt;=':
          case '>=': return diffDays >= days;
          default: return diffDays <= days;
        }
      });
      if (match) return match.color;
    }
    return this.config.default_due_date_color;
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
      <link rel="stylesheet" href="/local/ha-controls/task-list-card/task-list-card.css?v=0.1.19">
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
      const task = group.tasks[0];
      const dateParts = this._formatDate(task.due);
      const dateColor = this._getDueDateColor(task);
      const separatorColor = this.config.date_separator_color || 'transparent';
      const dateStyle = `${dateColor ? `color: ${dateColor};` : ''} border-right-color: ${separatorColor};`;

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

      let dueInDaysText = '';
      const diffDays = this._getDiffDays(task);
      if (diffDays !== null) {
        if (diffDays === 0) dueInDaysText = 'Today';
        else if (diffDays === 1) dueInDaysText = 'Tomorrow';
        else if (diffDays > 1) dueInDaysText = `Due in ${diffDays} days`;
        else if (diffDays === -1) dueInDaysText = 'Overdue by 1 day';
        else dueInDaysText = `Overdue by ${Math.abs(diffDays)} days`;
      }

      return html`
              ${daySeparator}
              <div class="task-row">
                ${this.config.show_due_date ? (dateParts ? html`
                    <div class="task-date" style="${dateStyle}">
                        <div class="weekday">${dateParts.weekday}</div>
                        <div class="day">${dateParts.day}</div>
                        <div class="month">${dateParts.month}</div>
                    </div>
                ` : html`<div class="task-date empty" style="border-right-color: ${separatorColor};"></div>`) : ''}
                <div class="task-content">
                  ${group.tasks.map((t, index) => {
        const done = t.status === 'completed';
        const separatorColor = this.config.merged_tasks_separator_color || 'var(--divider-color)';
        const hasSeparator = index < group.tasks.length - 1;
        const separatorClass = hasSeparator ? 'task-item-separator' : '';
        const separatorStyle = hasSeparator ? `border-bottom-color: ${separatorColor};` : '';
        return html`
                        <div class="task-item ${done ? 'done' : ''} ${separatorClass}" @click="${() => this._toggleTask(t)}" style="${separatorStyle}">
                            <span class="task-name">${t.summary}</span>
                            ${this.config.show_description && t.description ? html`<span class="task-description">${t.description}</span>` : ''}
                            ${this.config.show_source ? (() => {
            const entity = this.hass.states[t.entity_id];
            if (!entity) return '';
            const style = this.config.source_color ? `--source-color: ${this.config.source_color}` : '';
            return html`
                                    <div class="task-source" style=${style}>
                                        <ha-icon
                                            icon="${entity.attributes.icon || 'mdi:checkbox-marked-circle-outline'}"></ha-icon>
                                        <span>${entity.attributes.friendly_name || t.entity_id}</span>
                                    </div>
                                `;
          })() : ''}
                        </div>
                      `;
      })}
                </div>
                ${this.config.show_due_in_days && dueInDaysText ? html`
                    <div class="task-due-in ${this.config.due_in_days_separator_color ? 'separator' : ''}" style="${this.config.due_in_days_separator_color ? `border-left-color: ${this.config.due_in_days_separator_color};` : ''}">
                        ${dueInDaysText}
                    </div>
                ` : ''}
              </div>
            `;
    })}
          ${this._items.length === 0 ? html`<div class="task-row">No tasks</div>` : ''}
        </div>
      </ha-card>
          ${this.config.show_delete_completed_button ? html`
          <ha-card>
            <div class="tile-button ${this._isLoading ? 'disabled' : ''}" @click="${() => this._deleteCompletedTasks()}">
              <div class="tile-icon-container">
                ${this._isLoading && this._loadingAction === 'delete' ? html`<ha-circular-progress active size="small"></ha-circular-progress>` : html`<ha-icon icon="mdi:delete-sweep"></ha-icon>`}
              </div>
              <div class="tile-info">
                <span class="tile-name">Delete Completed</span>
                <span class="tile-state">${this._isLoading && this._loadingAction === 'delete' ? 'Deleting...' : 'Delete all completed tasks'}</span>
              </div>
            </div>
          </ha-card>
          ` : ''}
          ${this.config.show_refresh_button ? html`
          <ha-card>
            <div class="tile-button ${this._isLoading ? 'disabled' : ''}" @click="${() => this.updateTodos()}">
              <div class="tile-icon-container">
                ${this._isLoading && this._loadingAction === 'refresh' ? html`<ha-circular-progress active size="small"></ha-circular-progress>` : html`<ha-icon icon="mdi:refresh"></ha-icon>`}
              </div>
              <div class="tile-info">
                <span class="tile-name">Refresh</span>
                <span class="tile-state">${this._isLoading && this._loadingAction === 'refresh' ? 'Updating...' : 'Update task list'}</span>
              </div>
            </div>
          </ha-card>
          ` : ''}
    `;
  }

  async updateTodos() {
    if (!this.hass || this._isLoading) return;
    this._isLoading = true;
    this._loadingAction = 'refresh';

    const entityIds = this._getEntities();
    if (entityIds.length === 0) return;

    // Erzwingt ein Update der Entitäten im Hintergrund
    try {
      await this.hass.callService("homeassistant", "reload_config_entry", {
        entity_id: entityIds
      });
    } catch (e) {
      console.error("Error updating todo entities", e);
    } finally {
      this._isLoading = false;
      this._loadingAction = null;
    }
  }

  async _deleteCompletedTasks() {
    if (!this.hass || this._isLoading) return;
    this._isLoading = true;
    this._loadingAction = 'delete';

    const entityIds = this._getEntities();
    if (entityIds.length === 0) return;

    try {
      await this.hass.callService("todo", "remove_completed_items", {
        entity_id: entityIds
      });
    } catch (e) {
      console.error("Error deleting completed tasks", e);
    } finally {
      this._isLoading = false;
      this._loadingAction = null;
    }
  }

  _toggleTask(task) {
    const newStatus = task.status === 'completed' ? 'needs_action' : 'completed';
    this.hass.callService("todo", "update_item", {
      entity_id: task.entity_id,
      item: task.uid,
      status: newStatus
    });
  }
}

customElements.define("task-list-card", TaskListCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "task-list-card",
  name: "Task List Card",
  description: "A simple task list card.",
  preview: true
});