import { HAControlThresholdBase, html } from "../ha-control-threshold-base.js?v=0.6.9";

/**
 * Cache-busting version parameter for dynamic asset loading.
 * @type {string}
 */
const VERSION = "1.0.0";

/**
 * ProgressBarFeature
 * A custom Lovelace card feature (for use in Multi State cards, Multi Property cards, or Tile cards)
 * that renders entity states or numerical attributes as a sleek, animated progress bar.
 * 
 * @extends HAControlThresholdBase
 */
class ProgressBarFeature extends HAControlThresholdBase {
  static get properties() {
    return {
      ...super.properties,
      config: { state: true },
      stateObj: { attribute: false },
      color: { state: true }
    };
  }

  get translationPath() { return "/local/ha-controls/feature-renderer-card/translations"; }
  get translationVersion() { return VERSION; }

  static getConfigElement() {
    return document.createElement("progress-bar-feature-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:progress-bar-feature",
      name: "Progress Bar",
      icon: "mdi:progress-clock",
      min: 0,
      max: 100
    };
  }

  setConfig(config) {
    this.config = config;
  }

  render() {
    if (!this.hass || !this.config) return html``;

    const entityId = this.config.entity || this.stateObj?.entity_id;
    if (!entityId) return html`<div class="error">${this._localize('invalid_entity')}</div>`;

    const stateObj = this.hass.states[entityId];
    if (!stateObj) return html`<div class="error">${this._localize('entity_not_found')}</div>`;

    const rawState = stateObj.state;
    const isUnavailable = rawState === 'unavailable' || rawState === 'unknown' || rawState === undefined || rawState === null;

    const numVal = parseFloat(rawState);
    const min = parseFloat(this.config.min ?? 0);
    const max = parseFloat(this.config.max ?? 100);
    const range = Math.max(0.001, max - min);

    let percent = isNaN(numVal) ? 0 : Math.min(100, Math.max(0, ((numVal - min) / range) * 100));
    if (this.config.reverse || this.config.reverse_bar) {
      percent = 100 - percent;
    }

    const matchColor = this._getMatchedProperty(rawState, this.config.thresholds, 'color');
    const matchAnim = this._getMatchedProperty(rawState, this.config.thresholds, 'animation');
    const finalColor = isUnavailable ? 'var(--disabled-text-color)' : (matchColor || this.config.color || this.color || 'var(--primary-color)');
    const finalAnim = matchAnim || this.config.animation || '';

    const icon = this.config.icon || stateObj.attributes?.icon || 'mdi:progress-clock';
    const name = this.config.name ?? this.config.label ?? stateObj.attributes?.friendly_name ?? '';
    const unit = this.config.unit !== undefined ? this.config.unit : (stateObj.attributes?.unit_of_measurement || '%');
    const showIcon = this.config.show_icon !== false;
    const showLabel = this.config.show_label !== false;
    const showValue = this.config.show_value !== false;

    return html`
      ${this.renderStyle('progress-bar-feature.css')}
      ${this.renderStyle('shared-animations.css')}
      <div class="progress-bar-feature-container ${isUnavailable ? 'is-unavailable' : ''}" style="color: ${finalColor};">
        <div class="progress-header">
          ${showIcon ? html`<ha-icon .icon="${icon}" class="${finalAnim}"></ha-icon>` : ''}
          ${showLabel ? html`<span class="progress-title">${name}</span>` : ''}
          ${showValue ? html`<span class="progress-value">${rawState}${unit}</span>` : ''}
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width: ${percent}%; background-color: ${finalColor};"></div>
        </div>
      </div>
    `;
  }
}

customElements.define("progress-bar-feature", ProgressBarFeature);

window.customCardFeatures = window.customCardFeatures || [];
window.customCardFeatures.push({
  type: "custom:progress-bar-feature",
  name: "Progress Bar Display",
  configurable: true,
  tags: ["multi-state-card", "multi-property-card", "room-status-card"],
});
