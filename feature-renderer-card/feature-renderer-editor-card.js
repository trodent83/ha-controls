import { HAControlBase, html } from "../ha-control-base.js?v=0.6.1";

/**
 * FeatureRendererEditorCard
 * Dynamically resolves and mounts the visual configuration editor for a specific card feature.
 * Automatically appends a generic text field to configure dynamic visibility condition logic.
 */
export class FeatureRendererEditorCard extends HAControlBase {
  static get properties() {
    return {
      hass: { attribute: false },
      config: { attribute: false }
    };
  }

  /**
   * Renders the dynamic feature sub-editor and overlays a generic Visibility Condition textbox.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
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
          const updatedConfig = { ...e.detail.config };
          // Preserve the feature's visibility condition value
          if (this.config.condition !== undefined) {
            updatedConfig.condition = this.config.condition;
          }
          this.dispatchEvent(new CustomEvent("config-changed", {
            detail: { config: updatedConfig }
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

    return html`
      ${this._el || html`<div>No editor for ${this.config.type}</div>`}
      <ha-input
        label="Visibility Condition (JS)"
        .value=${this.config.condition || ''}
        @input=${this._conditionChanged}
        style="display: block; margin-top: 12px; width: 100%;"
      ></ha-input>
    `;
  }

  /**
   * Input event handler for the visibility condition text field.
   * 
   * @param {Event} e - Input event
   * @private
   */
  _conditionChanged(e) {
    const value = e.target.value;
    const newConfig = { ...this.config };
    if (value === "") {
      delete newConfig.condition;
    } else {
      newConfig.condition = value;
    }
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: newConfig }
    }));
  }
}

if (!customElements.get("feature-renderer-editor-card")) {
  customElements.define("feature-renderer-editor-card", FeatureRendererEditorCard);
}