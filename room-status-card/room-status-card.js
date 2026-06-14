import { HAControlThresholdBase, html } from "../ha-control-base.js?v=0.5.3";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.20';

/**
 * RoomStatusCard
 * A custom Home Assistant Lovelace dashboard card that presents room status at a glance.
 * Displays room header title/icon and a row of status badges mapped to temperature, humidity,
 * occupancy, or door/window sensors. Supports dynamic threshold-based badge coloring and pulsing animations.
 * 
 * @extends HAControlThresholdBase
 */
class RoomStatusCard extends HAControlThresholdBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Inherits properties from HAControlThresholdBase and tracks the config object.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return { ...super.properties, config: {} };
  }

  /**
   * Resolves the directory path hosting the translation localizations.
   * 
   * @type {string}
   */
  get translationPath() { return "/local/ha-controls/room-status-card/translations"; }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() { return VERSION; }

  /**
   * Creates and returns the configuration editor element for this card.
   * Home Assistant Lovelace visual editor links to this method.
   * 
   * @static
   * @returns {HTMLElement} The room-status-card-editor configuration element
   */
  static getConfigElement() {
    return document.createElement("room-status-card-editor");
  }

  /**
   * Returns default stub configuration details for this custom card.
   * Used when users click to add this card to their dashboards.
   * 
   * @static
   * @returns {Object} Stub configuration details
   */
  static getStubConfig() {
    return {
      name: "My Room",
      icon: "mdi:home",
      header_settings: {
        show_header: true,
        show_icon: true
      },
      badges: [
        {
          entity: "sensor.temperature",
          icon: "mdi:thermometer",
          thresholds: [
            { value: 25, color: "var(--error-color)", animation: "blink" }
          ]
        }
      ]
    };
  }

  /**
   * Renders the custom card's HTML template.
   * Generates header blocks and parses status badges list applying custom threshold attributes.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this.config) return html``;

    const header_settings = this.config.header_settings || {};
    const show_header = header_settings.show_header !== false; // Default true
    const show_icon = header_settings.show_icon !== false;     // Default true

    const badges = this.config.badges || [];

    return html`
      ${this.renderStyle('room-status-card.css')}
      <ha-card>
        <div class="card-content">
          <div class="header_container">
          ${show_icon ? html`<ha-icon .icon="${this.config.icon || 'mdi:home'}"></ha-icon>` : ''}
          ${show_header ? html`<span class="room_title">${this.config.name}</span>` : ''}
          </div>
          <div class="status_badges">
          ${badges.map(badgeConfig => {
      const entityId = badgeConfig.entity;
      const stateObj = entityId ? this.hass.states[entityId] : null;
      if (!stateObj) return '';

      const state = stateObj.state;
      const unit = stateObj.attributes.unit_of_measurement || '';

      const matchColor = this._getMatchedProperty(state, badgeConfig.thresholds, 'color');
      const matchAnim = this._getMatchedProperty(state, badgeConfig.thresholds, 'animation');

      const finalColor = matchColor || badgeConfig.color || 'var(--primary-text-color)';
      const finalAnim = matchAnim || badgeConfig.animation || '';
      const icon = badgeConfig.icon || stateObj.attributes.icon;
      const showIcon = badgeConfig.show_icon !== false;
      const showState = badgeConfig.show_state !== false;

      return html`
              <div class="status_badge ${finalAnim}" style="--badge-color: ${finalColor}">
                ${showIcon && icon ? html`<ha-icon .icon="${icon}"></ha-icon>` : ''}
                ${showState ? html`${state}${unit}` : ''}
              </div>
            `;
    })}
          </div>
        </div>
      </ha-card>
    `;
  }

  /**
   * Sets the user configuration object for the card, updating fallback default settings.
   * 
   * @param {Object} config - The raw configuration schema from Lovelace dashboard
   */
  setConfig(config) {
    this.config = {
      name: "Room",
      icon: "mdi:home",
      ...config
    };
  }
}

customElements.define("room-status-card", RoomStatusCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "room-status-card",
  name: "Room Status Card",
  description: "A 2026 styled room status badge card",
  preview: true,
});