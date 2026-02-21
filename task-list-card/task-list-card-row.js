const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

class TaskListCardRow extends LitElement {
  static get properties() {
    return {
      hass: { attribute: false },
      config: { attribute: false },
      day: { attribute: false },
      readonly: { type: Boolean }
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

  _getDueDateColor() {
    if (this.day.date === 'no-date' || this.day.allCompleted) return undefined;

    const diffDays = this.day.diffDays;

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

  updateTask(task) {
    this.requestUpdate();
    const items = this.querySelectorAll('task-list-card-item');
    for (const item of items) {
      if (item.task === task) {
        item.updateTask();
      }
    }
  }

  _toggleTask(task) {
    this.dispatchEvent(new CustomEvent('toggle-task', { detail: { task } }));
  }

  render() {
    if (!this.day || !this.config || !this.hass) return html``;

    const rowStyle = this.day.isVisible ? '' : 'display: none;';

    const dateParts = this._formatDate(this.day.date);
    const dateColor = this._getDueDateColor();
    const separatorColor = this.config.date_separator_color || 'transparent';
    const dateStyle = `${dateColor ? `color: ${dateColor};` : ''} border-right-color: ${separatorColor};`;

    let dueInDaysText = '';
    const diffDays = this.day.diffDays;

    if (diffDays !== null) {
      if (diffDays === 0) dueInDaysText = 'Today';
      else if (diffDays === 1) dueInDaysText = 'Tomorrow';
      else if (diffDays > 1) dueInDaysText = `Due in ${diffDays} days`;
      else if (diffDays === -1) dueInDaysText = 'Overdue by 1 day';
      else dueInDaysText = `Overdue by ${Math.abs(diffDays)} days`;
    }

    const tasks = this.day.tasks;
    const hasNextVisibleArray = new Array(tasks.length).fill(false);
    let nextTaskIsVisible = false;
    for (let i = tasks.length - 1; i >= 0; i--) {
      hasNextVisibleArray[i] = nextTaskIsVisible;
      if (tasks[i].isVisible) {
        nextTaskIsVisible = true;
      }
    }

    return html`
      <div class="task-row" style="${rowStyle}">
        ${this.config.show_due_date ? (dateParts ? html`
            <div class="task-date" style="${dateStyle}">
                <div class="weekday">${dateParts.weekday}</div>
                <div class="day">${dateParts.day}</div>
                <div class="month">${dateParts.month}</div>
            </div>
        ` : html`<div class="task-date empty" style="border-right-color: ${separatorColor};"></div>`) : ''}
        <div class="task-content">
          ${tasks.map((t, index) => {
            return html`
                <task-list-card-item
                  .hass=${this.hass}
                  .config=${this.config}
                  .task=${t}
                  .hasSeparator=${hasNextVisibleArray[index]}
                  .readonly=${this.readonly}
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