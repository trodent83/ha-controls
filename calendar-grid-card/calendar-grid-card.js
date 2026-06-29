import { HAControlBase, html } from "../ha-control-base.js?v=0.6.8";

import { CalendarDataManager } from "../utilities/calendar/calendar-data-manager.js?v=0.4.36";

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
      _disabledCalendars: { state: true },
      _fetching: { state: true },
      _selectedEvent: { state: true }
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
      entities: ["calendar.personal"],
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
    /**
     * Reactive state property tracking active event fetches.
     * @type {boolean}
     * @private
     */
    this._fetching = false;
    /**
     * Sourced event model currently selected and rendered in details dialog.
     * @type {import('../utilities/calendar/calendar-event-model.js').CalendarEventModel|null}
     * @private
     */
    this._selectedEvent = null;
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
        changedProps.has('_selectedEvent') ||
        changedProps.has('config') ||
        changedProps.has('_strings')) {
      return true;
    }

    return super.shouldUpdate(changedProps);
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

    if (this.config.month_start === 'today' || this.config.rolling_month) {
        const startView = new Date(this._currentDate);
        const dayOfWeek = startView.getDay();
        const diff = (dayOfWeek - firstDayOfWeek + 7) % 7;
        startView.setDate(startView.getDate() - diff);
        startView.setHours(0, 0, 0, 0);

        const endView = new Date(startView);
        endView.setDate(endView.getDate() + 34); // 5 weeks (35 days total)
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

    this._fetching = true;
    this.requestUpdate();

    // Mark as fetching/fetched for this range to prevent loops
    this._fetchedRange = { start: start.toISOString(), end: end.toISOString() };

    const entities = this.config.entities || [this.config.entity];
    const dataManager = new CalendarDataManager(this.hass);
    try {
      this._events = await dataManager.fetchEvents(entities, start, end);
    } catch (e) {
      console.error("Error fetching calendar events", e);
    } finally {
      this._fetching = false;
      this.requestUpdate();
    }
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
    } else if (view === 'month' && (this.config.month_start === 'today' || this.config.rolling_month)) {
        const startMonthName = start.toLocaleString(lang, { month: 'short' });
        const endMonthName = end.toLocaleString(lang, { month: 'short', year: 'numeric' });
        monthName = `${startMonthName} - ${endMonthName}`;
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
                    <div class="day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}" 
                         style="${cellStyle.join(';')}"
                         @click=${() => this._onDayClick(day)}>
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
          ${this._fetching ? html`
            <div class="loading-overlay">
              <ha-icon icon="mdi:loading" class="spinning"></ha-icon>
            </div>
          ` : ''}
        </div>
      </ha-card>
      ${this._renderEventDialog()}
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
  /**
   * Handles clicks on a day cell to display a detailed popup.
   * 
   * @param {Date} day - Clicked day Date object
   * @private
   */
  _onDayClick(day) {
    const action = this.config.day_tap_action || { action: 'popup' };
    if (action.action === 'none') return;
    
    if (action.action === 'popup') {
      const dateStr = day.toISOString().split('T')[0];
      const locale = this.hass.locale || { language: 'en' };
      const dateLabel = day.toLocaleDateString(locale.language, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      
      this.dispatchEvent(new CustomEvent("show-grid-popup", {
        detail: {
          heading: dateLabel,
          body: {
            type: "custom:calendar-list-card",
            entities: this.config.entities,
            start_date: dateStr,
            max_days: 1,
            show_description: true,
            show_due_in_days: false,
            show_refresh_button: false,
            show_source: true,
            show_finished_events: true,
            show_grouping_headers: false,
            separator_mode: 'day',
            features: [
              {
                type: "custom:calendar-property-feature",
                property: "time"
              },
              {
                type: "custom:calendar-property-feature",
                property: "location"
              },
              {
                type: "custom:calendar-property-feature",
                property: "description"
              },
              {
                type: "custom:calendar-property-feature",
                property: "attendees"
              }
            ]
          }
        },
        bubbles: true,
        composed: true
      }));
    } else {
      this.dispatchEvent(new CustomEvent("hass-action", {
        detail: {
          config: {
            tap_action: action
          },
          action: 'tap'
        },
        bubbles: true,
        composed: true
      }));
    }
  }

  _onEventClick(e) {
      this._selectedEvent = e.detail.event;
  }

  /**
   * Closes the active event details dialog.
   * 
   * @private
   */
  _closeDialog() {
      this._selectedEvent = null;
  }

  /**
   * Renders the modular event detail dialog when an event is selected.
   * 
   * @private
   * @returns {import('lit-html').TemplateResult|string} Rendered dialog template or empty string
   */
  _renderEventDialog() {
    if (!this._selectedEvent) return "";

    const event = this._selectedEvent;
    
    // Find calendar entity configuration to get matching color context
    const entityConf = this.config.entities.find(e => 
      (typeof e === 'object' ? e.entity : e) === event.entity_id
    );
    const color = (typeof entityConf === 'object' && entityConf.color) ? entityConf.color : 'var(--primary-color)';
    const calendarName = (typeof entityConf === 'object' && entityConf.name) 
      ? entityConf.name 
      : (this.hass.states[event.entity_id]?.attributes?.friendly_name || event.entity_id);

    // Get active user language / locale
    const lang = this.hass.language || 'en';

    // Renders the configured features or default fallback list
    const features = this.config.event_features || [
      { type: "time" },
      { type: "location" },
      { type: "description" },
      { type: "attendees" }
    ];

    return html`
      <div class="dialog-overlay" @click=${this._closeDialog}>
        <div class="dialog-card" @click=${(e) => e.stopPropagation()}>
          <div class="dialog-header" style="border-left: 6px solid ${color}">
            <div class="dialog-header-text">
              <div class="dialog-calendar-badge" style="background-color: ${color}22; color: ${color};">
                <ha-icon icon="mdi:calendar"></ha-icon>
                <span>${calendarName}</span>
              </div>
              <h2 class="dialog-title">${event.summary}</h2>
            </div>
            <div class="dialog-close-button" @click=${this._closeDialog}>
              <ha-icon icon="mdi:close"></ha-icon>
            </div>
          </div>
          <div class="dialog-body">
            ${features.map(f => this._renderFeature(f, event, lang))}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders a single event feature extension in the dialog.
   * 
   * @param {Object} feature - Feature config (e.g. { type: 'location' })
   * @param {import('../utilities/calendar/calendar-event-model.js').CalendarEventModel} event - Sourced event model
   * @param {string} lang - Active locale/language code
   * @private
   * @returns {import('lit-html').TemplateResult|string} Feature rendering or empty string
   */
  _renderFeature(feature, event, lang) {
    const origin = event.originEvent;
    
    switch (feature.type) {
      case "time": {
        // Format start/end time and date nicely
        const isAllDay = event.isAllDay;
        const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const optionsTime = { hour: '2-digit', minute: '2-digit' };
        
        let timeDisplay = "";
        if (isAllDay) {
          const startStr = event.start.toLocaleDateString(lang, optionsDate);
          // For all-day events, check if it spans multiple days
          // Note: all-day end date is exclusive, so we subtract 1 day to show inclusive dates to users
          const endAdjusted = new Date(event.end);
          endAdjusted.setDate(endAdjusted.getDate() - 1);
          
          if (event.start.toDateString() === endAdjusted.toDateString()) {
            timeDisplay = startStr;
          } else {
            const endStr = endAdjusted.toLocaleDateString(lang, optionsDate);
            timeDisplay = `${startStr} - ${endStr}`;
          }
          timeDisplay += ` (${this._localize('cgc.event.all_day') || 'All day'})`;
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
            <div class="feature-content markdown-body">${description}</div>
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
}

customElements.define("calendar-grid-card", CalendarGridCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "calendar-grid-card",
  name: "Calendar Grid Card",
  description: "A calendar card that displays events in a month view grid.",
  preview: true
});