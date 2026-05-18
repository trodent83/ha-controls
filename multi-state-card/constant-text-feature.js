import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

const VERSION = "1.0.0";

class ConstantTextFeature extends HAControlBase {
  static get properties() {
    return {
      hass: { attribute: false },
      config: { state: true },
      stateObj: { attribute: false },
      color: { state: true }
    };
  }

  static getConfigElement() {
    return document.createElement("constant-text-feature-editor");
  }

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

  setConfig(config) {
    this.config = config;
  }

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