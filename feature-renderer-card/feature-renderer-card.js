import { HAControlBase, html } from "../ha-control-base.js?v=0.6.2";

export class FeatureRendererCard extends HAControlBase {
  static get properties() {
    return {
      hass: { attribute: false },
      config: { attribute: false },
      stateObj: { attribute: false },
      color: { attribute: false },
      event: { attribute: false }
    };
  }

  _updateFeatureElementProperties(element) {
    element.hass = this.hass;
    element.config = this.config;
    element.stateObj = this.stateObj;
    if (this.color) {
        element.color = this.color;
    }
    if (this.event) {
        element.event = this.event;
    }
  }

  render() {
    if (!this.config || !this.config.type) return html``;
    let tag = this.config.type;

    if (tag.startsWith("custom:")) {
      tag = tag.slice(7);
    } else if (!tag.startsWith("hui-")) {
      tag = `hui-${tag}-card-feature`;
    }

    if (this._tag !== tag || (!this._el && customElements.get(tag))) {
      this._tag = tag;
      if (customElements.get(tag)) {
        this._el = document.createElement(tag);
      } else {
        this._el = null;
        customElements.whenDefined(tag).then(() => {
          if (this._tag === tag) {
            this.requestUpdate();
          }
        });
      }
    }
    
    if (this._el) {
      this._updateFeatureElementProperties(this._el);
    }
    return html`${this._el || html`Feature not found: ${tag}`}`;
  }
}

if (!customElements.get("feature-renderer-card")) {
  customElements.define("feature-renderer-card", FeatureRendererCard);
}