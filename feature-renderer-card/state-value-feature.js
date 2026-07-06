import { HAControlThresholdBase, html } from "../ha-control-threshold-base.js?v=0.6.8";

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
  /**
   * Evaluates JavaScript expression securely in a local closure scope.
   * 
   * @param {string} expr - Expression string
   * @param {Object} stateObj - Entity state object
   * @private
   * @returns {any} Result of evaluation
   */
  _evalExpression(expr, stateObj) {
    if (!expr) return undefined;
    try {
      const hass = this.hass;
      const entity = stateObj;
      const state = stateObj?.state;
      const attributes = stateObj?.attributes || {};
      return eval(expr);
    } catch (e) {
      console.error("[StateValueFeature] Error evaluating expression:", expr, e);
      return undefined;
    }
  }

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

    // Evaluate expressions or fallback to static configuration
    let prefix = this.config.prefix || '';
    if (this.config.prefix_expression) {
      prefix = this._evalExpression(this.config.prefix_expression, stateObj) ?? prefix;
    }

    let suffix = this.config.suffix || '';
    if (this.config.suffix_expression) {
      suffix = this._evalExpression(this.config.suffix_expression, stateObj) ?? suffix;
    }

    // Threshold or expression evaluation on raw state
    const rawState = stateObj.state;

    let matchedColor = undefined;
    if (this.config.color_expression) {
      matchedColor = this._evalExpression(this.config.color_expression, stateObj);
    }
    if (matchedColor == null) {
      matchedColor = this._getMatchedProperty(rawState, this.config.thresholds, 'color');
    }

    let matchedAnim = undefined;
    if (this.config.animation_expression) {
      matchedAnim = this._evalExpression(this.config.animation_expression, stateObj);
    }
    if (matchedAnim == null) {
      matchedAnim = this._getMatchedProperty(rawState, this.config.thresholds, 'animation');
    }

    const featureColor = matchedColor || this.config.color || this.color || 'inherit';
    const matchedAnimClass = matchedAnim || '';

    const style = `
      color: ${featureColor};
      font-size: ${this.config.font_size || 'inherit'};
      font-weight: ${this.config.font_weight || 'normal'};
      text-align: ${this.config.text_align || 'center'};
    `;

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
