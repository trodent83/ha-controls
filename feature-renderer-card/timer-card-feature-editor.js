import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

/**
 * TimerCardFeatureEditor
 * Visual configuration editor UI for the TimerCardFeature custom card feature.
 * Provides inputs to optionally override the target timer entity.
 * 
 * @extends HAControlBase
 */
class TimerCardFeatureEditor extends HAControlBase {
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
      { name: "entity", label: this._localize('override_entity'), selector: { entity: { domain: "timer" } } }
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

customElements.define("timer-card-feature-editor", TimerCardFeatureEditor);