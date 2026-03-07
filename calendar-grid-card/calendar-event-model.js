export class CalendarEventModel {
    constructor(originEvent) {
        this.originEvent = originEvent;
        this._start = new Date(originEvent.start.dateTime || originEvent.start.date);
        this._end = new Date(originEvent.end.dateTime || originEvent.end.date);
    }

    get start() { return this._start; }
    get end() { return this._end; }
    get summary() { return this.originEvent.summary; }
    get entity_id() { return this.originEvent.entity_id; }
    
    get isAllDay() {
        return !this.originEvent.start.dateTime;
    }

    getTimeStr(dayDate, locale = []) {
        if (this.isAllDay) return "";
        if (this.start.toDateString() === dayDate.toDateString()) {
            return this.start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        }
        return "";
    }
}