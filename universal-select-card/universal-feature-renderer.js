import { HAControlBase, html } from "../ha-control-base.js?v=0.5.1";

class UniversalFeatureRenderer extends HAControlBase {
  static get properties() {
    return {
      hass: { attribute: false },
      config: { attribute: false },
      stateObj: { attribute: false }
    };
  }

  render() {
    if (!this.config || !this.config.type) return html``;
    let tag = this.config.type;
    
    // Normalize tag name for custom vs native HA features
    if (tag.startsWith("custom:")) {
      tag = tag.slice(7);
    } else if (!tag.startsWith("hui-")) {
      tag = `hui-${tag}-card-feature`;
    }
    
    if (this._tag !== tag) {
      this._tag = tag;
      this._el = document.createElement(tag);
    }
    if (this._el) {
      this._el.hass = this.hass;
      this._el.config = this.config;
      this._el.stateObj = this.stateObj;
    }
    return html`${this._el}`;
  }
}
if (!customElements.get("universal-feature-renderer")) {
  customElements.define("universal-feature-renderer", UniversalFeatureRenderer);
}