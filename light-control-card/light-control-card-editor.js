import { HAControlBase, html } from "../ha-control-base.js?v=0.6.7";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.0';

/**
 * LightControlCardEditor
 * Visual configuration editor for LightControlCard.
 * 
 * @extends HAControlBase
 */
class LightControlCardEditor extends HAControlBase {
  static get properties() {
    return {
      ...super.properties,
      _config: { type: Object }
    };
  }

  get translationPath() { return "/local/ha-controls/light-control-card/translations"; }

  get translationVersion() { return VERSION; }

  setConfig(config) {
    this._config = {
      show_brightness_control: true,
      show_color_temp_control: true,
      show_color_control: true,
      use_light_color: true,
      ...config
    };

    const knownKeys = [
      "entity",
      "name",
      "icon",
      "show_brightness_control",
      "show_color_temp_control",
      "show_color_control",
      "use_light_color"
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
    if (this._config.icon !== undefined) cleaned.icon = this._config.icon;
    addIfDiff("show_brightness_control", true);
    addIfDiff("show_color_temp_control", true);
    addIfDiff("show_color_control", true);
    addIfDiff("use_light_color", true);

    this._config = cleaned;
    this._fireConfigChanged();
  }

  _resetConfig() {
    this._config = {
      type: this._config?.type || "custom:light-control-card",
      entity: "",
      show_brightness_control: true,
      show_color_temp_control: true,
      show_color_control: true,
      use_light_color: true
    };
    this._fireConfigChanged();
  }

  render() {
    if (!this.hass || !this._config) return html``;

    const schema = [
      { name: "entity", label: this._localize('entity') || 'Light Entity', selector: { entity: { domain: "light" } } },
      {
        name: "",
        type: "grid",
        schema: [
          { name: "name", label: this._localize('custom_name') || 'Custom Name', selector: { text: {} } },
          { name: "icon", label: this._localize('custom_icon') || 'Custom Icon', selector: { icon: {} } }
        ]
      },
      {
        name: "show_brightness_control",
        label: this._localize('show_brightness') || 'Show Brightness Control',
        selector: { boolean: {} }
      },
      {
        name: "show_color_temp_control",
        label: this._localize('show_color_temp') || 'Show Color Temp Control',
        selector: { boolean: {} }
      },
      {
        name: "show_color_control",
        label: this._localize('show_color') || 'Show Color Control',
        selector: { boolean: {} }
      },
      {
        name: "use_light_color",
        label: this._localize('use_light_color') || 'Use Light Color for Icon Glow',
        selector: { boolean: {} }
      }
    ];

    return html`
      ${this.renderStyle('light-control-card-editor.css')}
      ${this.renderConfigValidationWarning()}

      <div style="margin-top: 16px;">
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${schema}
          .computeLabel=${(s) => s.label || s.name}
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

customElements.define("light-control-card-editor", LightControlCardEditor);
