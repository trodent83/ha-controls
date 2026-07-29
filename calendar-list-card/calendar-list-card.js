import { HAControlBase, html } from "../ha-control-base.js?v=0.6.9";
import { parseHtml } from "../utilities/html-parser.js?v=1.0.0";
import { CalendarDataManager } from "../utilities/calendar/calendar-data-manager.js?v=0.4.36";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.1';

/**
 * CalendarListCard
 * A custom Home Assistant Lovelace dashboard card that fetches and displays calendar events in a list format,
 * similar to the task list card but specifically designed for calendar schedules.
 * Supports custom date operators, custom features rendering inside event rows, and premium info popup details.
 * 
 * @extends HAControlBase
 */
class CalendarListCard extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return {
      ...super.properties,
      config: {},
      _events: { state: true },
      _fetching: { state: true },
      _selectedEvent: { state: true }
    };
  }

  constructor() {
    super();
    this._events = [];
    this._fetching = false;
    this._selectedEvent = null;
    this._fetchTimer = null;
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
   * Creates and returns the configuration editor element for this card.
   * Home Assistant Lovelace visual editor links to this method.
   * 
   * @static
   * @returns {HTMLElement} The calendar-list-card-editor configuration element
   */
  static getConfigElement() {
    return document.createElement("calendar-list-card-editor");
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
      entities: [],
      icon: "mdi:calendar-multiselect",
      max_days: 7,
      show_due_date: true,
      show_due_in_days: true,
      show_source: true,
      features: [
        {
          type: "custom:calendar-property-feature",
          property: "time"
        }
      ]
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
      throw new Error("Please define calendar entity/entities");
    }
    this.config = {
      show_due_date: true,
      show_due_in_days: true,
      show_description: false,
      show_source: false,
      show_refresh_button: false,
      show_finished_events: true,
      max_days: 7,
      max_items: '',
      icon: 'mdi:calendar-multiselect',
      default_due_date_color: '',
      date_separator_color: 'transparent',
      day_separator_color: '',
      due_in_days_separator_color: '',
      source_color: '',
      separator_mode: 'day',
      features: [],
      ...config
    };
    this._events = [];
    this._selectedEvent = null;
    this._checkAndFetch();
  }

  /**
   * LitElement lifecycle hook. Destroys debounced fetch timers to prevent memory leaks.
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._fetchTimer) {
      clearTimeout(this._fetchTimer);
    }
  }

  /**
   * Controls when the element should re-render to optimize dashboard performance.
   * Only returns true if configured entities actually change state or key properties modify.
   * 
   * @param {Map<string, any>} changedProps - Map of properties that changed in this cycle
   * @returns {boolean} True if the card should re-render, false otherwise
   */
  shouldUpdate(changedProps) {
    if (changedProps.has('_events') ||
      changedProps.has('_fetching') ||
      changedProps.has('_selectedEvent') ||
      changedProps.has('config') ||
      changedProps.has('_strings')) {
      return true;
    }

    // Only re-render on hass changes if a calendar entity state has changed
    if (changedProps.has('hass')) {
      const oldHass = changedProps.get('hass');
      if (!oldHass || !this.config) return true;
      const entities = this._getEntities();
      return entities.some(id => this.hass.states[id] !== oldHass.states[id]);
    }

    return super.shouldUpdate(changedProps);
  }

  /**
   * LitElement lifecycle trigger. Captures calendar updates and triggers debounced item refetches.
   * 
   * @param {Map<string, any>} changedProps - Map of properties that changed in this cycle
   */
  updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has('config')) {
      this._checkAndFetch();
      return;
    }
    if (changedProps.has('hass')) {
      const oldHass = changedProps.get('hass');
      if (!oldHass) {
        // First hass assignment
        this._checkAndFetch();
        return;
      }
      const entities = this._getEntities();
      const entityChanged = entities.some(id => this.hass.states[id] !== oldHass.states[id]);
      if (entityChanged) this._checkAndFetch();
    }
  }

  /**
   * Helper parsing entities from configured target entity or custom entities array.
   * 
   * @private
   * @returns {Array<string>} List of calendar entity IDs
   */
  _getEntities() {
    return (this.config.entities || (this.config.entity ? [this.config.entity] : []))
      .map(e => (typeof e === 'object' ? e.entity : e));
  }

  /**
   * Schedules a fetch operation. Sets debounced timeouts to avoid thrashing endpoints.
   * 
   * @private
   */
  _checkAndFetch() {
    if (!this.hass || !this.config) return;

    if (this._fetchTimer) {
      clearTimeout(this._fetchTimer);
    }
    this._fetchTimer = setTimeout(() => {
      this._fetchEvents();
    }, 500);
  }

  /**
   * Calculates calendar start/end range parameters for API querying.
   * 
   * @private
   * @returns {Object} Start/end Date parameters
   */
  _getFetchRange() {
    const start = this.config.start_date ? new Date(this.config.start_date) : new Date();
    start.setHours(0, 0, 0, 0); // Start of target/today day

    const maxDays = this.config.max_days !== undefined && this.config.max_days !== null && this.config.max_days !== '' ? parseInt(this.config.max_days) : 7;
    const end = new Date(start);
    end.setDate(end.getDate() + maxDays - 1);
    end.setHours(23, 59, 59, 999); // End of target day

    return { start, end };
  }

  /**
   * Queries calendar events, applying filter configurations.
   * 
   * @private
   * @async
   */
  async _fetchEvents() {
    if (!this.hass || !this.config) return;

    this._fetching = true;
    this.requestUpdate();

    const entities = this.config.entities || (this.config.entity ? [this.config.entity] : []);
    if (entities.length === 0) {
      this._events = [];
      this._fetching = false;
      this.requestUpdate();
      return;
    }

    const { start, end } = this._getFetchRange();
    const dataManager = new CalendarDataManager(this.hass);

    try {
      let events = await dataManager.fetchEvents(entities, start, end);

      const showFinished = this.config.show_finished_events !== false;
      if (!showFinished) {
        const now = new Date();
        events = events.filter(e => e.end >= now);
      }

      this._events = events;
    } catch (e) {
      console.error("Error fetching calendar events", e);
    } finally {
      this._fetching = false;
      this.requestUpdate();
    }
  }

  async _refresh() {
    this._fetching = true;
    this.requestUpdate();

    const entities = this._getEntities();
    if (entities.length > 0) {
      try {
        await this.hass.callService("homeassistant", "update_entity", {
          entity_id: entities
        });
      } catch (e) {
        console.error("Error updating calendar entities", e);
      }
    }

    await this._fetchEvents();
  }

  /**
   * Intercepts event row clicks to set selection.
   * 
   * @param {CustomEvent} e - Click details
   * @private
   */
  _onEventClick(e) {
    this._selectedEvent = e.detail.event;
  }

  /**
   * Closes details dialog popup.
   * 
   * @private
   */
  _closeDialog() {
    this._selectedEvent = null;
  }

  /**
   * Evaluates separator conditions between contiguous task group day nodes.
   * 
   * @param {Date} lastDate - Date of previous event
   * @param {Date} currentDate - Date of current event
   * @private
   * @returns {boolean} True if a separator boundary should render
   */
  /**
   * Helper utility calculating ISO year and calendar week number for week-separator grouping mode.
   * 
   * @param {Date} date - Input date object
   * @private
   * @returns {string} Date week sequence string (e.g. '2026-24')
   */
  _getWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const year = d.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${year}-${week}`;
  }

  /**
   * Evaluates separator conditions between contiguous event groups.
   * 
   * @param {Date} lastDate - Date of previous event
   * @param {Date} currentDate - Date of current event
   * @private
   * @returns {boolean} True if a separator boundary should render
   */
  _shouldShowSeparator(lastDate, currentDate) {
    if (!this.config.day_separator_color || !lastDate || !currentDate) {
      return false;
    }

    const mode = this.config.separator_mode || 'day';
    if (mode === 'day') {
      return lastDate.toDateString() !== currentDate.toDateString();
    } else if (mode === 'month') {
      return lastDate.getFullYear() !== currentDate.getFullYear() ||
        lastDate.getMonth() !== currentDate.getMonth();
    } else if (mode === 'week') {
      return this._getWeek(lastDate) !== this._getWeek(currentDate);
    }
    return false;
  }

  /**
   * Generates a smart readable grouping header label (Today, Tomorrow, Yesterday, or full date).
   * 
   * @param {Date} date - Event start Date
   * @private
   * @returns {string} Group label text
   */
  _getGroupHeaderLabel(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = target - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return this._localize('today') || "Today";
    if (diffDays === 1) return this._localize('tomorrow') || "Tomorrow";
    if (diffDays === -1) return this._localize('yesterday') || "Yesterday";

    const locale = this.hass.locale || { language: 'en' };
    return date.toLocaleDateString(locale.language, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  /**
   * Renders a single detail item inside details popup dialog.
   * 
   * @param {Object} feature - Feature metadata layout (type: time, location, etc.)
   * @param {import('../utilities/calendar/calendar-event-model.js').CalendarEventModel} event - Sourced event details
   * @param {string} lang - Locale string
   * @private
   * @returns {import('lit-html').TemplateResult|string} Detail row HTML template
   */
  _renderDialogFeature(feature, event, lang) {
    const origin = event.originEvent || {};

    switch (feature.type) {
      case "time": {
        const isAllDay = event.isAllDay;
        const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const optionsTime = { hour: '2-digit', minute: '2-digit' };

        let timeDisplay = "";
        if (isAllDay) {
          const startStr = event.start.toLocaleDateString(lang, optionsDate);
          const endAdjusted = new Date(event.end);
          endAdjusted.setDate(endAdjusted.getDate() - 1);

          if (event.start.toDateString() === endAdjusted.toDateString()) {
            timeDisplay = startStr;
          } else {
            const endStr = endAdjusted.toLocaleDateString(lang, optionsDate);
            timeDisplay = `${startStr} - ${endStr}`;
          }
          timeDisplay += ` (${this._localize('all_day') || 'All day'})`;
        } else {
          const startStr = event.start.toLocaleDateString(lang, optionsDate);
          const startTimeStr = event.start.toLocaleTimeString(lang, optionsTime);
          const endTimeStr = event.end.toLocaleTimeString(lang, optionsTime);

          if (event.start.toDateString() === event.end.toDateString()) {
            timeDisplay = `${startStr}, ${startTimeStr} - ${endTimeStr}`;
          } else {
            const endStr = event.end.toLocaleDateString(lang, optionsDate);
            timeDisplay = `${startStr}, ${startTimeStr} - ${endStr}, ${endTimeStr}`;
          }
        }

        return html`
          <div class="dialog-feature-row feature-time">
            <ha-icon icon="mdi:clock-outline" class="feature-icon"></ha-icon>
            <div class="feature-content">${timeDisplay}</div>
          </div>
        `;
      }

      case "location": {
        const location = origin.location;
        if (!location) return "";

        const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(location)}`;
        return html`
          <div class="dialog-feature-row feature-location">
            <ha-icon icon="mdi:map-marker-outline" class="feature-icon"></ha-icon>
            <div class="feature-content">
              <a class="feature-link" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">${location}</a>
            </div>
          </div>
        `;
      }

      case "description": {
        const description = origin.description;
        if (!description) return "";

        return html`
          <div class="dialog-feature-row feature-description">
            <ha-icon icon="mdi:text-long" class="feature-icon"></ha-icon>
            <div class="feature-content">${parseHtml(description)}</div>
          </div>
        `;
      }

      case "attendees": {
        const attendees = origin.attendees;
        if (!attendees || !Array.isArray(attendees) || attendees.length === 0) return "";

        return html`
          <div class="dialog-feature-row feature-attendees">
            <ha-icon icon="mdi:account-group-outline" class="feature-icon"></ha-icon>
            <div class="feature-content">
              <div class="attendees-list">
                ${attendees.map(a => {
          const name = a.displayName || a.name || a.email;
          const role = a.responseStatus || a.status || "";
          let statusClass = "status-unknown";
          let statusIcon = "mdi:help-circle-outline";

          if (role === "accepted") {
            statusClass = "status-accepted";
            statusIcon = "mdi:check-circle-outline";
          } else if (role === "declined") {
            statusClass = "status-declined";
            statusIcon = "mdi:close-circle-outline";
          } else if (role === "tentative") {
            statusClass = "status-tentative";
            statusIcon = "mdi:minus-circle-outline";
          }

          return html`
                    <div class="attendee-item">
                      <span class="attendee-name">${name}</span>
                      ${role ? html`
                        <span class="attendee-status ${statusClass}" title="${role}">
                          <ha-icon icon="${statusIcon}"></ha-icon>
                        </span>
                      ` : ''}
                    </div>
                  `;
        })}
              </div>
            </div>
          </div>
        `;
      }

      default:
        return "";
    }
  }

  /**
   * Renders dialog popup wrapper when selectedEvent state is set.
   * 
   * @private
   * @returns {import('lit-html').TemplateResult|string} Popup HTML template
   */
  _renderEventDialog() {
    if (!this._selectedEvent) return "";

    const event = this._selectedEvent;

    // Find calendar entity configuration to get matching color context
    const entityConf = (this.config.entities || []).find(e =>
      (typeof e === 'object' ? e.entity : e) === event.entity_id
    );
    const color = (typeof entityConf === 'object' && entityConf.color) ? entityConf.color : 'var(--primary-color)';
    const calendarName = (typeof entityConf === 'object' && entityConf.name)
      ? entityConf.name
      : (this.hass.states[event.entity_id]?.attributes?.friendly_name || event.entity_id);

    const lang = this.hass.language || 'en';

    const dialogFeatures = [
      { type: "time" },
      { type: "location" },
      { type: "description" },
      { type: "attendees" }
    ];

    return html`
      <div class="dialog-overlay" @click=${() => this._closeDialog()}>
        <div class="dialog-card" @click=${(e) => e.stopPropagation()}>
          <div class="dialog-header" style="border-left: 6px solid ${color}">
            <div class="dialog-header-text">
              <div class="dialog-calendar-badge" style="background-color: ${color}22; color: ${color};">
                <ha-icon icon="mdi:calendar"></ha-icon>
                <span>${calendarName}</span>
              </div>
              <h2 class="dialog-title">${event.summary}</h2>
            </div>
            <div class="dialog-close-button" @click=${() => this._closeDialog()}>
              <ha-icon icon="mdi:close"></ha-icon>
            </div>
          </div>
          <div class="dialog-body">
            ${dialogFeatures.map(f => this._renderDialogFeature(f, event, lang))}
          </div>
        </div>
      </div>
    `;
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
    let events = this._events || [];
    if (this.config.max_items !== undefined && this.config.max_items !== null && this.config.max_items !== '') {
      events = events.slice(0, parseInt(this.config.max_items));
    }

    return html`
      ${this.renderStyle('calendar-list-card.css')}
      ${this.renderStyle('calendar-list-card-row.css')}
      <ha-card>
        ${this.config.title ? html`
          <div class="header-row">
            <div class="header-title">
              ${this.config.icon ? html`<ha-icon class="header-icon" icon="${this.config.icon}"></ha-icon>` : ""}
              ${this.config.title}
            </div>
          </div>
        ` : ""}
        
        <div class="event-list-wrapper">
          <div class="event-list">
            ${events.map((event) => {
      const currentDate = event.start;
      const previousDate = lastDate;
      lastDate = currentDate;

      const showGroupingHeaders = this.config.show_grouping_headers !== false;
      let dayHeaderHtml = html``;

      if (showGroupingHeaders) {
        const isDifferentDay = previousDate === null || previousDate.toDateString() !== currentDate.toDateString();
        if (isDifferentDay) {
          dayHeaderHtml = html`<div class="group-header">${this._getGroupHeaderLabel(currentDate)}</div>`;
        }
      } else {
        if (this._shouldShowSeparator(previousDate, currentDate)) {
          dayHeaderHtml = html`<div class="day-separator" style="border-top-color: ${this.config.day_separator_color};"></div>`;
        }
      }

      const entityConf = (this.config.entities || []).find(e =>
        (typeof e === 'object' ? e.entity : e) === event.entity_id
      );
      const color = (typeof entityConf === 'object' && entityConf.color) ? entityConf.color : 'var(--primary-color)';

      return html`
                ${dayHeaderHtml}
                <calendar-list-card-row
                  .hass=${this.hass}
                  .config=${this.config}
                  .event=${event}
                  .color=${color}
                  .readonly=${!!this._fetching}
                  @event-click=${(e) => this._onEventClick(e)}
                ></calendar-list-card-row>
              `;
    })}
            ${events.length === 0 ? html`<div class="event-row empty-text">${this._localize('no_events') || 'No events'}</div>` : ''}
          </div>
          
          ${this._fetching ? html`
            <div class="loading-overlay">
              <ha-icon icon="mdi:loading" class="spinning"></ha-icon>
            </div>
          ` : ''}
        </div>
      </ha-card>
      
      ${this.config.show_refresh_button ? html`
        <ha-card>
          <div class="tile-button" @click="${() => this._refresh()}">
            <div class="tile-icon-container">
              <ha-icon icon="mdi:refresh" class="${this._fetching ? 'spinning' : ''}"></ha-icon>
            </div>
            <div class="tile-info">
              <span class="tile-name">${this._localize('refresh')}</span>
              <span class="tile-state">${this._localize('refresh_desc')}</span>
            </div>
          </div>
        </ha-card>
      ` : ''}
      
      ${this._renderEventDialog()}
    `;
  }
}

if (!customElements.get("calendar-list-card")) {
  customElements.define("calendar-list-card", CalendarListCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "calendar-list-card",
  name: "Calendar List Card",
  description: "A custom calendar card that displays events sequentially, using the start date in the first column.",
  preview: true
});
