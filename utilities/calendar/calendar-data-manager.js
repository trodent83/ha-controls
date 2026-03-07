import { CalendarEventModel } from "./calendar-event-model.js";

export class CalendarDataManager {
    constructor(hass) {
        this.hass = hass;
    }

    async fetchEvents(entities, start, end) {
        // If Home Assistant instance is not available, return empty list
        if (!this.hass) return [];

        const startStr = start.toISOString();
        const endStr = end.toISOString();

        let allEvents = [];
        const fetchedEntityIds = new Set();

        for (const entityConf of entities) {
            const entityId = typeof entityConf === "object" ? entityConf.entity : entityConf;

            // Avoid fetching the same entity multiple times
            if (fetchedEntityIds.has(entityId)) {
                continue;
            }

            try {
                const path = `calendars/${entityId}?start=${startStr}&end=${endStr}`;
                const events = await this.hass.callApi("GET", path);
                fetchedEntityIds.add(entityId);

                // Validate response
                if (!events || !Array.isArray(events)) continue;

                const filteredEvents = this._filterEvents(events, entityConf);
                allEvents = allEvents.concat(
                    filteredEvents.map((e) => new CalendarEventModel({ ...e, entity_id: entityId }))
                );
            } catch (e) {
                console.error(`Error fetching calendar events for ${entityId}`, e);
            }
        }

        // Sort events by start time
        allEvents.sort((a, b) => {
            return a.start - b.start;
        });

        return allEvents;
    }

    _filterEvents(events, entityConf) {
        // If configuration is simple string, no filters apply
        if (typeof entityConf !== 'object') return events;

        const filters = [];
        if (entityConf.filters) {
            filters.push(...entityConf.filters);
        }
        // Support legacy single filter configuration
        if (entityConf.filter) {
            filters.push({ pattern: entityConf.filter, case_sensitive: entityConf.case_sensitive });
        }

        // If no filters defined, return original events
        if (filters.length === 0) return events;

        return events.filter(event => {
            // Check if event matches any exclusion filter
            return !filters.some(filter => {
                if (!filter || !filter.pattern) return false;
                try {
                    const flags = filter.case_sensitive === false ? 'i' : '';
                    return new RegExp(filter.pattern, flags).test(event.summary || '');
                } catch (e) {
                    console.warn(`Invalid regex filter: ${filter.pattern}`);
                    return false;
                }
            });
        });
    }
}