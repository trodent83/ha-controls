import { CalendarEventModel } from "./calendar-event-model.js";

/**
 * CalendarDataManager
 * Utility class to query, filter, and fetch calendar events from Home Assistant REST APIs.
 * Translates raw calendar events into CalendarEventModel class instances.
 */
export class CalendarDataManager {
    /**
     * Instantiates CalendarDataManager.
     * 
     * @param {Object} hass - Home Assistant global context instance
     */
    constructor(hass) {
        /**
         * Home Assistant global context.
         * @type {Object}
         */
        this.hass = hass;
    }

    /**
     * Queries Home Assistant REST endpoints to fetch calendar events from configured entities within
     * the specified start/end date range parameters.
     * 
     * @param {Array<string|Object>} entities - Configured list of entities (either strings or config objects)
     * @param {Date} start - Beginning boundary of range
     * @param {Date} end - Ending boundary of range
     * @async
     * @returns {Promise<Array<CalendarEventModel>>} Asynchronous promise containing the processed events model list sorted chronologically
     */
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

    /**
     * Applies regular expression exclusions to discard unneeded calendar events based on configuration rules.
     * 
     * @param {Array<Object>} events - Array of raw fetched events from Home Assistant API
     * @param {Object|string} entityConf - Configuration schema block for the source calendar entity
     * @private
     * @returns {Array<Object>} Filtered events list
     */
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