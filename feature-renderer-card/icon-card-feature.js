import { HAControlThresholdBase, html } from "../ha-control-threshold-base.js?v=0.6.3";

/**
 * Cache-busting version parameter for dynamic asset loading.
 * @type {string}
 */
const VERSION = "1.0.0";

/**
 * IconCardFeature
 * A custom Lovelace card feature that renders highly dynamic, expression-driven or threshold-driven icons.
 * 
 * @extends HAControlThresholdBase
 */
class IconCardFeature extends HAControlThresholdBase {
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
   * @returns {HTMLElement} The icon-card-feature-editor configuration element
   */
  static getConfigElement() {
    return document.createElement("icon-card-feature-editor");
  }

  /**
   * Returns default stub configuration details for this custom feature card.
   * 
   * @static
   * @returns {Object} Stub configuration details
   */
  static getStubConfig() {
    return {
      type: "custom:icon-card-feature",
      icon: "mdi:circle-outline",
      color: "",
      size: "24px",
      animation: ""
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
      console.error("[IconCardFeature] Error evaluating expression:", expr, e);
      return undefined;
    }
  }

  /**
   * Resolves the dynamic state value of target property or attribute.
   * 
   * @param {Object} stateObj - Target state object
   * @private
   * @returns {any} Evaluated status value
   */
  _getTargetValue(stateObj) {
    if (!stateObj) return undefined;
    if (this.config.attribute) {
      return stateObj.attributes[this.config.attribute];
    }
    if (this.config.state_property) {
      return stateObj[this.config.state_property];
    }
    return stateObj.state;
  }

  /**
   * Renders the icon card feature.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this.config) return html``;

    // Use explicit overridden entity or fallback to parent card stateObj
    const entityId = this.config.entity || this.stateObj?.entity_id;
    const stateObj = entityId ? this.hass.states[entityId] : null;
    const domain = entityId ? entityId.split(".")[0] : "unknown";
    const deviceClass = stateObj?.attributes?.device_class;

    const value = this._getTargetValue(stateObj);

    // 1. Resolve Icon
    let finalIcon = undefined;
    if (this.config.icon_expression) {
      finalIcon = this._evalExpression(this.config.icon_expression, stateObj);
    }
    if (finalIcon === undefined && value !== undefined) {
      finalIcon = this._getMatchedProperty(value, this.config.thresholds, 'icon');
    }
    if (finalIcon === undefined && value !== undefined && this.config.state_icons) {
      const lowerVal = String(value).toLowerCase();
      finalIcon = this.config.state_icons[lowerVal] ?? this.config.state_icons[value];
    }
    if (finalIcon === undefined) {
      finalIcon = this.config.icon || stateObj?.attributes?.icon || this._getFallbackIcon(domain, deviceClass);
    }

    // 2. Resolve Color
    let finalColor = undefined;
    if (this.config.color_expression) {
      finalColor = this._evalExpression(this.config.color_expression, stateObj);
    }
    if (finalColor === undefined && value !== undefined) {
      finalColor = this._getMatchedProperty(value, this.config.thresholds, 'color');
    }
    if (finalColor === undefined && value !== undefined && this.config.state_colors) {
      const lowerVal = String(value).toLowerCase();
      finalColor = this.config.state_colors[lowerVal] ?? this.config.state_colors[value];
    }
    if (finalColor === undefined) {
      finalColor = this.config.color || this.color || 'var(--primary-text-color)';
    }

    // 3. Resolve Animation
    let finalAnim = undefined;
    if (this.config.animation_expression) {
      finalAnim = this._evalExpression(this.config.animation_expression, stateObj);
    }
    if (finalAnim === undefined && value !== undefined) {
      finalAnim = this._getMatchedProperty(value, this.config.thresholds, 'animation');
    }
    if (finalAnim === undefined && value !== undefined && this.config.state_animations) {
      const lowerVal = String(value).toLowerCase();
      finalAnim = this.config.state_animations[lowerVal] ?? this.config.state_animations[value];
    }
    if (finalAnim === undefined) {
      finalAnim = this.config.animation || '';
    }

    // 4. Sizing
    const rawSize = this.config.size || "24px";
    const size = isNaN(rawSize) ? rawSize : `${rawSize}px`;

    const style = `
      --mdc-icon-size: ${size};
      color: ${finalColor};
    `;

    return html`
      ${this.renderStyle('icon-card-feature.css')}
      ${this.renderStyle('shared-animations.css')}
      <div class="icon-feature-container" style="${style}">
        <ha-icon .icon="${finalIcon}" class="${finalAnim}"></ha-icon>
      </div>
    `;
  }
}

customElements.define("icon-card-feature", IconCardFeature);

window.customCardFeatures = window.customCardFeatures || [];
window.customCardFeatures.push({
  type: "custom:icon-card-feature",
  name: "Icon Display",
  configurable: true,
  tags: ["multi-state-card", "multi-property-card", "room-status-card"],
});
