import { HAControlBase, html } from "../ha-control-base.js?v=0.6.8";

/**
 * Cache-busting version parameter for dynamic asset loading
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.0';

/**
 * WeatherGridCardEditor
 * Visual configuration editor for WeatherGridCard with tab navigation support.
 * 
 * @extends HAControlBase
 */
class WeatherGridCardEditor extends HAControlBase {
  static get properties() {
    return {
      ...super.properties,
      _config: { type: Object },
      _activeTab: { type: String }
    };
  }

  constructor() {
    super();
    this._activeTab = 'general';
  }

  setConfig(config) {
    this._config = {
      max_days: 7,
      mode: 'grid',
      ...config
    };

    const knownKeys = [
      "type",
      "entity",
      "name",
      "mode",
      "max_days",
      "warning_entity"
    ];
    this._unrecognizedKeys = this._validateConfigKeys(config, knownKeys);
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const value = ev.detail.value;
    this._config = { ...this._config, ...value };
    this._fireConfigChanged();
  }

  _fireConfigChanged() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
  }

  _cleanConfig() {
    if (!this._config) return;
    const cleaned = {
      type: this._config.type,
      entity: this._config.entity
    };

    const addIfDiff = (key, defaultVal) => {
      const val = this._config[key];
      if (val !== undefined && val !== null && String(val) !== String(defaultVal)) {
        cleaned[key] = val;
      }
    };

    if (this._config.name !== undefined) cleaned.name = this._config.name;
    addIfDiff("mode", 'grid');
    addIfDiff("max_days", 7);
    if (this._config.warning_entity !== undefined) cleaned.warning_entity = this._config.warning_entity;

    this._config = cleaned;
    this._fireConfigChanged();
  }

  _resetConfig() {
    this._config = {
      type: this._config?.type || "custom:weather-grid-card",
      entity: "",
      mode: 'grid',
      max_days: 7
    };
    this._fireConfigChanged();
  }

  render() {
    if (!this.hass || !this._config) return html``;

    const generalSchema = [
      { name: "entity", label: 'Weather Entity', selector: { entity: { domain: "weather" } } },
      { name: "name", label: 'Custom Title', selector: { text: {} } },
      {
        name: "mode",
        label: 'Display Mode',
        selector: {
          select: {
            options: [
              { value: "grid", label: "Full grid" },
              { value: "summary", label: "Compact Summary" }
            ]
          }
        }
      }
    ];

    const layoutSchema = [
      { name: "max_days", label: 'Max Forecast Days', selector: { number: { min: 1, max: 15, mode: "box" } } },
      { name: "warning_entity", label: 'Warning Entity (Optional)', selector: { entity: {} } }
    ];

    return html`
      ${this.renderStyle('weather-grid-card-editor.css')}
      ${this.renderConfigValidationWarning()}

      <div class="ha-tabs">
        <div 
          class="ha-tab ${this._activeTab === 'general' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'general'; }}
        >
          General
        </div>
        <div 
          class="ha-tab ${this._activeTab === 'layout' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'layout'; }}
        >
          Layout
        </div>
      </div>

      <div style="margin-top: 16px;">
        ${this._activeTab === 'general' ? html`
          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${generalSchema}
            .computeLabel=${(s) => s.label || s.name}
            @value-changed=${this._valueChanged}
          ></ha-form>
        ` : html`
          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${layoutSchema}
            .computeLabel=${(s) => s.label || s.name}
            @value-changed=${this._valueChanged}
          ></ha-form>
        `}
      </div>

      <div class="editor-actions">
        <ha-button @click=${this._cleanConfig} outlined>
          <ha-icon icon="mdi:broom" slot="icon"></ha-icon>
          Clean
        </ha-button>
        <ha-button @click=${this._resetConfig} outlined class="warning">
          <ha-icon icon="mdi:restore" slot="icon"></ha-icon>
          Reset
        </ha-button>
      </div>
    `;
  }
}

customElements.define("weather-grid-card-editor", WeatherGridCardEditor);
