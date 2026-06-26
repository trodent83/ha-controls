import { HAControlBase, html } from "../ha-control-base.js?v=0.6.7";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.0';

/**
 * LightControlCard
 * A premium custom card that displays light row state controls.
 * Renders glowing status icons, toggle switches, and horizontal range sliders
 * for brightness, color temp, and color hue.
 * 
 * @extends HAControlBase
 */
class LightControlCard extends HAControlBase {
  static get properties() {
    return {
      ...super.properties,
      config: {}
    };
  }

  get translationPath() { return "/local/ha-controls/light-control-card/translations"; }

  get translationVersion() { return VERSION; }

  static getConfigElement() {
    return document.createElement("light-control-card-editor");
  }

  static getStubConfig() {
    return {
      entity: "light.living_room",
      show_brightness_control: true,
      show_color_temp_control: true,
      show_color_control: true,
      use_light_color: true
    };
  }

  /**
   * Set configuration options, throwing error if entity is missing.
   * 
   * @param {Object} config - Config parameters
   */
  setConfig(config) {
    if (!config.entity) {
      throw new Error("Please define a light entity");
    }
    this.config = {
      show_brightness_control: true,
      show_color_temp_control: true,
      show_color_control: true,
      use_light_color: true,
      ...config
    };
  }

  /**
   * Toggles the light state on/off.
   * 
   * @private
   */
  _toggleState(e) {
    e.stopPropagation();
    if (!this.hass || !this.config) return;
    this.hass.callService("light", "toggle", {
      entity_id: this.config.entity
    });
  }

  /**
   * Adjusts the brightness of the light.
   * Mapped from 0-100% to 0-255 mireds.
   * 
   * @param {Event} e - Input event containing range value
   * @private
   */
  _setBrightness(e) {
    if (!this.hass || !this.config) return;
    const value = parseInt(e.target.value);
    const brightness = Math.round((value / 100) * 255);
    this.hass.callService("light", "turn_on", {
      entity_id: this.config.entity,
      brightness: brightness
    });
  }

  /**
   * Adjusts the color temperature in mireds.
   * 
   * @param {Event} e - Input event containing range value
   * @private
   */
  _setColorTemp(e) {
    if (!this.hass || !this.config) return;
    const value = parseInt(e.target.value);
    this.hass.callService("light", "turn_on", {
      entity_id: this.config.entity,
      color_temp: value
    });
  }

  /**
   * Adjusts the color hue.
   * Maps selected Hue 0-360 to hs_color format [hue, 100] with full saturation.
   * 
   * @param {Event} e - Input event containing range value
   * @private
   */
  _setColorHue(e) {
    if (!this.hass || !this.config) return;
    const value = parseInt(e.target.value);
    this.hass.callService("light", "turn_on", {
      entity_id: this.config.entity,
      hs_color: [value, 100]
    });
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const entityId = this.config.entity;
    const stateObj = this.hass.states[entityId];

    if (!stateObj) {
      return html`
        <div style="color: var(--error-color); padding: 16px; border: 1px solid var(--error-color); border-radius: 8px;">
          ${this._localize('unrecognized_settings', { keys: entityId }) || `Entity not found: ${entityId}`}
        </div>
      `;
    }

    const isUnavailable = ["unavailable", "unknown"].includes(stateObj.state);
    const isOn = stateObj.state === "on";

    // Extract attributes
    const name = this.config.name || stateObj.attributes.friendly_name || entityId;
    const icon = this.config.icon || stateObj.attributes.icon || "mdi:lightbulb";
    
    const brightness = stateObj.attributes.brightness || 0;
    const brightnessPercent = Math.round((brightness / 255) * 100);

    const supportedModes = stateObj.attributes.supported_color_modes || [];
    const colorMode = stateObj.attributes.color_mode;

    const supportsBrightness = supportedModes.includes("brightness") || stateObj.attributes.brightness !== undefined;
    const supportsColorTemp = supportedModes.includes("color_temp");
    const supportsColor = supportedModes.some(m => ["hs", "rgb", "xy"].includes(m));

    const minMireds = stateObj.attributes.min_mireds || 153;
    const maxMireds = stateObj.attributes.max_mireds || 500;
    const colorTemp = stateObj.attributes.color_temp || minMireds;

    const hsColor = stateObj.attributes.hs_color || [0, 0];
    const hue = hsColor[0];

    // Glow styles calculation
    let glowStyle = "";
    if (isOn && this.config.use_light_color) {
      let lightColor = "#ffd700";
      let lightColorGlow = "rgba(255, 215, 0, 0.25)";

      if (stateObj.attributes.rgb_color && Array.isArray(stateObj.attributes.rgb_color)) {
        const rgb = stateObj.attributes.rgb_color;
        lightColor = `rgb(${rgb.join(",")})`;
        lightColorGlow = `rgba(${rgb.join(",")}, 0.25)`;
      }
      glowStyle = `--light-color: ${lightColor}; --light-color-glow: ${lightColorGlow};`;
    }

    // Status description string
    let statusText = isUnavailable 
      ? (this._localize('offline') || "Offline") 
      : (isOn 
        ? `${this._localize('on') || "On"}${supportsBrightness ? ` - ${brightnessPercent}%` : ""}` 
        : (this._localize('off') || "Off"));

    return html`
      ${this.renderStyle('light-control-card.css')}
      
      <div class="card-container ${isUnavailable ? 'is-unavailable' : ''}" style="${glowStyle}">
        <!-- Header row -->
        <div class="light-header">
          <div class="light-info" @click="${this._toggleState}">
            <div class="icon-container ${isOn ? 'is-on' : ''}">
              <ha-icon .icon="${icon}" class="light-icon"></ha-icon>
            </div>
            <div class="text-container">
              <span class="light-name">${name}</span>
              <span class="light-status">
                ${isUnavailable ? html`
                  <span class="offline-badge">
                    <ha-icon icon="mdi:cloud-off" style="--mdc-icon-size: 14px;"></ha-icon>
                    ${statusText}
                  </span>
                ` : statusText}
              </span>
            </div>
          </div>
          
          <div class="light-toggle">
            <ha-switch
              .checked="${isOn}"
              .disabled="${isUnavailable}"
              @change="${this._toggleState}"
            ></ha-switch>
          </div>
        </div>

        <!-- Sliders area (visible only when light is ON and expanded) -->
        <div class="light-controls ${isOn ? 'is-expanded' : ''}">
          <!-- Brightness control slider -->
          ${supportsBrightness && this.config.show_brightness_control ? html`
            <div class="control-row">
              <div class="control-label">
                <span>${this._localize('brightness') || 'Brightness'}</span>
                <span class="control-value">${brightnessPercent}%</span>
              </div>
              <div class="slider-container">
                <input
                  type="range"
                  class="light-slider brightness-slider"
                  min="0"
                  max="100"
                  .value="${brightnessPercent}"
                  @input="${this._setBrightness}"
                />
              </div>
            </div>
          ` : ''}

          <!-- Color temp control slider -->
          ${supportsColorTemp && this.config.show_color_temp_control ? html`
            <div class="control-row">
              <div class="control-label">
                <span>${this._localize('color_temp') || 'Color Temp'}</span>
                <span class="control-value">${stateObj.attributes.color_temp_kelvin || Math.round(1000000 / colorTemp)}K</span>
              </div>
              <div class="slider-container">
                <input
                  type="range"
                  class="light-slider temp-slider"
                  .min="${minMireds}"
                  .max="${maxMireds}"
                  .value="${colorTemp}"
                  @input="${this._setColorTemp}"
                />
              </div>
            </div>
          ` : ''}

          <!-- Hue control slider -->
          ${supportsColor && this.config.show_color_control ? html`
            <div class="control-row">
              <div class="control-label">
                <span>${this._localize('color') || 'Color Hue'}</span>
                <span class="control-value">${Math.round(hue)}°</span>
              </div>
              <div class="slider-container">
                <input
                  type="range"
                  class="light-slider hue-slider"
                  min="0"
                  max="360"
                  .value="${hue}"
                  @input="${this._setColorHue}"
                />
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

customElements.define("light-control-card", LightControlCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "light-control-card",
  name: "Light Control Card",
  description: "A premium glassmorphic control card for smart lights, supporting toggles and range adjustment sliders.",
  preview: true
});
