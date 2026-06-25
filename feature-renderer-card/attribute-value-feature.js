import { HAControlThresholdBase, html } from "../ha-control-threshold-base.js?v=0.6.6";

/**
 * Cache-busting version parameter for dynamic asset loading.
 * @type {string}
 */
const VERSION = "1.0.2";

/**
 * AttributeValueFeature
 * A custom Lovelace card feature that renders a specific attribute value of an entity.
 * Supports prefixes, suffixes, custom styling overrides, and threshold-based colors and animations.
 * 
 * @extends HAControlThresholdBase
 */
class AttributeValueFeature extends HAControlThresholdBase {
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
   * @returns {HTMLElement} The attribute-value-feature-editor configuration element
   */
  static getConfigElement() {
    return document.createElement("attribute-value-feature-editor");
  }

  /**
   * Returns default stub configuration details for this custom feature card.
   * 
   * @static
   * @returns {Object} Stub configuration details
   */
  static getStubConfig() {
    return {
      type: "custom:attribute-value-feature",
      attribute: "",
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
   * Renders the attribute value feature.
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

    const attrKey = this.config.attribute;
    if (!attrKey) return html`<div class="error">${this._localize('attribute_required')}</div>`;

    const attrVal = stateObj.attributes[attrKey];
    const displayValue = attrVal !== undefined && attrVal !== null ? String(attrVal) : "";

    // Threshold evaluation on attribute value
    const matchedColor = this._getMatchedProperty(attrVal, this.config.thresholds, 'color');
    const matchedAnim = this._getMatchedProperty(attrVal, this.config.thresholds, 'animation');

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

    return html`
      ${this.renderStyle('attribute-value-feature.css')}
      ${this.renderStyle('shared-animations.css')}
      <div class="attribute-value-container ${matchedAnimClass}" style="${style}">
        ${prefix}${displayValue}${suffix}
      </div>
    `;
  }
}

customElements.define("attribute-value-feature", AttributeValueFeature);

window.customCardFeatures = window.customCardFeatures || [];
window.customCardFeatures.push({
  type: "custom:attribute-value-feature",
  name: "Attribute Value Display",
  configurable: true,
  tags: ["multi-state-card", "multi-property-card", "room-status-card"],
});
