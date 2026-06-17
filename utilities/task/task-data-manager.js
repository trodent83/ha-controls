/**
 * TaskDataManager
 * Utility class to query, filter, and fetch todo list items from Home Assistant.
 * Connects over WebSocket calls and processes regular expression filters.
 */
export class TaskDataManager {
  /**
   * Instantiates TaskDataManager.
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
   * Queries Home Assistant over WS to fetch todo items from configured entities in parallel,
   * applying precompiled regex patterns to filter matching elements.
   * 
   * @param {Array<string|Object>} entities - Configured list of entities (either strings or config objects)
   * @async
   * @returns {Promise<Array<Object>>} Asynchronous promise containing the processed items list
   */
  async fetchTasks(entities) {
    if (!this.hass || !entities || entities.length === 0) return [];

    const fetchPromises = entities.map(async (entityConf) => {
      // Determine the entity ID from either an object or a string
      const entity_id = typeof entityConf === 'object' ? entityConf.entity : entityConf;

      // Skip if the entity does not exist in the current Home Assistant state
      if (!this.hass.states[entity_id]) return [];

      try {
        // Fetch the list of items for the todo entity via WebSocket
        const response = await this.hass.callWS({
          type: "todo/item/list",
          entity_id
        });

        // Skip if the response is invalid or contains no items (Early Return Pattern)
        if (!response || !response.items) return [];

        let items = response.items;

        // Process filters only if the entity configuration is an object
        if (typeof entityConf === 'object') {
          // Gather all filters defined in the entity configuration
          const filters = [];
          if (entityConf.filters) {
            filters.push(...entityConf.filters);
          }
          if (entityConf.filter) {
            filters.push({ pattern: entityConf.filter, case_sensitive: entityConf.case_sensitive });
          }

          // Precompile regex filters to reduce overhead in loop iterations
          const compiledFilters = filters
            .filter(f => f && f.pattern)
            .map(f => {
              try {
                const flags = f.case_sensitive === false ? 'i' : '';
                return new RegExp(f.pattern, flags);
              } catch (e) {
                console.warn(`Invalid regex filter for ${entity_id}: ${f.pattern}`);
                return null;
              }
            })
            .filter(Boolean);

          // Apply precompiled filters if any are defined
          if (compiledFilters.length > 0) {
            items = items.filter(item => {
              const text = item.summary || '';
              return !compiledFilters.some(regex => regex.test(text));
            });
          }
        }

        // Map the items to include the entity_id
        return items.map(item => ({ ...item, entity_id }));
      } catch (e) {
        console.error("Error fetching items for", entity_id, e);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    return results.flat();
  }
}