/**
 * CalendarEventModel
 * Data transfer object representing a single calendar event.
 * Parses raw JSON dates/attributes, determining duration metrics, all-day toggles, and localized time strings.
 */
export class CalendarEventModel {
    /**
     * Instantiates a CalendarEventModel wrapper.
     * Parses dates from originEvent start/end parameters (supporting both specific dateTime and all-day date strings).
     * 
     * @param {Object} originEvent - Raw event object fetched from Home Assistant REST API
     */
    constructor(originEvent) {
        /**
         * Raw event object from Home Assistant.
         * @type {Object}
         */
        this.originEvent = originEvent;
        /**
         * Start Date of the event.
         * @type {Date}
         * @private
         */
        this._start = new Date(originEvent.start.dateTime || originEvent.start.date);
        /**
         * End Date of the event.
         * @type {Date}
         * @private
         */
        this._end = new Date(originEvent.end.dateTime || originEvent.end.date);
    }

    /**
     * Event start Date.
     * @type {Date}
     */
    get start() { return this._start; }

    /**
     * Event end Date.
     * @type {Date}
     */
    get end() { return this._end; }

    /**
     * Event summary/title text.
     * @type {string}
     */
    get summary() { return this.originEvent.summary; }

    /**
     * Sourcing calendar entity ID.
     * @type {string}
     */
    get entity_id() { return this.originEvent.entity_id; }
    
    /**
     * Checks if this is an all-day event (lacks a specific start time).
     * 
     * @type {boolean}
     */
    get isAllDay() {
        // If dateTime is missing, it is an all-day event (only date is provided).
        return !this.originEvent.start.dateTime;
    }

    /**
     * Resolves a formatted locale-specific time string for the event (e.g. '08:00').
     * Returns an empty string if it's an all-day event or doesn't start on the selected date.
     * 
     * @param {Date} dayDate - Date context to format within
     * @param {string|Array<string>} locale - Active user regional locale settings
     * @returns {string} Locale formatted time string, or empty string
     */
    getTimeStr(dayDate, locale = []) {
        // Do not display time for all-day events
        if (this.isAllDay) return "";
        // Only display time if the event starts on the given day
        if (this.start.toDateString() !== dayDate.toDateString()) return "";

        // Format the time using the provided locale
        return this.start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }
}