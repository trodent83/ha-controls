import { HAControlBase, html } from "../ha-control-base.js?v=0.6.8";

/**
 * Cache-busting version parameter for dynamic asset loading.
 * @type {string}
 */
const VERSION = "1.0.0";

/**
 * CalendarListCardRow
 * Renders a row container displaying a single calendar event.
 * Shows starting date on the left, details and features in the middle, and relative due indicator on the right.
 * 
 * @extends HAControlBase
 */
class CalendarListCardRow extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return {
      ...super.properties,
      config: { attribute: false },
      event: { attribute: false },
      color: { type: String },
      readonly: { type: Boolean }
    };
  }

  /**
   * Resolves the directory path hosting the translation localizations.
   * 
   * @type {string}
   */
  get translationPath() { return "/local/ha-controls/calendar-list-card/translations"; }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() { return VERSION; }

  /**
   * Returns this element directly as the render container, bypassing default Shadow DOM mounting.
   * This aligns layouts cleanly inside the parent flex grid.
   * 
   * @returns {HTMLElement} The root node to append rendered templates to
   */
  createRenderRoot() {
    return this;
  }

  /**
   * Calculates the difference in days between the event's start date and today.
   * 
   * @type {number|null}
   */
  get diffDays() {
    if (!this.event || !this.event.start) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(this.event.start.getFullYear(), this.event.start.getMonth(), this.event.start.getDate());
    const diffTime = eventDate - today;
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Formats start dates into short weekday, numeric day, and short month names.
   * 
   * @param {Date} date - Date object
   * @private
   * @returns {Object|null} Formatted date parts
   */
  _formatDate(date) {
    if (!date) return null;
    const locale = this.hass.locale || { language: 'en' };
    return {
      weekday: date.toLocaleDateString(locale.language, { weekday: 'short' }),
      day: date.toLocaleDateString(locale.language, { day: 'numeric' }),
      month: date.toLocaleDateString(locale.language, { month: 'short' })
    };
  }

  /**
   * Matches event start date distance against configured thresholds to resolve colors.
   * 
   * @private
   * @returns {string|undefined} Custom CSS color string, or undefined
   */
  _getDueDateColor() {
    if (!this.event || !this.event.start) return undefined;

    const diffDays = this.diffDays;
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
          case '<': return diffDays < days;
          case '<=': return diffDays <= days;
          case '>': return diffDays > days;
          case '>=': return diffDays >= days;
          default: return diffDays <= days;
        }
      });
      if (match) return match.color;
    }
    return this.config.default_due_date_color;
  }

  /**
   * Dispatches row clicks up to the parent card element to open the details dialog.
   * 
   * @private
   */
  _rowClicked() {
    this.dispatchEvent(new CustomEvent('event-click', {
      detail: { event: this.event },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Renders the row component.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.event || !this.config || !this.hass) return html``;

    const dateParts = this._formatDate(this.event.start);
    const dateColor = this._getDueDateColor();
    const separatorColor = this.config.date_separator_color || 'transparent';
    const dateStyle = `${dateColor ? `color: ${dateColor};` : ''} border-right-color: ${separatorColor};`;

    let dueInDaysText = '';
    const diffDays = this.diffDays;

    if (diffDays !== null) {
      if (diffDays === 0) dueInDaysText = this._localize('today');
      else if (diffDays === 1) dueInDaysText = this._localize('tomorrow');
      else if (diffDays > 1) dueInDaysText = this._localize('due_in_days', { days: diffDays });
      else if (diffDays === -1) dueInDaysText = this._localize('overdue_by_1_day');
      else dueInDaysText = this._localize('overdue_by_days', { days: Math.abs(diffDays) });
    }

    const stateObj = this.hass.states[this.event.entity_id];

    const showColorBadges = this.config.show_color_badges !== false;
    const badgeColorStyle = showColorBadges ? `border-left-color: ${this.color || 'var(--primary-color)'};` : '';

    return html`
      <div class="event-row ${showColorBadges ? 'has-badge' : ''}" style="${badgeColorStyle}" @click="${this._rowClicked}">
        ${this.config.show_due_date !== false ? (dateParts ? html`
            <div class="event-date" style="${dateStyle}">
                <div class="weekday">${dateParts.weekday}</div>
                <div class="day">${dateParts.day}</div>
                <div class="month">${dateParts.month}</div>
            </div>
        ` : html`<div class="event-date empty" style="border-right-color: ${separatorColor};"></div>`) : ''}
        
        <div class="event-content">
          <span class="event-name">${this.event.summary}</span>
          ${this.config.show_description && this.event.originEvent.description ? html`
            <span class="event-description">${this.event.originEvent.description}</span>
          ` : ''}
          ${this.config.show_source ? (() => {
            const entity = stateObj;
            if (!entity) return '';
            const style = this.config.source_color ? `--source-color: ${this.config.source_color}` : '';
            return html`
              <div class="event-source" style=${style}>
                <ha-icon icon="${entity.attributes.icon || 'mdi:calendar'}"></ha-icon>
                <span>${entity.attributes.friendly_name || this.event.entity_id}</span>
              </div>`;
          })() : ''}
          
          ${this.config.features && this.config.features.length > 0 ? html`
            <div class="event-features">
              ${this.config.features.map(f => html`
                <feature-renderer-card
                  .hass=${this.hass}
                  .config=${f}
                  .stateObj=${stateObj}
                  .event=${this.event}
                ></feature-renderer-card>
              `)}
            </div>
          ` : ''}
        </div>
        
        ${this.config.show_due_in_days && dueInDaysText ? html`
            <div class="event-due-in ${this.config.due_in_days_separator_color ? 'separator' : ''}" style="${this.config.due_in_days_separator_color ? `border-left-color: ${this.config.due_in_days_separator_color};` : ''}">
                ${dueInDaysText}
            </div>
        ` : ''}
      </div>
    `;
  }
}

if (!customElements.get("calendar-list-card-row")) {
  customElements.define("calendar-list-card-row", CalendarListCardRow);
}
