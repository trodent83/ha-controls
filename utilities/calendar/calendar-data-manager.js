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
     * Queries Home Assistant REST endpoints in parallel to fetch calendar events from configured entities within
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
        if (!this.hass || !entities || entities.length === 0) return [];

        const startStr = start.toISOString();
        const endStr = end.toISOString();

        // Filter out duplicate configuration entries for the same entity
        const uniqueEntities = [];
        const seenEntityIds = new Set();
        for (const entityConf of entities) {
            const entityId = typeof entityConf === "object" ? entityConf.entity : entityConf;
            if (!seenEntityIds.has(entityId)) {
                seenEntityIds.add(entityId);
                uniqueEntities.push(entityConf);
            }
        }

        // Fetch calendar event arrays from all unique sources concurrently
        const fetchPromises = uniqueEntities.map(async (entityConf) => {
            const entityId = typeof entityConf === "object" ? entityConf.entity : entityConf;
            try {
                const path = `calendars/${entityId}?start=${startStr}&end=${endStr}`;
                const events = await this.hass.callApi("GET", path);

                // Validate response
                if (!events || !Array.isArray(events)) return [];

                const filteredEvents = this._filterEvents(events, entityConf);
                return filteredEvents.map((e) => new CalendarEventModel({ ...e, entity_id: entityId }));
            } catch (e) {
                console.error(`Error fetching calendar events for ${entityId}`, e);
                return [];
            }
        });

        const results = await Promise.all(fetchPromises);
        const allEvents = results.flat();

        // Sort events chronologically by start time
        allEvents.sort((a, b) => {
            return a.start - b.start;
        });

        return allEvents;
    }

    /**
     * Applies precompiled regular expression exclusions to discard unneeded calendar events based on configuration rules.
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

        // Precompile regex filters once to avoid compile overhead in nested loops
        const compiledFilters = filters
            .filter(f => f && f.pattern)
            .map(f => {
                try {
                    const flags = f.case_sensitive === false ? 'i' : '';
                    return new RegExp(f.pattern, flags);
                } catch (e) {
                    console.warn(`Invalid regex filter: ${f.pattern}`);
                    return null;
                }
            })
            .filter(Boolean);

        if (compiledFilters.length === 0) return events;

        return events.filter(event => {
            // Check if event matches any exclusion filter
            const text = event.summary || '';
            return !compiledFilters.some(regex => regex.test(text));
        });
    }
}