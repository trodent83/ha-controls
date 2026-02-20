const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

class TaskListCardRow extends LitElement {
  static get properties() {
    return {
      hass: { attribute: false },
      config: { attribute: false },
      tasks: { attribute: false }
    };
  }

  createRenderRoot() {
    return this;
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

  _toggleTask(task) {
    this.dispatchEvent(new CustomEvent('toggle-task', { detail: { task } }));
  }

  render() {
    if (!this.tasks || !this.config || !this.hass) return html``;

    const task = this.tasks[0];
    const dateParts = this._formatDate(task.due);
    const dateColor = this._getDueDateColor(task);
    const separatorColor = this.config.date_separator_color || 'transparent';
    const dateStyle = `${dateColor ? `color: ${dateColor};` : ''} border-right-color: ${separatorColor};`;

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
      <div class="task-row">
        ${this.config.show_due_date ? (dateParts ? html`
            <div class="task-date" style="${dateStyle}">
                <div class="weekday">${dateParts.weekday}</div>
                <div class="day">${dateParts.day}</div>
                <div class="month">${dateParts.month}</div>
            </div>
        ` : html`<div class="task-date empty" style="border-right-color: ${separatorColor};"></div>`) : ''}
        <div class="task-content">
          ${this.tasks.map((t, index) => {
            return html`
                <task-list-card-item
                  .hass=${this.hass}
                  .config=${this.config}
                  .task=${t}
                  .hasSeparator=${index < this.tasks.length - 1}
                  @toggle-task=${(e) => this._toggleTask(e.detail.task)}
                ></task-list-card-item>
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
  }
}
customElements.define("task-list-card-row", TaskListCardRow);