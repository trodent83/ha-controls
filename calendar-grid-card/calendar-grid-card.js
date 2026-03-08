import { HAControlBase, html } from "../ha-control-base.js?v=0.5.0";

import { CalendarDataManager } from "../utilities/calendar/calendar-data-manager.js";
import { VERSION } from "./version.js";

class CalendarGridCard extends HAControlBase {
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
   * Returns the editor element tag name.
   */
  static getConfigElement() {
    return document.createElement("calendar-grid-card-editor");
  }

  /**
   * Returns a stub configuration for the card.
   */
  static getStubConfig() {
    return {
      entities: [],
      first_day_of_week: 1,
      default_view: 'month',
      orientation: 'horizontal'
    };
  }

  constructor() {
    super();
    this._events = [];
    this._currentDate = new Date();
    this._fetchedRange = { start: null, end: null };
    this._sidebarOpen = false;
    this._disabledCalendars = new Set();
    this._fetchTimer = null;
  }

  /**
   * Invoked when the element is removed from the document's DOM.
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._fetchTimer) {
      clearTimeout(this._fetchTimer);
    }
  }

  /**
   * Returns the path to the translation files.
   */
  get translationPath() {
    return "/local/ha-controls/calendar-grid-card/translations";
  }

  /**
   * Returns the version of the translation files.
   */
  get translationVersion() {
    return VERSION;
  }

  /**
   * Sets the configuration for the card.
   * @param {Object} config - The configuration object.
   */
  setConfig(config) {
    if (!config.entities) {
      throw new Error("Please define entities");
    }
    this.config = config;
    // Reset fetch state on config change
    this._fetchedRange = { start: null, end: null };
    this._events = [];
    this._disabledCalendars = this._loadDisabledCalendars();
  }

  /**
   * Determines if the element should update.
   * @param {Map} changedProps - Map of changed properties.
   * @returns {boolean} True if the element should update.
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
   * Invoked after the element has updated.
   * @param {Map} changedProps - Map of changed properties.
   */
  updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has('hass') || changedProps.has('_currentDate')) {
      this._checkAndFetch();
    }
  }

  /**
   * Checks if events need to be fetched and schedules a fetch.
   */
  _checkAndFetch() {
    if (!this.hass || !this.config) return;

    if (this._fetchTimer) {
      clearTimeout(this._fetchTimer);
    }
    this._fetchTimer = setTimeout(() => {
      const { start, end } = this._getViewDateRange();
      this._fetchEvents(start, end);
    }, 500);
  }

  /**
   * Calculates the start and end dates for the current view.
   * @returns {Object} Object containing start and end Date objects.
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
    // Day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = startView.getDay(); // 0 (Sun) to 6 (Sat)
    
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
   * Fetches events from the calendar data manager.
   * @param {Date} start - Start date.
   * @param {Date} end - End date.
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
   * Refreshes the events for the current view.
   */
  _refresh() {
    const { start, end } = this._getViewDateRange();
    this._fetchEvents(start, end);
  }

  /**
   * Moves the view to the previous period (week or month).
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
   * Moves the view to the next period (week or month).
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
   * Moves the view to the current date.
   */
  _today() {
    this._currentDate = new Date();
  }

  /**
   * Filters events for a specific day.
   * @param {string} dateStr - Date string (YYYY-MM-DD).
   * @param {Array} allEvents - List of all events.
   * @returns {Array} List of events for the day.
   */
  _getEventsForDay(dateStr, allEvents) {
    // Filter events that overlap with this day
    // The user requested: "each day gets its own entries"
    // We iterate all fetched events and check if they cover the specific date.
    
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
   * Returns the list of week day names.
   * @returns {Array<string>} List of week day names.
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
   * Renders the card.
   * @returns {TemplateResult} The rendered HTML.
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
        monthName = `Week of ${startDateStr} - ${endDateStr}`;
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
      <link rel="stylesheet" href="/local/ha-controls/calendar-grid-card/calendar-grid-card.css?v=${this.translationVersion}">
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
   * Toggles the sidebar visibility.
   */
  _toggleSidebar() {
    this._sidebarOpen = !this._sidebarOpen;
  }

  /**
   * Toggles a calendar's visibility.
   * @param {string} entityId - The entity ID of the calendar.
   * @param {boolean} checked - Whether the calendar should be visible.
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
   * Generates a storage key for disabled calendars.
   * @returns {string|null} The storage key.
   */
  _getStorageKey() {
    if (!this.config || !this.config.entities) return null;
    const entityIds = this.config.entities.map(e => typeof e === 'object' ? e.entity : e).sort();
    return `calendar-grid-disabled-${entityIds.join('_')}`;
  }

  /**
   * Loads disabled calendars from local storage.
   * @returns {Set<string>} Set of disabled calendar entity IDs.
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
   * Saves disabled calendars to local storage.
   */
  _saveDisabledCalendars() {
    const key = this._getStorageKey();
    if (key) {
        localStorage.setItem(key, JSON.stringify(Array.from(this._disabledCalendars)));
    }
  }

  /**
   * Handles click events on calendar events.
   * @param {Event} e - The click event.
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