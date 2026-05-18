import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

class MultiStateFeatureRenderer extends HAControlBase {
  static get properties() {
    return {
      hass: { attribute: false },
      config: { attribute: false },
      stateObj: { attribute: false },
      color: { attribute: false }
    };
  }

  render() {
    if (!this.config || !this.config.type) return html``;
    let tag = this.config.type;

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
      this._el.color = this.color;
    }
    return html`${this._el}`;
  }
}

if (!customElements.get("multi-state-feature-renderer")) {
  customElements.define("multi-state-feature-renderer", MultiStateFeatureRenderer);
}