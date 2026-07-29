import { HAControlThresholdBase, html } from "../ha-control-threshold-base.js?v=0.6.9";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.2';

/**
 * NavigationBarCard
 * A custom Home Assistant Lovelace card that displays a row of capsule navigation tabs.
 * Supports auto-detection of the active tab, counter notification badges,
 * and priority threshold-based colors/icons/animations.
 * 
 * @extends HAControlThresholdBase
 */
class NavigationBarCard extends HAControlThresholdBase {
  static get properties() {
    return {
      ...super.properties,
      config: {},
      _filteredCounts: { type: Object }
    };
  }

  constructor() {
    super();
    this._filteredCounts = {};
    this._lastFetchedStates = {};
  }

  static getConfigElement() {
    return document.createElement("navigation-bar-card-editor");
  }

  get translationPath() { return "/local/ha-controls/navigation-bar-card/translations"; }

  get translationVersion() { return VERSION; }

  static getStubConfig() {
    return {
      items: [
        {
          content: "Home",
          icon: "mdi:home",
          navigation_path: "/eg-dashboard/0"
        },
        {
          content: "Tasks",
          icon: "mdi:calendar",
          navigation_path: "/eg-dashboard/1"
        },
        {
          content: "Overview",
          icon: "mdi:thermometer",
          navigation_path: "/eg-dashboard/2"
        }
      ]
    };
  }

  /**
   * Helper utility checking numeric or string status thresholds.
   * Compares the threshold value in the configured threshold object.
   * 
   * @param {string|number} stateValue - Active state value of the entity
   * @param {string|number} thresholdValue - Configuration threshold value to match
   * @returns {boolean} True if matching, false otherwise
   * @private
   */
  _checkThresholdMatch(stateValue, thresholdValue) {
    if (stateValue === undefined || stateValue === null || thresholdValue === undefined || thresholdValue === null) return false;
    const stringState = String(stateValue).toLowerCase();
    const stringThreshold = String(thresholdValue).toLowerCase();

    // Exact string match
    if (stringState === stringThreshold) return true;

    // Numeric comparison match (parseFloat)
    const numericState = parseFloat(stateValue);
    const numericThreshold = parseFloat(thresholdValue);
    if (!isNaN(numericState) && !isNaN(numericThreshold)) {
      return numericState >= numericThreshold;
    }
    return false;
  }

  /**
   * Lifecycle hook. Checks if configuration or entities have changed state,
   * triggering async fetches for filtered counters.
   * 
   * @param {Map<string, any>} changedProps - Changed properties
   */
  updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("hass") || changedProps.has("config")) {
      this._updateFilteredCounts();
    }
  }

  /**
   * Fetches, filters, and caches task list item counts and calendar events counts.
   * Performs comparisons on last_updated timestamps to eliminate redundant fetches.
   * 
   * @private
   * @async
   */
  async _updateFilteredCounts() {
    if (!this.hass || !this.config) return;

    const items = this.config.items || [];

    // Synchronous pre-check: skip the async work entirely if no entity timestamps have changed
    const anyChanged = items.some((item, idx) => {
      if (!item.show_counter || !item.entity) return false;
      const stateObj = this.hass.states[item.entity];
      if (!stateObj) return false;
      return this._lastFetchedStates[item.entity] !== stateObj.last_updated;
    });
    if (!anyChanged) return;

    const newCounts = { ...this._filteredCounts };
    let needsUpdate = false;

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      if (!item.show_counter || !item.entity) continue;

      const entityId = item.entity;
      const stateObj = this.hass.states[entityId];
      if (!stateObj) continue;

      const lastUpdated = stateObj.last_updated;
      if (this._lastFetchedStates[entityId] === lastUpdated) {
        continue;
      }

      this._lastFetchedStates[entityId] = lastUpdated;
      needsUpdate = true;

      // Use pre-compiled regex filters from setConfig
      const compiledFilters = this._compiledItemFilters?.[idx] || [];

      if (entityId.startsWith("todo.")) {
        try {
          const response = await this.hass.callWS({
            type: "todo/item/list",
            entity_id: entityId
          });

          if (response && response.items) {
            let tasks = response.items;

            if (compiledFilters.length > 0) {
              tasks = tasks.filter(t => {
                const text = t.summary || '';
                return !compiledFilters.some(regex => regex.test(text));
              });
            }

            // Apply show_completed
            const showCompleted = item.show_completed === true;
            if (!showCompleted) {
              tasks = tasks.filter(t => t.status !== 'completed');
            }

            // Apply show_no_due_date
            const showNoDueDate = item.show_no_due_date !== false;
            if (!showNoDueDate) {
              tasks = tasks.filter(t => t.due);
            }

            // Apply max_days
            const maxDays = item.max_days !== undefined && item.max_days !== null && item.max_days !== '' ? parseInt(item.max_days) : null;
            if (maxDays !== null) {
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() + maxDays);
              cutoff.setHours(23, 59, 59, 999);

              tasks = tasks.filter(t => {
                if (t.due) return new Date(t.due) <= cutoff;
                return true;
              });
            }

            newCounts[idx] = tasks.length;
          } else {
            newCounts[idx] = 0;
          }
        } catch (e) {
          console.error("Error fetching filtered tasks for navigation bar", entityId, e);
          newCounts[idx] = 0;
        }
      } else if (entityId.startsWith("calendar.")) {
        try {
          const start = new Date();
          start.setHours(0, 0, 0, 0);

          const maxDays = item.max_days !== undefined && item.max_days !== null && item.max_days !== '' ? parseInt(item.max_days) : 7;
          const end = new Date();
          end.setDate(end.getDate() + maxDays);
          end.setHours(23, 59, 59, 999);

          const startStr = start.toISOString();
          const endStr = end.toISOString();
          const path = `calendars/${entityId}?start=${startStr}&end=${endStr}`;

          const events = await this.hass.callApi("GET", path);

          if (events && Array.isArray(events)) {
            let filteredEvents = events;

            if (compiledFilters.length > 0) {
              filteredEvents = filteredEvents.filter(event => {
                const text = event.summary || '';
                return !compiledFilters.some(regex => regex.test(text));
              });
            }

            const showFinished = item.show_finished_events !== false;
            if (!showFinished) {
              const now = new Date();
              filteredEvents = filteredEvents.filter(e => {
                const endDt = e.end?.dateTime ? new Date(e.end.dateTime) : (e.end?.date ? new Date(e.end.date) : null);
                return endDt && endDt >= now;
              });
            }

            const maxItems = item.max_items !== undefined && item.max_items !== null && item.max_items !== '' ? parseInt(item.max_items) : null;
            if (maxItems !== null) {
              filteredEvents = filteredEvents.slice(0, maxItems);
            }

            newCounts[idx] = filteredEvents.length;
          } else {
            newCounts[idx] = 0;
          }
        } catch (e) {
          console.error("Error fetching filtered events for navigation bar", entityId, e);
          newCounts[idx] = 0;
        }
      }
    }

    if (needsUpdate) {
      this._filteredCounts = newCounts;
      this.requestUpdate();
    }
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const items = this.config.items || [];
    const currentPath = window.location.pathname;

    return html`
      ${this.renderStyle('navigation-bar-card.css')}
      <div class="nav-bar-container">
        ${items.map((item, idx) => {
      const entityId = item.entity;
      const stateObj = entityId ? this.hass.states[entityId] : null;
      const stateValue = stateObj ? stateObj.state : null;

      // Defaults
      let color = item.color || '';
      let icon = item.icon || 'mdi:circle-outline';
      let animation = '';

      // Resolve thresholds sequentially (first match wins priority)
      if (item.thresholds && Array.isArray(item.thresholds)) {
        for (const t of item.thresholds) {
          const targetEntityId = t.entity || entityId;
          if (!targetEntityId) continue;

          let targetValue;
          if (targetEntityId === entityId && (entityId.startsWith("todo.") || entityId.startsWith("calendar."))) {
            const val = this._filteredCounts[idx];
            targetValue = val !== undefined ? val : (stateValue && !isNaN(parseFloat(stateValue)) ? parseFloat(stateValue) : 0);
          } else {
            const targetStateObj = this.hass.states[targetEntityId];
            if (!targetStateObj) continue;
            targetValue = targetStateObj.state;
          }

          if (this._checkThresholdMatch(targetValue, t.value)) {
            if (t.color !== undefined) color = t.color;
            if (t.icon !== undefined) icon = t.icon;
            if (t.animation !== undefined) animation = t.animation;
            break; // First matching rule applies
          }
        }
      }

      // Active highlighting: checks if the current URL contains the target navigation path
      const isActive = currentPath.endsWith(item.navigation_path) || window.location.href.includes(item.navigation_path);

      let itemStyle = '';
      let iconStyle = '';
      if (isActive) {
        // Highlighting primary active link
        itemStyle = `background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.12) !important; border-color: rgba(var(--rgb-primary-color, 3, 169, 244), 0.25) !important;`;
        iconStyle = `color: var(--primary-color) !important;`;
      } else if (color) {
        // Apply matched custom threshold styles
        itemStyle = `border-color: ${color} !important;`;
        iconStyle = `color: ${color} !important;`;
      }

      // Counter value lookup
      let counterValue = 0;
      let showCounter = false;

      if (item.show_counter && entityId) {
        if (entityId.startsWith("todo.") || entityId.startsWith("calendar.")) {
          const val = this._filteredCounts[idx];
          counterValue = val !== undefined ? val : (stateValue && !isNaN(parseFloat(stateValue)) ? parseFloat(stateValue) : 0);
        } else {
          counterValue = stateValue && !isNaN(parseFloat(stateValue)) ? parseFloat(stateValue) : 0;
        }
        showCounter = counterValue > 0;
      }

      return html`
            <div class="nav-item ${isActive ? 'active' : ''} ${animation}" 
                 style="${itemStyle}"
                 @click="${() => this._navigate(item.navigation_path)}">
              <ha-icon .icon="${icon}" style="${iconStyle}"></ha-icon>
              <span class="nav-label">${item.content}</span>
              ${showCounter ? html`<span class="nav-counter" style="${color ? `background-color: ${color};` : ''}">${Math.round(counterValue)}</span>` : ''}
            </div>
          `;
    })}
      </div>
    `;
  }

  _navigate(path) {
    if (!path) return;
    this.dispatchEvent(new CustomEvent("hass-action", {
      detail: {
        config: {
          tap_action: {
            action: 'navigate',
            navigation_path: path
          }
        },
        action: 'tap'
      },
      bubbles: true,
      composed: true
    }));
  }

  setConfig(config) {
    this.config = {
      items: [],
      ...config
    };
    // Pre-compile regex filters for each item to avoid recompilation on every update
    this._compiledItemFilters = (this.config.items || []).map(item => {
      const filters = [];
      if (item.filters) filters.push(...item.filters);
      if (item.filter) filters.push({ pattern: item.filter, case_sensitive: item.case_sensitive });
      return filters
        .filter(f => f && f.pattern)
        .map(f => {
          try {
            return new RegExp(f.pattern, f.case_sensitive === false ? 'i' : '');
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);
    });
  }
}

customElements.define("navigation-bar-card", NavigationBarCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "navigation-bar-card",
  name: "Navigation Bar Card",
  description: "A custom horizontal navigation bar with dynamic counters, alerts, and priority thresholds.",
  preview: true,
});
