import { HAControlBase, html } from "../ha-control-base.js?v=0.6.7";

/**
 * ConstantTextFeatureEditor
 * Visual configuration editor UI for the ConstantTextFeature custom card feature.
 * Allows entering custom static text, custom CSS styles, fonts, etc.
 * 
 * @extends HAControlBase
 */
class ConstantTextFeatureEditor extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Tracks local config instance copy.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return { ...super.properties, _config: {} };
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
  get translationVersion() { return "1.0.0"; }

  /**
   * Receives configuration details from Lovelace dashboard interface.
   * 
   * @param {Object} config - Config parameters
   */
  setConfig(config) {
    this._config = config;
  }

  /**
   * Handles configuration values change event inside editor forms, dispatching update events.
   * 
   * @param {CustomEvent} ev - Form value-changed event
   * @private
   */
  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const value = ev.detail.value;
    this._config = { ...this._config, ...value };
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Renders the editor configuration interface layout.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this._config) return html``;

    const schema = [
      { name: "text", label: this._localize('text'), selector: { text: {} } },
      {
        name: "",
        type: "grid",
        schema: [
          { name: "color", label: this._localize('color_inherit'), selector: { "text": {} } },
          { name: "font_size", label: this._localize('font_size_placeholder'), selector: { text: {} } }
        ]
      },
      {
        name: "font_weight",
        label: this._localize('font_weight'),
        selector: {
          select: {
            options: [
              { value: "normal", label: this._localize('normal') },
              { value: "bold", label: this._localize('bold') }
            ],
            mode: "dropdown"
          }
        }
      }
    ];

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${(s) => s.label || s.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

customElements.define("constant-text-feature-editor", ConstantTextFeatureEditor);