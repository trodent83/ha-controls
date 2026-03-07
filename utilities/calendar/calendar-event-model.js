export class CalendarEventModel {
    constructor(originEvent) {
        this.originEvent = originEvent;
        // Parse start and end dates from the event object.
        // Events can be defined with dateTime (specific time) or date (all day).
        this._start = new Date(originEvent.start.dateTime || originEvent.start.date);
        this._end = new Date(originEvent.end.dateTime || originEvent.end.date);
    }

    get start() { return this._start; }
    get end() { return this._end; }
    get summary() { return this.originEvent.summary; }
    get entity_id() { return this.originEvent.entity_id; }
    
    get isAllDay() {
        // If dateTime is missing, it is an all-day event (only date is provided).
        return !this.originEvent.start.dateTime;
    }

    getTimeStr(dayDate, locale = []) {
        // Do not display time for all-day events
        if (this.isAllDay) return "";
        // Only display time if the event starts on the given day
        if (this.start.toDateString() !== dayDate.toDateString()) return "";

        // Format the time using the provided locale
        return this.start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }
}