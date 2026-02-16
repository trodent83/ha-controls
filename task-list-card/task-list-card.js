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
      entity: "todo.shopping_list"
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
        date_separator_color: 'transparent',
        ...config
    };
    this._items = [];
    this._fetchItems();
  }

  updated(changedProps) {
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass");
      const entities = this._getEntities();
      if (oldHass) {
        const changed = entities.some(entity => oldHass.states[entity] !== this.hass.states[entity]);
        if (changed) {
          this._fetchItems();
        }
      } else {
        this._fetchItems();
      }
    }
  }

  _getEntities() {
    if (this.config.entities) return this.config.entities;
    if (this.config.entity) return [this.config.entity];
    return [];
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
        const items = response.items.map(item => ({ ...item, entity_id }));
        allItems = allItems.concat(items);
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

  _getDueDateColor(task) {
    if (!task.due || task.status === 'completed') return undefined;

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
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

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

  render() {
    if (!this.config || !this.hass) return html``;

    return html`
      <link rel="stylesheet" href="/local/ha-controls/task-list-card/task-list-card.css?v=0.1.3">
      <ha-card>
        <div class="task-list">
          ${this._items.map((task) => {
            const done = task.status === 'completed';
            const dateParts = this._formatDate(task.due);
            const dateColor = this._getDueDateColor(task);
            const separatorColor = this.config.date_separator_color || 'transparent';
            const dateStyle = `${dateColor ? `color: ${dateColor};` : ''} border-right-color: ${separatorColor};`;
            return html`
              <div class="task-row ${done ? 'done' : ''}" @click="${() => this._toggleTask(task)}">
                ${this.config.show_due_date ? (dateParts ? html`
                    <div class="task-date" style="${dateStyle}">
                        <div class="weekday">${dateParts.weekday}</div>
                        <div class="day">${dateParts.day}</div>
                        <div class="month">${dateParts.month}</div>
                    </div>
                ` : html`<div class="task-date empty" style="border-right-color: ${separatorColor};"></div>`) : ''}
                <span class="task-name">${task.summary}</span>
              </div>
            `;
          })}
          ${this._items.length === 0 ? html`<div class="task-row">No tasks</div>` : ''}
        </div>
      </ha-card>
    `;
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