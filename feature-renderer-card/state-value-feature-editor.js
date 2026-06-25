import { HAControlBase, html } from "../ha-control-base.js?v=0.6.1";

/**
 * StateValueFeatureEditor
 * Visual configuration editor UI for the StateValueFeature custom card feature.
 * 
 * @extends HAControlBase
 */
class StateValueFeatureEditor extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
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
    this._fireConfigChanged();
  }

  _addThreshold() {
    const thresholds = [...(this._config.thresholds || [])];
    thresholds.push({ value: "", color: "", animation: "" });
    this._config = { ...this._config, thresholds };
    this._fireConfigChanged();
  }

  _updateThreshold(tIdx, key, value) {
    const thresholds = [...(this._config.thresholds || [])];
    thresholds[tIdx] = { ...thresholds[tIdx], [key]: value };
    this._config = { ...this._config, thresholds };
    this._fireConfigChanged();
  }

  _removeThreshold(tIdx) {
    const thresholds = [...(this._config.thresholds || [])];
    thresholds.splice(tIdx, 1);
    this._config = { ...this._config, thresholds };
    this._fireConfigChanged();
  }

  _fireConfigChanged() {
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
      { name: "entity", label: this._localize('entity_override'), selector: { entity: {} } },
      {
        name: "",
        type: "grid",
        schema: [
          { name: "prefix", label: this._localize('prefix'), selector: { text: {} } },
          { name: "suffix", label: this._localize('suffix'), selector: { text: {} } }
        ]
      },
      {
        name: "",
        type: "grid",
        schema: [
          { name: "color", label: this._localize('color'), selector: { text: {} } },
          { name: "font_size", label: this._localize('font_size_placeholder'), selector: { text: {} } }
        ]
      },
      {
        name: "",
        type: "grid",
        schema: [
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
          },
          {
            name: "text_align",
            label: this._localize('text_align'),
            selector: {
              select: {
                options: [
                  { value: "left", label: this._localize('left') },
                  { value: "center", label: this._localize('center') },
                  { value: "right", label: this._localize('right') }
                ],
                mode: "dropdown"
              }
            }
          }
        ]
      }
    ];

    const thresholds = this._config.thresholds || [];

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${(s) => s.label || s.name}
        @value-changed=${this._valueChanged}
      ></ha-form>

      <div style="margin-top: 16px;">
        <h3>${this._localize('thresholds')}</h3>
        ${thresholds.map((thresh, idx) => html`
          <div style="display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--divider-color); padding: 12px; margin-bottom: 12px; border-radius: 4px; background: var(--card-background-color);">
            <div style="display: flex; gap: 8px; align-items: center;">
              <ha-input
                style="flex: 1;"
                label="${this._localize('value')}"
                .value=${thresh.value || ""}
                @input=${(e) => this._updateThreshold(idx, 'value', e.target.value)}
              ></ha-input>
              
              <ha-input
                style="flex: 1;"
                label="${this._localize('color')}"
                .value=${thresh.color || ""}
                @input=${(e) => this._updateThreshold(idx, 'color', e.target.value)}
              ></ha-input>

              <ha-icon-button
                @click=${() => this._removeThreshold(idx)}
              ><ha-icon icon="mdi:close"></ha-icon></ha-icon-button>
            </div>
            
            <div style="display: flex; gap: 8px;">
              <ha-select
                style="flex: 1;"
                label="${this._localize('animation')}"
                .value=${thresh.animation || ""}
                @closed=${(e) => {
                  e.stopPropagation();
                  const target = e.target;
                  if (target.value !== undefined && target.value !== thresh.animation) {
                    this._updateThreshold(idx, 'animation', target.value);
                  }
                }}
                fixedMenuPosition
                naturalMenuWidth
              >
                <ha-list-item value="">${this._localize('none')}</ha-list-item>
                <ha-list-item value="blink">${this._localize('blink')}</ha-list-item>
                <ha-list-item value="pulse">${this._localize('pulse')}</ha-list-item>
                <ha-list-item value="shake">${this._localize('shake')}</ha-list-item>
                <ha-list-item value="bounce">${this._localize('bounce')}</ha-list-item>
                <ha-list-item value="flash">${this._localize('flash')}</ha-list-item>
                <ha-list-item value="float">${this._localize('float')}</ha-list-item>
              </ha-select>
            </div>
          </div>
        `)}

        <ha-button raised @click=${this._addThreshold}>
          <ha-icon icon="mdi:plus" slot="icon"></ha-icon> ${this._localize('add_threshold')}
        </ha-button>
      </div>
    `;
  }
}

customElements.define("state-value-feature-editor", StateValueFeatureEditor);
