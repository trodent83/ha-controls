import { HAControlBase, html } from "../ha-control-base.js?v=0.6.7";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.0';

/**
 * RadiatorControlCardEditor
 * Visual configuration editor UI for RadiatorControlCard.
 * Manages binding forms for climate, sensor, select, and timer entities.
 * 
 * @extends HAControlBase
 */
class RadiatorControlCardEditor extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Tracks editor config copy.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return {
      ...super.properties,
      _config: { type: Object }
    };
  }

  /**
   * Resolves the directory path hosting the translation localizations.
   * 
   * @type {string}
   */
  get translationPath() {
    return "/local/ha-controls/radiator-control-card/translations";
  }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() {
    return VERSION;
  }

  /**
   * Receives configuration details from Lovelace dashboard interface.
   * 
   * @param {Object} config - Config parameters
   */
  setConfig(config) {
    this._config = config;

    const knownKeys = [
      "name",
      "climate_entity",
      "sensor_entity",
      "select_entity",
      "timer_entity",
      "timer_hold_action",
      "temperature_thresholds"
    ];
    this._unrecognizedKeys = this._validateConfigKeys(config, knownKeys);
  }

  /**
   * Invoked when top-level card configuration parameters are changed.
   * 
   * @param {CustomEvent} ev - Form value-changed event details
   * @private
   */
  _valueChanged(ev) {
    const config = ev.detail.value;
    this._config = { ...this._config, ...config };
    this._fireConfigChanged();
  }

  /**
   * Dispatches the updated config state back to the Lovelace dashboard configuration framework.
   * 
   * @private
   */
  _fireConfigChanged() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Constructs the top-level card settings form schema fields dictionary.
   * 
   * @private
   * @returns {Array<Object>} Form fields schema definition for ha-form
   */
  _schema() {
    return [
      { name: "name", label: this._localize('name') || "Card Title", selector: { text: {} } },
      { name: "climate_entity", label: this._localize('climate_entity'), selector: { entity: { domain: "climate" } } },
      { name: "sensor_entity", label: this._localize('sensor_entity'), selector: { entity: { domain: "sensor" } } },
      { name: "select_entity", label: this._localize('select_entity'), selector: { entity: { domain: "input_select" } } },
      { name: "timer_entity", label: this._localize('timer_entity'), selector: { entity: { domain: "timer" } } }
    ];
  }

  /**
   * Cleans the active configuration of any unrecognized properties.
   * 
   * @private
   */
  _cleanConfig() {
    if (!this._config) return;
    const cleaned = {
      type: this._config.type
    };
    
    if (this._config.name !== undefined) cleaned.name = this._config.name;
    if (this._config.climate_entity !== undefined) cleaned.climate_entity = this._config.climate_entity;
    if (this._config.sensor_entity !== undefined) cleaned.sensor_entity = this._config.sensor_entity;
    if (this._config.select_entity !== undefined) cleaned.select_entity = this._config.select_entity;
    if (this._config.timer_entity !== undefined) cleaned.timer_entity = this._config.timer_entity;
    if (this._config.timer_hold_action !== undefined) cleaned.timer_hold_action = this._config.timer_hold_action;
    if (this._config.temperature_thresholds !== undefined) cleaned.temperature_thresholds = this._config.temperature_thresholds;

    this._config = cleaned;
    this._fireConfigChanged();
  }

  /**
   * Resets the active configuration back to standard stub values.
   * 
   * @private
   */
  _resetConfig() {
    this._config = {
      type: this._config?.type || "custom:radiator-control-card",
      climate_entity: ""
    };
    this._fireConfigChanged();
  }

  /**
   * Renders the editor configuration interface layout.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this._config) return html``;

    return html`
      ${this.renderStyle('radiator-control-card-editor.css')}
      ${this.renderConfigValidationWarning()}
      
      <div class="editor-form">
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${this._schema()}
          .computeLabel=${(schema) => schema.label || schema.name}
          @value-changed=${this._valueChanged}
        ></ha-form>
      </div>

      <div class="editor-actions">
        <ha-button @click=${this._cleanConfig} outlined>
          <ha-icon icon="mdi:broom" slot="icon"></ha-icon>
          ${this._localize('clean') || 'Clean'}
        </ha-button>
        <ha-button @click=${this._resetConfig} outlined class="warning">
          <ha-icon icon="mdi:restore" slot="icon"></ha-icon>
          ${this._localize('reset') || 'Reset'}
        </ha-button>
      </div>
    `;
  }
}

customElements.define("radiator-control-card-editor", RadiatorControlCardEditor);
