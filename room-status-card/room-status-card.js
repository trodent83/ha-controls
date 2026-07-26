import { HAControlBase, html } from "../ha-control-base.js?v=0.6.9";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.26';

/**
 * RoomStatusCard
 * A custom Home Assistant Lovelace dashboard card that presents room status at a glance.
 * Displays room header title/icon and a row of status badges.
 * Badge contents are completely dynamic and determined by nested custom features.
 * 
 * @extends HAControlBase
 */
class RoomStatusCard extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Inherits properties from HAControlBase and tracks the config object.
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
          color: "var(--primary-text-color)",
          features: [
            {
              type: "custom:icon-card-feature",
              icon: "mdi:thermometer"
            },
            {
              type: "custom:state-value-feature"
            }
          ]
        }
      ]
    };
  }

  /**
   * Renders the custom card's HTML template.
   * Generates header blocks and parses status badges list applying dynamic child features.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this.config) return html``;

    const header_settings = this.config.header_settings || {};
    const show_header = header_settings.show_header !== false; // Default true
    const show_icon = header_settings.show_icon !== false;     // Default true
    const heading_style = header_settings.heading_style || 'subtitle'; // Default subtitle

    const badges = this.config.badges || [];

    return html`
      ${this.renderStyle('room-status-card.css')}
      <ha-card>
        <div class="card-content ${heading_style}">
          <div class="header_container ${heading_style}">
          ${show_icon ? html`<ha-icon .icon="${this.config.icon || 'mdi:home'}"></ha-icon>` : ''}
          ${show_header ? html`<span class="room_title">${this.config.name}</span>` : ''}
          </div>
          <div class="status_badges">
          ${badges.map(badgeConfig => {
            const entityId = badgeConfig.entity;
            const stateObj = entityId ? this.hass.states[entityId] : null;

            const finalColor = badgeConfig.color || 'var(--primary-text-color)';

            return html`
              <div class="status_badge" style="--badge-color: ${finalColor}">
                ${(badgeConfig.features && Array.isArray(badgeConfig.features)) ? html`
                  ${badgeConfig.features.filter(featureConfig => {
                    if (featureConfig.condition) {
                      try {
                        const hass = this.hass;
                        const entity = stateObj;
                        const state = stateObj?.state;
                        const attributes = stateObj?.attributes;
                        return eval(featureConfig.condition);
                      } catch (e) {
                        console.error("Error evaluating condition for feature", featureConfig, e);
                        return false;
                      }
                    }
                    return true;
                  }).map(featureConfig => html`
                    <feature-renderer-card
                      .hass=${this.hass}
                      .config=${featureConfig}
                      .stateObj=${stateObj}
                      .color=${finalColor}
                    ></feature-renderer-card>
                  `)}
                ` : ''}
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
  description: "A 2026 styled room status badge card with dynamic nested features",
  preview: true,
});