import { HAControlBase, html } from "../ha-control-base.js?v=0.6.9";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.1.12';

/**
 * FitGridLayoutEditor
 * Visual configuration editor for FitGridLayout.
 * Handles forms editing for CSS Grid columns/rows/areas, background media alignment, and mapped popups.
 * 
 * @extends HAControlBase
 */
class FitGridLayoutEditor extends HAControlBase {
  static get properties() {
    return {
      ...super.properties,
      _config: { type: Object },
      _activeTab: { type: String }
    };
  }

  constructor() {
    super();
    this._activeTab = 'layout';
  }

  get translationPath() { return "/local/ha-controls/fit-grid-layout/translations"; }
  get translationVersion() { return VERSION; }

  setConfig(config) {
    this._config = config;

    const knownKeys = [
      "layout",
      "background",
      "popups",
      "cards"
    ];
    this._unrecognizedKeys = this._validateConfigKeys(config, knownKeys);
  }

  _layoutSchema() {
    return [
      {
        name: "",
        type: "grid",
        schema: [
          { name: "grid-template-columns", label: "Grid Columns (e.g. repeat(3, 1fr))", selector: { text: {} } },
          { name: "grid-template-rows", label: "Grid Rows (e.g. repeat(4, auto))", selector: { text: {} } },
          { name: "gap", label: "Gap (e.g. 8px)", selector: { text: {} } },
          { name: "padding", label: "Padding (e.g. 8px)", selector: { text: {} } },
          { name: "height", label: "Height (e.g. calc(100vh - 56px))", selector: { text: {} } }
        ]
      },
      { name: "grid-template-areas", label: "Grid Template Areas (CSS Layout)", selector: { text: { multiline: true } } }
    ];
  }

  _backgroundSchema() {
    return [
      {
        name: "",
        type: "grid",
        schema: [
          { name: "image", label: "Background Image URL", selector: { text: {} } },
          { name: "opacity", label: "Opacity (0-100)", selector: { number: { min: 0, max: 100, step: 1, mode: "slider" } } },
          {
            name: "alignment",
            label: "Alignment",
            selector: {
              select: {
                options: [
                  { value: "center", label: "Center" },
                  { value: "top", label: "Top" },
                  { value: "bottom", label: "Bottom" },
                  { value: "left", label: "Left" },
                  { value: "right", label: "Right" }
                ]
              }
            }
          },
          {
            name: "size",
            label: "Size",
            selector: {
              select: {
                options: [
                  { value: "cover", label: "Cover" },
                  { value: "contain", label: "Contain" },
                  { value: "auto", label: "Auto" }
                ]
              }
            }
          },
          {
            name: "repeat",
            label: "Repeat",
            selector: {
              select: {
                options: [
                  { value: "no-repeat", label: "No Repeat" },
                  { value: "repeat", label: "Repeat" }
                ]
              }
            }
          },
          {
            name: "attachment",
            label: "Attachment",
            selector: {
              select: {
                options: [
                  { value: "fixed", label: "Fixed" },
                  { value: "scroll", label: "Scroll" }
                ]
              }
            }
          }
        ]
      }
    ];
  }

  _popupsSchema() {
    return [
      {
        name: "popups",
        label: "Popups Mapped Configurations (YAML Dictionary)",
        selector: { object: {} }
      }
    ];
  }

  _cleanConfig() {
    if (!this._config) return;
    const cleaned = {
      type: this._config.type
    };

    if (this._config.layout) {
      cleaned.layout = {};
      const layoutKeys = ["grid-template-columns", "grid-template-rows", "grid-template-areas", "gap", "padding", "height"];
      layoutKeys.forEach(k => {
        if (this._config.layout[k] !== undefined) cleaned.layout[k] = this._config.layout[k];
      });
    }

    if (this._config.background) {
      cleaned.background = {};
      const bgKeys = ["image", "opacity", "alignment", "size", "repeat", "attachment"];
      bgKeys.forEach(k => {
        if (this._config.background[k] !== undefined) cleaned.background[k] = this._config.background[k];
      });
    }

    if (this._config.popups) {
      cleaned.popups = this._config.popups;
    }

    if (this._config.cards) {
      cleaned.cards = this._config.cards;
    }

    this._config = cleaned;
    this._fireConfigChanged();
  }

  _resetConfig() {
    this._config = {
      type: this._config?.type || "custom:fit-grid-layout",
      layout: {
        "grid-template-columns": "repeat(3, 1fr)",
        "grid-template-rows": "auto",
        gap: "8px",
        padding: "8px"
      }
    };
    this._fireConfigChanged();
  }

  _valueChanged(ev) {
    if (!this._config) return;
    this._config = { ...this._config, ...ev.detail.value };
    this._fireConfigChanged();
  }

  _fireConfigChanged() {
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  render() {
    if (!this.hass || !this._config) return html``;

    const layoutData = this._config.layout || {};
    const backgroundData = this._config.background || {};
    const popupsData = { popups: this._config.popups || {} };

    return html`
      ${this.renderStyle('fit-grid-layout-editor.css')}
      ${this.renderConfigValidationWarning()}

      <div class="ha-tabs">
        <div 
          class="ha-tab ${this._activeTab === 'layout' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'layout'; }}
        >
          Layout
        </div>
        <div 
          class="ha-tab ${this._activeTab === 'background' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'background'; }}
        >
          Background
        </div>
        <div 
          class="ha-tab ${this._activeTab === 'popups' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'popups'; }}
        >
          Popups
        </div>
      </div>

      <div class="panel-content">
        ${this._activeTab === 'layout' ? html`
          <ha-form
            .hass=${this.hass}
            .data=${layoutData}
            .schema=${this._layoutSchema()}
            .computeLabel=${(s) => s.label || s.name}
            @value-changed=${(e) => {
              e.stopPropagation();
              this._config = { ...this._config, layout: e.detail.value };
              this._fireConfigChanged();
            }}
          ></ha-form>
        ` : html``}

        ${this._activeTab === 'background' ? html`
          <ha-form
            .hass=${this.hass}
            .data=${backgroundData}
            .schema=${this._backgroundSchema()}
            .computeLabel=${(s) => s.label || s.name}
            @value-changed=${(e) => {
              e.stopPropagation();
              this._config = { ...this._config, background: e.detail.value };
              this._fireConfigChanged();
            }}
          ></ha-form>
        ` : html``}

        ${this._activeTab === 'popups' ? html`
          <ha-form
            .hass=${this.hass}
            .data=${popupsData}
            .schema=${this._popupsSchema()}
            .computeLabel=${(s) => s.label || s.name}
            @value-changed=${(e) => {
              e.stopPropagation();
              this._config = { ...this._config, popups: e.detail.value.popups };
              this._fireConfigChanged();
            }}
          ></ha-form>
        ` : html``}
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

customElements.define("fit-grid-layout-editor", FitGridLayoutEditor);
