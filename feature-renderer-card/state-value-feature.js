import { HAControlThresholdBase, html } from "../ha-control-threshold-base.js?v=0.6.3";

/**
 * Cache-busting version parameter for dynamic asset loading.
 * @type {string}
 */
const VERSION = "1.0.3";

/**
 * StateValueFeature
 * A custom Lovelace card feature that renders the main formatted state value of an entity.
 * Supports prefixes, suffixes, custom styling overrides, and threshold-based colors and animations.
 * 
 * @extends HAControlThresholdBase
 */
class StateValueFeature extends HAControlThresholdBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return {
      ...super.properties,
      config: { state: true },
      stateObj: { attribute: false },
      color: { state: true }
    };
  }

  /**
   * Resolves the directory path hosting the translation localizations.
   * 
   * @type {string}
   */
  get translationPath() { return "/local/ha-controls/feature-renderer-card/translations"; }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() { return VERSION; }

  /**
   * Creates and returns the configuration editor element for this card feature.
   * 
   * @static
   * @returns {HTMLElement} The state-value-feature-editor configuration element
   */
  static getConfigElement() {
    return document.createElement("state-value-feature-editor");
  }

  /**
   * Returns default stub configuration details for this custom feature card.
   * 
   * @static
   * @returns {Object} Stub configuration details
   */
  static getStubConfig() {
    return {
      type: "custom:state-value-feature",
      prefix: "",
      suffix: "",
      color: "",
      font_size: "",
      font_weight: "normal",
      text_align: "center",
      thresholds: []
    };
  }

  /**
   * Configures visual parameters on startup.
   * 
   * @param {Object} config - Raw feature config
   */
  setConfig(config) {
    this.config = config;
  }

  /**
   * Renders the state value feature.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this.config) return html``;

    // Use explicit overridden entity or fallback to parent card stateObj
    const entityId = this.config.entity || this.stateObj?.entity_id;
    if (!entityId) return html`<div class="error">${this._localize('invalid_entity')}</div>`;

    const stateObj = this.hass.states[entityId];
    if (!stateObj) return html`<div class="error">${this._localize('entity_not_found')}</div>`;

    // Localized state formatting
    const displayValue = this.hass.formatEntityState
      ? this.hass.formatEntityState(stateObj)
      : stateObj.state;

    // Threshold evaluation on raw state
    const rawState = stateObj.state;
    const matchedColor = this._getMatchedProperty(rawState, this.config.thresholds, 'color');
    const matchedAnim = this._getMatchedProperty(rawState, this.config.thresholds, 'animation');

    const featureColor = matchedColor || this.config.color || this.color || 'inherit';
    const matchedAnimClass = matchedAnim || '';

    const style = `
      color: ${featureColor};
      font-size: ${this.config.font_size || 'inherit'};
      font-weight: ${this.config.font_weight || 'normal'};
      text-align: ${this.config.text_align || 'center'};
    `;

    const prefix = this.config.prefix || '';
    const suffix = this.config.suffix || '';

    // Prevent double-rendering units if the formatted displayValue already contains the unit/suffix
    let finalSuffix = suffix;
    if (suffix && displayValue && typeof displayValue === 'string') {
      const cleanDisplay = displayValue.trim();
      const cleanSuffix = suffix.trim();
      if (cleanDisplay.endsWith(cleanSuffix)) {
        finalSuffix = suffix.replace(cleanSuffix, '').trimEnd();
      }
    }

    return html`
      ${this.renderStyle('state-value-feature.css')}
      ${this.renderStyle('shared-animations.css')}
      <div class="state-value-container ${matchedAnimClass}" style="${style}">
        ${prefix}${displayValue}${finalSuffix}
      </div>
    `;
  }
}

customElements.define("state-value-feature", StateValueFeature);

window.customCardFeatures = window.customCardFeatures || [];
window.customCardFeatures.push({
  type: "custom:state-value-feature",
  name: "State Value Display",
  configurable: true,
  tags: ["multi-state-card", "multi-property-card", "room-status-card"],
});
