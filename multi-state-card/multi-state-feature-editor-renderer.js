import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

class MultiStateFeatureEditorRenderer extends HAControlBase {
  static get properties() {
    return {
      hass: { attribute: false },
      config: { attribute: false }
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
    const editorTag = `${tag}-editor`;

    if (this._tag !== editorTag) {
      this._tag = editorTag;
      if (customElements.get(editorTag)) {
        this._el = document.createElement(editorTag);
        this._el.addEventListener("config-changed", (e) => {
          e.stopPropagation();
          this.dispatchEvent(new CustomEvent("config-changed", {
            detail: { config: e.detail.config }
          }));
        });
      } else {
        this._el = null;
      }
    }
    if (this._el) {
      this._el.hass = this.hass;
      if (this._el.setConfig) {
        this._el.setConfig(this.config);
      }
    }
    return html`${this._el || html`No editor for ${this.config.type}`}`;
  }
}
if (!customElements.get("multi-state-feature-editor-renderer")) {
  customElements.define("multi-state-feature-editor-renderer", MultiStateFeatureEditorRenderer);
}