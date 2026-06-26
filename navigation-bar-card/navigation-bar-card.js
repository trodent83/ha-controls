import { HAControlThresholdBase, html } from "../ha-control-threshold-base.js?v=0.6.7";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.1';

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
    return { ...super.properties, config: {} };
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

  render() {
    if (!this.hass || !this.config) return html``;

    const items = this.config.items || [];
    const currentPath = window.location.pathname;

    return html`
      ${this.renderStyle('navigation-bar-card.css')}
      <div class="nav-bar-container">
        ${items.map(item => {
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
              const targetStateObj = this.hass.states[targetEntityId];
              if (!targetStateObj) continue;
              const targetValue = targetStateObj.state;

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

          // Counter badge rendering
          const showCounter = item.show_counter && stateValue !== null && !isNaN(parseFloat(stateValue)) && parseFloat(stateValue) > 0;

          return html`
            <div class="nav-item ${isActive ? 'active' : ''} ${animation}" 
                 style="${itemStyle}"
                 @click="${() => this._navigate(item.navigation_path)}">
              <ha-icon .icon="${icon}" style="${iconStyle}"></ha-icon>
              <span class="nav-label">${item.content}</span>
              ${showCounter ? html`<span class="nav-counter" style="${color ? `background-color: ${color};` : ''}">${Math.round(parseFloat(stateValue))}</span>` : ''}
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
