import { HAControlBase, html } from "../ha-control-base.js?v=0.5.1";

class UniversalFeatureEditorRenderer extends HAControlBase {
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
      this._el = document.createElement(editorTag);
      this._el.addEventListener("config-changed", (e) => {
        if (e.detail && e.detail.config) {
          this._lastConfig = JSON.parse(JSON.stringify(e.detail.config));
        }
      });
    }
    if (this._el) {
      this._el.hass = this.hass;
      if (JSON.stringify(this._lastConfig) !== JSON.stringify(this.config)) {
         this._lastConfig = JSON.parse(JSON.stringify(this.config));
         if (this._el.setConfig) {
             this._el.setConfig(this.config);
         }
      }
    }
    return html`${this._el}`;
  }
}
if (!customElements.get("universal-feature-editor-renderer")) {
  customElements.define("universal-feature-editor-renderer", UniversalFeatureEditorRenderer);
}