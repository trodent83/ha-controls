import { HAControlBase, html } from "../ha-control-base.js?v=0.6.8";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.2';

/**
 * TaskListCardRow
 * Renders a row container grouping tasks due on the same calendar day.
 * Renders without shadow DOM to align layouts cleanly inside parent containers.
 * Manages date label localization formatting, state threshold colors, and due descriptors.
 * 
 * @extends HAControlBase
 */
class TaskListCardRow extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Tracks config configuration, active day data object, and readonly indicators.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return {
      ...super.properties,
      config: { attribute: false },
      day: { attribute: false },
      readonly: { type: Boolean }
    };
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
   * Returns this element directly as the render container, bypasses default Shadow DOM mounting.
   * 
   * @returns {HTMLElement} The root node to append rendered templates to
   */
  createRenderRoot() {
    return this;
  }

  /**
   * Formats task group due dates into short weekday, numeric day, and short month names
   * according to user regional language preferences in Home Assistant.
   * 
   * @param {string} dateStr - Date string (e.g. '2026-06-14')
   * @private
   * @returns {Object|null} Dictionary containing weekday, day, and month strings, or null if invalid
   */
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

  /**
   * Matches this row's due date relative distance (diffDays) against configured operator-value thresholds,
   * returning matching hex/RGB custom colors.
   * 
   * @private
   * @returns {string|undefined} Hex/RGB CSS color string, or undefined if no rule matches
   */
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

  /**
   * Triggers element updates and propagates redraw commands down to child task elements.
   * 
   * @param {Task} task - The specific task data transfer object modified
   */
  updateTask(task) {
    this.requestUpdate();
    const items = this.querySelectorAll('task-list-card-item');
    for (const item of items) {
      if (item.task === task) {
        item.updateTask();
      }
    }
  }

  /**
   * Dispatches task status toggles up to the parent card element.
   * 
   * @param {Task} task - Task toggled
   * @private
   */
  _toggleTask(task) {
    this.dispatchEvent(new CustomEvent('toggle-task', { detail: { task } }));
  }

  /**
   * Renders the custom card row HTML template.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
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
      if (diffDays === 0) dueInDaysText = this._localize('today');
      else if (diffDays === 1) dueInDaysText = this._localize('tomorrow');
      else if (diffDays > 1) dueInDaysText = this._localize('due_in_days', { days: diffDays });
      else if (diffDays === -1) dueInDaysText = this._localize('overdue_by_1_day');
      else dueInDaysText = this._localize('overdue_by_days', { days: Math.abs(diffDays) });
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