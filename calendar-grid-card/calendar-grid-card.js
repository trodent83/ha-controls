const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

import { CalendarEventModel } from "./calendar-event-model.js";

class CalendarGridCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      _events: { state: true },
      _currentDate: { state: true }
    };
  }

  static getConfigElement() {
    return document.createElement("calendar-grid-card-editor");
  }

  static getStubConfig() {
    return {
      entities: [],
      first_day_of_week: 1
    };
  }

  constructor() {
    super();
    this._events = [];
    this._currentDate = new Date();
    this._fetchedRange = { start: null, end: null };
  }

  setConfig(config) {
    if (!config.entities) {
      throw new Error("Please define entities");
    }
    this.config = config;
    // Reset fetch state on config change
    this._fetchedRange = { start: null, end: null };
    this._events = [];
  }

  updated(changedProps) {
    if (changedProps.has('hass') || changedProps.has('_currentDate')) {
      this._checkAndFetch();
    }
  }

  _checkAndFetch() {
    if (!this.hass || !this.config) return;

    // Calculate the range we need to display
    const { start, end } = this._getViewDateRange();

    // Simple check: if we haven't fetched for this range roughly, fetch again.
    // For simplicity, we fetch if the current view range is outside the previously fetched range
    // or if we haven't fetched at all.
    // To be safe and simple, we just fetch whenever the month changes.
    
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    if (this._fetchedRange.start !== startStr || this._fetchedRange.end !== endStr) {
      this._fetchEvents(start, end);
    }
  }

  _getViewDateRange() {
    const year = this._currentDate.getFullYear();
    const month = this._currentDate.getMonth();
    
    // Start of the month
    const startOfMonth = new Date(year, month, 1);
    // End of the month
    const endOfMonth = new Date(year, month + 1, 0);

    const firstDayOfWeek = this.config.first_day_of_week !== undefined ? this.config.first_day_of_week : 1;

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

  async _fetchEvents(start, end) {
    if (!this.hass || !this.config) return;

    // Mark as fetching/fetched for this range to prevent loops
    this._fetchedRange = { start: start.toISOString(), end: end.toISOString() };

    const entities = this.config.entities || [this.config.entity];
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    let allEvents = [];
    const fetchedEntityIds = new Set();

    for (const entityConf of entities) {
      const entityId = typeof entityConf === "object" ? entityConf.entity : entityConf;

      if (fetchedEntityIds.has(entityId)) {
        continue;
      }

      try {
        const path = `calendars/${entityId}?start=${startStr}&end=${endStr}`;
        const events = await this.hass.callApi("GET", path);

        if (events && Array.isArray(events)) {
          allEvents = allEvents.concat(
            events.map((e) => new CalendarEventModel({ ...e, entity_id: entityId }))
          );
        }
        fetchedEntityIds.add(entityId);
      } catch (e) {
        console.error(`Error fetching calendar events for ${entityId}`, e);
      }
    }

    allEvents.sort((a, b) => {
      return a.start - b.start;
    });

    this._events = allEvents;
  }

  _prevMonth() {
    this._currentDate = new Date(this._currentDate.getFullYear(), this._currentDate.getMonth() - 1, 1);
  }

  _nextMonth() {
    this._currentDate = new Date(this._currentDate.getFullYear(), this._currentDate.getMonth() + 1, 1);
  }

  _today() {
    this._currentDate = new Date();
  }

  _getEventsForDay(dateStr, allEvents) {
    // Filter events that overlap with this day
    // The user requested: "each day gets its own entries"
    // We iterate all fetched events and check if they cover the specific date.
    
    const targetDate = new Date(dateStr);
    targetDate.setHours(0,0,0,0);
    const targetEnd = new Date(targetDate);
    targetEnd.setHours(23,59,59,999);

    return allEvents.filter(event => {
        return event.start <= targetEnd && event.end > targetDate;
    });
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const { start, end } = this._getViewDateRange();
    const days = [];
    const iter = new Date(start);
    
    while (iter <= end) {
        days.push(new Date(iter));
        iter.setDate(iter.getDate() + 1);
    }

    const monthName = this._currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const firstDayOfWeek = this.config.first_day_of_week !== undefined ? this.config.first_day_of_week : 1;
    let weekDays = this.config.day_names;

    if (!weekDays || weekDays.length !== 7) {
        const defaultDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        weekDays = [];
        for (let i = 0; i < 7; i++) {
            weekDays.push(defaultDayNames[(firstDayOfWeek + i) % 7]);
        }
    }

    const rowCount = Math.ceil(days.length / 7);

    return html`
      <link rel="stylesheet" href="/local/ha-controls/calendar-grid-card/calendar-grid-card.css?v=0.0.25">
      <ha-card>
        <div class="header">
            <div class="month-title">${monthName}</div>
            <div class="controls">
                <div class="control-button" @click=${this._prevMonth}>
                    <ha-icon icon="mdi:chevron-left"></ha-icon>
                </div>
                <div class="control-button today" @click=${this._today}>
                    Today
                </div>
                <div class="control-button" @click=${this._nextMonth}>
                    <ha-icon icon="mdi:chevron-right"></ha-icon>
                </div>
            </div>
        </div>

        <div class="calendar-grid" style="grid-template-rows: min-content repeat(${rowCount}, 1fr);">
            ${weekDays.map(d => html`<div class="day-header">${d}</div>`)}
            
            ${days.map(day => {
                const dateStr = day.toISOString().split('T')[0];
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                const isCurrentMonth = day.getMonth() === this._currentDate.getMonth();
                const dayEvents = this._getEventsForDay(dateStr, this._events);

                return html`
                    <div class="day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}">
                        <div class="day-number">${day.getDate()}</div>
                        <div class="events-container">
                            ${dayEvents.map(event => html`
                                <calendar-grid-card-event 
                                    .event=${event} 
                                    .day=${day}
                                    @event-click=${this._onEventClick}
                                ></calendar-grid-card-event>`)}
                        </div>
                    </div>
                `;
            })}
        </div>
      </ha-card>
    `;
  }

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