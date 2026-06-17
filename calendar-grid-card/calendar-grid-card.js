import { HAControlBase, html } from "../ha-control-base.js?v=0.6.0";

import { CalendarDataManager } from "../utilities/calendar/calendar-data-manager.js";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '0.4.21';

/**
 * CalendarGridCard
 * A custom Home Assistant Lovelace dashboard card that renders calendar events in a monthly or weekly grid layout.
 * Supports timezone-aware calculations, filter toggles, sidebar calendar source switches, custom day name localizations,
 * and state-persistent exclusions saved in LocalStorage.
 * 
 * @extends HAControlBase
 */
class CalendarGridCard extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Tracks config configuration, events list, currentDate view cursor, sidebar toggles, and disabled sets.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return {
      ...super.properties,
      config: {},
      _events: { state: true },
      _currentDate: { state: true },
      _sidebarOpen: { state: true },
      _disabledCalendars: { state: true }
    };
  }

  /**
   * Creates and returns the configuration editor element for this card.
   * Home Assistant Lovelace visual editor links to this method.
   * 
   * @static
   * @returns {HTMLElement} The calendar-grid-card-editor configuration element
   */
  static getConfigElement() {
    return document.createElement("calendar-grid-card-editor");
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
      first_day_of_week: 1,
      default_view: 'month',
      orientation: 'horizontal'
    };
  }

  /**
   * Instantiates a CalendarGridCard custom card.
   * Configures default states for calendar view boundaries and arrays.
   */
  constructor() {
    super();
    /**
     * List of actively loaded calendar events.
     * @type {Array<import('../utilities/calendar/calendar-event-model.js').CalendarEventModel>}
     * @private
     */
    this._events = [];
    /**
     * Active visual view pointer Date cursor.
     * @type {Date}
     * @private
     */
    this._currentDate = new Date();
    /**
     * Sourced range coordinates for caching.
     * @type {Object}
     * @private
     */
    this._fetchedRange = { start: null, end: null };
    /**
     * Sidebar visibility state indicator.
     * @type {boolean}
     * @private
     */
    this._sidebarOpen = false;
    /**
     * List of disabled calendars.
     * @type {Set<string>}
     * @private
     */
    this._disabledCalendars = new Set();
    /**
     * Asynchronous fetch debounce timer ID.
     * @type {number|null}
     * @private
     */
    this._fetchTimer = null;
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
   * Resolves the directory path hosting the translation localizations.
   * 
   * @type {string}
   */
  get translationPath() {
    return "/local/ha-controls/calendar-grid-card/translations";
  }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() {
    return VERSION;
  }

  /**
   * Configures user configuration parameters for the card, validating required fields.
   * Resets date queries to trigger fresh pulls.
   * 
   * @param {Object} config - The raw configuration schema from Lovelace dashboard
   * @throws {Error} If entities property is omitted
   */
  setConfig(config) {
    if (!config.entities) {
      throw new Error("Please define entities");
    }
    this.config = {
      first_day_of_week: 1,
      default_view: "month",
      orientation: "horizontal",
      ...config
    };
    // Reset fetch state on config change
    this._fetchedRange = { start: null, end: null };
    this._events = [];
    this._disabledCalendars = this._loadDisabledCalendars();
  }

  /**
   * Controls when the element should re-render to optimize dashboard performance.
   * Only returns true if config, dates cursor, sidebar states, or target entities update.
   * 
   * @param {Map<string, any>} changedProps - Changed properties map
   * @returns {boolean} True if element should redraw, false otherwise
   */
  shouldUpdate(changedProps) {
    if (changedProps.has('_events') || 
        changedProps.has('_currentDate') || 
        changedProps.has('_sidebarOpen') || 
        changedProps.has('_disabledCalendars') ||
        changedProps.has('config') ||
        changedProps.has('_strings')) {
      return true;
    }

    if (!changedProps.has('hass')) {
      return true;
    }

    const oldHass = changedProps.get('hass');
    if (!oldHass || !this.hass || !this.config) {
      return true;
    }

    const entities = this.config.entities || [];
    for (const entityConf of entities) {
      const entityId = typeof entityConf === "object" ? entityConf.entity : entityConf;
      if (oldHass.states[entityId] !== this.hass.states[entityId]) {
        return true;
      }
    }

    return false;
  }

  /**
   * LitElement lifecycle update callback. Triggers asynchronous database events syncs on date cursor modifications.
   * 
   * @param {Map<string, any>} changedProps - Changed properties map
   */
  updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has('hass') || changedProps.has('_currentDate')) {
      this._checkAndFetch();
    }
  }

  /**
   * Schedules a fetch operation. Sets debounced timeouts to avoid thrashing endpoints on fast clicks.
   * 
   * @private
   */
  _checkAndFetch() {
    if (!this.hass || !this.config) return;

    const { start, end } = this._getViewDateRange();

    // Skip debounce on initial fetch (when no active range has been fetched yet)
    if (!this._fetchedRange || !this._fetchedRange.start) {
      this._fetchEvents(start, end);
      return;
    }

    if (this._fetchTimer) {
      clearTimeout(this._fetchTimer);
    }
    this._fetchTimer = setTimeout(() => {
      this._fetchEvents(start, end);
    }, 500);
  }

  /**
   * Calculates calendar grid date boundaries based on view settings (week/month)
   * and starting day of week configuration options.
   * 
   * @private
   * @returns {Object} Object containing starting and ending Date objects
   */
  _getViewDateRange() {
    const view = this.config.default_view || 'month';
    const firstDayOfWeek = this.config.first_day_of_week !== undefined ? this.config.first_day_of_week : 1;

    if (view === 'week') {
        const startView = new Date(this._currentDate);
        const dayOfWeek = startView.getDay();
        const diff = (dayOfWeek - firstDayOfWeek + 7) % 7;
        startView.setDate(startView.getDate() - diff);
        startView.setHours(0, 0, 0, 0);

        const endView = new Date(startView);
        endView.setDate(endView.getDate() + 6);
        endView.setHours(23, 59, 59, 999);
        
        return { start: startView, end: endView };
    }

    const year = this._currentDate.getFullYear();
    const month = this._currentDate.getMonth();
    
    // Start of the month
    const startOfMonth = new Date(year, month, 1);
    // End of the month
    const endOfMonth = new Date(year, month + 1, 0);

    // We need to include days from previous month to fill the first week row
    const startView = new Date(startOfMonth);
    const dayOfWeek = startView.getDay();
    
    // Adjust to start on firstDayOfWeek:
    const diff = (dayOfWeek - firstDayOfWeek + 7) % 7;
    startView.setDate(startView.getDate() - diff);

    // We need to include days from next month to fill the last week row
    const endView = new Date(endOfMonth);
    const endDayOfWeek = endView.getDay();
    
    // Days to add to reach the end of the week row
    const currentColumnIndex = (endDayOfWeek - firstDayOfWeek + 7) % 7;
    const daysToAdd = 6 - currentColumnIndex;
    
    endView.setDate(endView.getDate() + daysToAdd);
    
    // Set times
    startView.setHours(0, 0, 0, 0);
    endView.setHours(23, 59, 59, 999);

    return { start: startView, end: endView };
  }

  /**
   * Calls calendar-data-manager utilities to query entities and caches updates.
   * 
   * @param {Date} start - Beginning date boundary
   * @param {Date} end - Ending date boundary
   * @async
   * @private
   */
  async _fetchEvents(start, end) {
    if (!this.hass || !this.config) return;

    // Mark as fetching/fetched for this range to prevent loops
    this._fetchedRange = { start: start.toISOString(), end: end.toISOString() };

    const entities = this.config.entities || [this.config.entity];
    const dataManager = new CalendarDataManager(this.hass);
    this._events = await dataManager.fetchEvents(entities, start, end);
  }

  /**
   * Reloads calendar data matching the current dates coordinate.
   * 
   * @private
   */
  _refresh() {
    const { start, end } = this._getViewDateRange();
    this._fetchEvents(start, end);
  }

  /**
   * Moves date cursor cursor back by one unit.
   * 
   * @private
   */
  _prev() {
    const view = this.config.default_view || 'month';
    if (view === 'week') {
        const newDate = new Date(this._currentDate);
        newDate.setDate(newDate.getDate() - 7);
        this._currentDate = newDate;
    } else {
        this._currentDate = new Date(this._currentDate.getFullYear(), this._currentDate.getMonth() - 1, 1);
    }
  }

  /**
   * Advances date cursor cursor forward by one unit.
   * 
   * @private
   */
  _next() {
    const view = this.config.default_view || 'month';
    if (view === 'week') {
        const newDate = new Date(this._currentDate);
        newDate.setDate(newDate.getDate() + 7);
        this._currentDate = newDate;
    } else {
        this._currentDate = new Date(this._currentDate.getFullYear(), this._currentDate.getMonth() + 1, 1);
    }
  }

  /**
   * Resets date cursor cursor to the current day.
   * 
   * @private
   */
  _today() {
    this._currentDate = new Date();
  }

  /**
   * Filters loaded events, identifying items due on the requested day string coordinates.
   * Respects user configuration toggles such as show_finished_events.
   * 
   * @param {string} dateStr - Date coordinate (YYYY-MM-DD)
   * @param {Array<import('../utilities/calendar/calendar-event-model.js').CalendarEventModel>} allEvents - Sourced list
   * @private
   * @returns {Array<import('../utilities/calendar/calendar-event-model.js').CalendarEventModel>} List of events on this day
   */
  _getEventsForDay(dateStr, allEvents) {
    const targetDate = new Date(dateStr);
    targetDate.setHours(0,0,0,0);
    const targetEnd = new Date(targetDate);
    targetEnd.setHours(23,59,59,999);
    
    const now = new Date();
    const showFinished = this.config.show_finished_events !== false;

    return allEvents.filter(event => {
        if (this._disabledCalendars.has(event.entity_id)) return false;
        if (!showFinished && event.end < now) return false;
        return event.start <= targetEnd && event.end > targetDate;
    });
  }

  /**
   * Compiles week header day names based on first_day_of_week parameter.
   * 
   * @private
   * @returns {Array<string>} Day name strings list
   */
  _getWeekDays() {
    let weekDays = this.config.day_names;
    if (typeof weekDays === 'string') {
      weekDays = weekDays.split(',').map(v => v.trim());
    }

    if (weekDays && Array.isArray(weekDays) && weekDays.length === 7) {
      return weekDays;
    }

    const firstDayOfWeek = this.config.first_day_of_week !== undefined ? parseInt(this.config.first_day_of_week) : 1;
    const defaultDayNames = [
      this._localize('cgc.days.short_sun'),
      this._localize('cgc.days.short_mon'),
      this._localize('cgc.days.short_tue'),
      this._localize('cgc.days.short_wed'),
      this._localize('cgc.days.short_thu'),
      this._localize('cgc.days.short_fri'),
      this._localize('cgc.days.short_sat')
    ];
    const result = [];
    for (let i = 0; i < 7; i++) {
      result.push(defaultDayNames[(firstDayOfWeek + i) % 7]);
    }
    return result;
  }

  /**
   * Renders the custom card HTML template.
   * Maps monthly/weekly calendars grids using orientations and stylesheets attributes.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this.config) return html``;

    const { start, end } = this._getViewDateRange();
    const days = [];
    const iter = new Date(start);
    
    while (iter <= end) {
        days.push(new Date(iter));
        iter.setDate(iter.getDate() + 1);
    }

    const view = this.config.default_view || 'month';
    const lang = this.hass.language || 'en';
    let monthName;
    if (view === 'week') {
        const startDateStr = start.toLocaleDateString(lang, { month: 'short', day: 'numeric' });
        const endDateStr = end.toLocaleDateString(lang, { month: 'short', day: 'numeric', year: 'numeric' });
        monthName = this._localize('cgc.card.week_of', { start: startDateStr, end: endDateStr });
    } else {
        monthName = this._currentDate.toLocaleString(lang, { month: 'long', year: 'numeric' });
    }
    
    const weekDays = this._getWeekDays();

    const rowCount = Math.ceil(days.length / 7);
    const sidebarPos = this.config.sidebar_position || 'right';
    const orientation = this.config.orientation || 'horizontal';
    
    let gridStyle = '';
    if (orientation === 'vertical') {
        gridStyle = `grid-template-columns: min-content repeat(${rowCount}, 1fr); grid-template-rows: repeat(7, 1fr); grid-auto-flow: column;`;
    } else {
        gridStyle = `grid-template-rows: min-content repeat(${rowCount}, 1fr); grid-template-columns: repeat(7, 1fr);`;
    }

    return html`
      ${this.renderStyle('calendar-grid-card.css')}
      <ha-card>
        <div class="header">
            <div class="month-title">${monthName}</div>
            <div class="header-right">
                <div class="controls">
                    <div class="control-button" @click=${this._prev}>
                        <ha-icon icon="mdi:chevron-left"></ha-icon>
                    </div>
                    <div class="control-button today" @click=${this._today}>
                        ${this._localize('cgc.card.today')}
                    </div>
                    <div class="control-button" @click=${this._next}>
                        <ha-icon icon="mdi:chevron-right"></ha-icon>
                    </div>
                </div>
                ${(this.config.show_refresh_button !== false || sidebarPos !== 'hidden') ? html`
                <div class="controls">
                    ${this.config.show_refresh_button !== false ? html`
                    <div class="control-button" @click=${this._refresh}>
                        <ha-icon icon="mdi:refresh"></ha-icon>
                    </div>
                    ` : ''}
                    ${sidebarPos !== 'hidden' ? html`
                    <div class="control-button ${this._sidebarOpen ? 'active' : ''}" @click=${this._toggleSidebar}>
                        <ha-icon icon="mdi:format-list-checks"></ha-icon>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
            </div>
        </div>

        <div class="main-content pos-${sidebarPos}">
          <div class="calendar-grid" style="${gridStyle}">
            ${weekDays.map(d => html`<div class="day-header">${d}</div>`)}
            
            ${days.map(day => {
                const dateStr = day.toISOString().split('T')[0];
                const now = new Date();
                const isToday = day.getDate() === now.getDate() && 
                                day.getMonth() === now.getMonth() && 
                                day.getFullYear() === now.getFullYear();
                const isCurrentMonth = day.getMonth() === this._currentDate.getMonth();
                const dayEvents = this._getEventsForDay(dateStr, this._events);

                const cellStyle = [];
                if (isToday) {
                    if (this.config.today_background) cellStyle.push(`background: ${this.config.today_background}`);
                    if (this.config.today_border) {
                        const borderVal = this.config.today_border;
                        if (/(solid|dashed|dotted|double|groove|ridge|inset|outset)/i.test(borderVal)) {
                            cellStyle.push(`border: ${borderVal}`);
                        } else {
                            cellStyle.push(`border-color: ${borderVal}`);
                        }
                    }
                }

                return html`
                    <div class="day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}" style="${cellStyle.join(';')}">
                        <div class="day-number">${day.getDate()}</div>
                        <div class="events-container">
                            ${dayEvents.map(event => {
                                const entityConf = this.config.entities.find(e => 
                                    (typeof e === 'object' ? e.entity : e) === event.entity_id
                                );
                                const color = (typeof entityConf === 'object' && entityConf.color) ? entityConf.color : undefined;
                                const backgroundColor = (typeof entityConf === 'object' && entityConf.backgroundColor) ? entityConf.backgroundColor : undefined;
                                const iconColor = (typeof entityConf === 'object' && entityConf.iconColor) ? entityConf.iconColor : undefined;
                                const activeColor = (typeof entityConf === 'object' && entityConf.activeColor) ? entityConf.activeColor : undefined;
                                const activeBackgroundColor = (typeof entityConf === 'object' && entityConf.activeBackgroundColor) ? entityConf.activeBackgroundColor : undefined;
                                const activeIconAnimation = (typeof entityConf === 'object' && entityConf.activeIconAnimation) ? entityConf.activeIconAnimation : undefined;

                                return html`
                                <calendar-grid-card-event 
                                    .hass=${this.hass}
                                    .event=${event} 
                                    .day=${day}
                                    .color=${color}
                                    .activeColor=${activeColor}
                                    .activeBackgroundColor=${activeBackgroundColor}
                                    .activeIconAnimation=${activeIconAnimation}
                                    .iconColor=${iconColor}
                                    .backgroundColor=${backgroundColor}
                                    @event-click=${this._onEventClick}
                                ></calendar-grid-card-event>`
                            })}
                        </div>
                    </div>
                `;
            })}
          </div>
          ${this._sidebarOpen && sidebarPos !== 'hidden' ? html`
            <div class="sidebar">
                ${this.config.entities.map(entityConf => {
                    const entityId = typeof entityConf === "object" ? entityConf.entity : entityConf;
                    const entityState = this.hass.states[entityId];
                    const friendlyName = (typeof entityConf === "object" && entityConf.name) ? entityConf.name : (entityState ? entityState.attributes.friendly_name : entityId);
                    const isChecked = !this._disabledCalendars.has(entityId);
                    
                    const color = typeof entityConf === "object" ? entityConf.color : undefined;
                    const backgroundColor = typeof entityConf === "object" ? entityConf.backgroundColor : undefined;

                    const style = [];
                    if (isChecked) {
                        if (color) style.push(`color: ${color}`);
                        if (backgroundColor) {
                            style.push(`background-color: ${backgroundColor}`);
                            style.push(`border-color: ${backgroundColor}`);
                        }
                    }
                    
                    return html`
                        <div class="calendar-toggle ${isChecked ? 'active' : ''}" style="${style.join(';')}" @click=${() => this._toggleCalendar(entityId, !isChecked)}>
                            <span class="calendar-name">${friendlyName}</span>
                        </div>
                    `;
                })}
            </div>
          ` : ''}
        </div>
      </ha-card>
    `;
  }

  /**
   * Toggles the sidebar visibility panel.
   * 
   * @private
   */
  _toggleSidebar() {
    this._sidebarOpen = !this._sidebarOpen;
  }

  /**
   * Excludes/Includes a calendar entity from events rendering and updates local storage.
   * 
   * @param {string} entityId - Sourced calendar entity ID
   * @param {boolean} checked - Active state checking target
   * @private
   */
  _toggleCalendar(entityId, checked) {
    const newDisabled = new Set(this._disabledCalendars);
    if (checked) {
        newDisabled.delete(entityId);
    } else {
        newDisabled.add(entityId);
    }
    this._disabledCalendars = newDisabled;
    this._saveDisabledCalendars();
  }

  /**
   * Resolves a storage mapping key based on target calendar entities sorted array.
   * 
   * @private
   * @returns {string|null} Storage identifier key
   */
  _getStorageKey() {
    if (!this.config || !this.config.entities) return null;
    const entityIds = this.config.entities.map(e => typeof e === 'object' ? e.entity : e).sort();
    return `calendar-grid-disabled-${entityIds.join('_')}`;
  }

  /**
   * Retrieves array of disabled calendar entity IDs from local browser storage.
   * 
   * @private
   * @returns {Set<string>} Set of disabled calendar entity IDs
   */
  _loadDisabledCalendars() {
    const key = this._getStorageKey();
    if (key) {
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                return new Set(JSON.parse(stored));
            } catch (e) {
                console.error("Error loading disabled calendars", e);
            }
        }
    }
    return new Set();
  }

  /**
   * Commits current disabled calendars set to local storage properties.
   * 
   * @private
   */
  _saveDisabledCalendars() {
    const key = this._getStorageKey();
    if (key) {
        localStorage.setItem(key, JSON.stringify(Array.from(this._disabledCalendars)));
    }
  }

  /**
   * Intercepts calendar event clicks.
   * 
   * @param {CustomEvent} e - Click details containing event data model
   * @private
   */
  _onEventClick(e) {
      console.log("Event clicked", e.detail.event);
  }
}

customElements.define("calendar-grid-card", CalendarGridCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "calendar-grid-card",
  name: "Calendar Grid Card",
  description: "A calendar card that displays events in a month view grid.",
  preview: true
});