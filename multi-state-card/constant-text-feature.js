import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

/**
 * Cache-busting version parameter for dynamic asset loading.
 * @type {string}
 */
const VERSION = "1.0.0";

/**
 * ConstantTextFeature
 * A custom Lovelace card feature (for use in Multi State cards)
 * that renders customizable static text with override styles (colors, sizes, alignments).
 * 
 * @extends HAControlBase
 */
class ConstantTextFeature extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Tracks config, parent stateObj, and active styling color.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return {
      hass: { attribute: false },
      config: { state: true },
      stateObj: { attribute: false },
      color: { state: true }
    };
  }

  /**
   * Creates and returns the configuration editor element for this card feature.
   * 
   * @static
   * @returns {HTMLElement} The constant-text-feature-editor configuration element
   */
  static getConfigElement() {
    return document.createElement("constant-text-feature-editor");
  }

  /**
   * Returns default stub configuration details for this custom feature card.
   * 
   * @static
   * @returns {Object} Stub configuration details
   */
  static getStubConfig() {
    return {
      type: "custom:constant-text-feature",
      text: "Constant Text",
      color: "var(--primary-text-color)",
      font_size: "12px",
      font_weight: "normal",
      text_align: "center"
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
   * Renders the constant text visual display block layout.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this.config) return html``;

    const text = this.config.text || "";
    const featureColor = this.config.color || this.color || 'var(--primary-text-color)';
    const style = `
      color: ${featureColor};
      font-size: ${this.config.font_size || 'inherit'};
      font-weight: ${this.config.font_weight || 'normal'};
      text-align: ${this.config.text_align || 'center'};
    `;

    return html`<div style="${style}">${text}</div>`;
  }
}

customElements.define("constant-text-feature", ConstantTextFeature);

window.customCardFeatures = window.customCardFeatures || [];
window.customCardFeatures.push({
  type: "custom:constant-text-feature",
  name: "Constant Text",
  configurable: true,
  tags: ["multi-state-card"],
});