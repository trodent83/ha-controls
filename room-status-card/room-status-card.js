import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.20';

class RoomStatusCard extends HAControlBase {
  static get properties() {
    return { ...super.properties, config: {} };
  }

  get translationPath() { return "/local/ha-controls/room-status-card/translations"; }
  get translationVersion() { return VERSION; }

  //Returns the editor for this control
  static getConfigElement() {
    return document.createElement("room-status-card-editor");
  }

  //Returns the default settings
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

  _getMatchedProperty(stateValue, thresholds, propertyName) {
    if (!thresholds || !Array.isArray(thresholds) || stateValue === undefined || stateValue === null) return null;
    const stringState = String(stateValue).toLowerCase();

    const exactMatch = thresholds.find(t => String(t.value).toLowerCase() === stringState);
    if (exactMatch && exactMatch[propertyName] !== undefined) return exactMatch[propertyName];

    const numericValue = parseFloat(stateValue);
    if (!isNaN(numericValue)) {
      const numericThresholds = thresholds
        .filter(t => t.value !== undefined && t.value !== null && !isNaN(parseFloat(t.value)) && t[propertyName] !== undefined)
        .sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
      
      const match = numericThresholds.find(t => numericValue >= parseFloat(t.value));
      if (match) return match[propertyName];
    }
    return null;
  }

  //Renders the control
  render() {
    if (!this.hass || !this.config) return html``;

    const header_settings = this.config.header_settings || {};
    const show_header = header_settings.show_header !== false; // Default true
    const show_icon = header_settings.show_icon !== false;     // Default true

    const badges = this.config.badges || [];

    return html`
      <link rel="stylesheet" href="/local/ha-controls/room-status-card/room-status-card.css?v=${VERSION}">
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

  setConfig(config) {
    this.config = config;
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