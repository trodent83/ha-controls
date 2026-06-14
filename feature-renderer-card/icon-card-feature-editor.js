import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

/**
 * IconCardFeatureEditor
 * Visual configuration editor UI for the IconCardFeature custom card feature.
 * 
 * @extends HAControlBase
 */
class IconCardFeatureEditor extends HAControlBase {
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
    thresholds.push({ value: "", icon: "", color: "", animation: "" });
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

  _addMapping() {
    const state_icons = { ...(this._config.state_icons || {}) };
    state_icons[""] = "";
    this._config = { ...this._config, state_icons };
    this._fireConfigChanged();
  }

  _updateMapping(oldKey, newKey, field, value) {
    const state_icons = { ...(this._config.state_icons || {}) };
    const state_colors = { ...(this._config.state_colors || {}) };
    const state_animations = { ...(this._config.state_animations || {}) };

    if (oldKey !== newKey) {
      const iconVal = field === 'key' ? state_icons[oldKey] : value;
      const colorVal = state_colors[oldKey];
      const animVal = state_animations[oldKey];

      delete state_icons[oldKey];
      delete state_colors[oldKey];
      delete state_animations[oldKey];

      if (newKey !== undefined) {
        state_icons[newKey] = iconVal || "";
        if (colorVal !== undefined) state_colors[newKey] = colorVal;
        if (animVal !== undefined) state_animations[newKey] = animVal;
      }
    } else {
      if (field === 'icon') {
        state_icons[oldKey] = value;
      } else if (field === 'color') {
        state_colors[oldKey] = value;
      } else if (field === 'animation') {
        state_animations[oldKey] = value;
      }
    }

    this._config = {
      ...this._config,
      state_icons,
      state_colors,
      state_animations
    };
    this._fireConfigChanged();
  }

  _removeMapping(key) {
    const state_icons = { ...(this._config.state_icons || {}) };
    const state_colors = { ...(this._config.state_colors || {}) };
    const state_animations = { ...(this._config.state_animations || {}) };

    delete state_icons[key];
    delete state_colors[key];
    delete state_animations[key];

    this._config = {
      ...this._config,
      state_icons,
      state_colors,
      state_animations
    };
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
          { name: "icon", label: this._localize('icon'), selector: { icon: {} } },
          { name: "color", label: this._localize('icon_color'), selector: { text: {} } }
        ]
      },
      {
        name: "",
        type: "grid",
        schema: [
          { name: "size", label: this._localize('icon_size'), selector: { text: {} } },
          {
            name: "animation",
            label: this._localize('animation'),
            selector: {
              select: {
                options: [
                  { value: "", label: this._localize('none') },
                  { value: "blink", label: this._localize('blink') },
                  { value: "pulse", label: this._localize('pulse') },
                  { value: "shake", label: this._localize('shake') },
                  { value: "bounce", label: this._localize('bounce') },
                  { value: "flash", label: this._localize('flash') },
                  { value: "float", label: this._localize('float') },
                  { value: "spin-slow", label: this._localize('spinning') }
                ],
                mode: "dropdown"
              }
            }
          }
        ]
      },
      {
        name: "",
        type: "grid",
        schema: [
          { name: "attribute", label: this._localize('attribute'), selector: { text: {} } },
          { name: "state_property", label: this._localize('state_property'), selector: { text: {} } }
        ]
      },
      {
        name: "expressions",
        label: "Expressions Override",
        type: "grid",
        schema: [
          { name: "icon_expression", label: this._localize('icon_expression'), selector: { text: {} } },
          { name: "color_expression", label: this._localize('color_expression'), selector: { text: {} } },
          { name: "animation_expression", label: this._localize('animation_expression'), selector: { text: {} } }
        ]
      }
    ];

    const thresholds = this._config.thresholds || [];

    const mappings = [];
    const keys = new Set([
      ...Object.keys(this._config.state_icons || {}),
      ...Object.keys(this._config.state_colors || {}),
      ...Object.keys(this._config.state_animations || {})
    ]);
    for (const k of keys) {
      mappings.push({
        key: k,
        icon: this._config.state_icons?.[k] || "",
        color: this._config.state_colors?.[k] || "",
        animation: this._config.state_animations?.[k] || ""
      });
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${(s) => s.label || s.name}
        @value-changed=${this._valueChanged}
      ></ha-form>

      <!-- Mappings section -->
      <div style="margin-top: 16px;">
        <h3>${this._localize('state_mappings')}</h3>
        ${mappings.map((mapRow) => html`
          <div style="display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--divider-color); padding: 12px; margin-bottom: 12px; border-radius: 4px; background: var(--card-background-color);">
            <div style="display: flex; gap: 8px; align-items: center;">
              <ha-textfield
                style="flex: 1;"
                label="${this._localize('value')}"
                .value=${mapRow.key}
                @change=${(e) => this._updateMapping(mapRow.key, e.target.value, 'key', e.target.value)}
              ></ha-textfield>
              
              <ha-textfield
                style="flex: 1;"
                label="${this._localize('icon')}"
                .value=${mapRow.icon}
                @input=${(e) => this._updateMapping(mapRow.key, mapRow.key, 'icon', e.target.value)}
              ></ha-textfield>

              <ha-icon-button
                @click=${() => this._removeMapping(mapRow.key)}
              ><ha-icon icon="mdi:close"></ha-icon></ha-icon-button>
            </div>
            
            <div style="display: flex; gap: 8px; align-items: center;">
              <ha-textfield
                style="flex: 1;"
                label="${this._localize('color')}"
                .value=${mapRow.color}
                @input=${(e) => this._updateMapping(mapRow.key, mapRow.key, 'color', e.target.value)}
              ></ha-textfield>

              <ha-select
                style="flex: 1;"
                label="${this._localize('animation')}"
                .value=${mapRow.animation || ""}
                @closed=${(e) => {
                  e.stopPropagation();
                  const target = e.target;
                  if (target.value !== undefined && target.value !== mapRow.animation) {
                    this._updateMapping(mapRow.key, mapRow.key, 'animation', target.value);
                  }
                }}
                fixedMenuPosition
                naturalMenuWidth
              >
                <mwc-list-item value="">${this._localize('none')}</mwc-list-item>
                <mwc-list-item value="blink">${this._localize('blink')}</mwc-list-item>
                <mwc-list-item value="pulse">${this._localize('pulse')}</mwc-list-item>
                <mwc-list-item value="shake">${this._localize('shake')}</mwc-list-item>
                <mwc-list-item value="bounce">${this._localize('bounce')}</mwc-list-item>
                <mwc-list-item value="flash">${this._localize('flash')}</mwc-list-item>
                <mwc-list-item value="float">${this._localize('float')}</mwc-list-item>
                <mwc-list-item value="spin-slow">${this._localize('spinning')}</mwc-list-item>
              </ha-select>
            </div>
          </div>
        `)}

        <ha-button raised @click=${this._addMapping}>
          <ha-icon icon="mdi:plus" slot="icon"></ha-icon> Add State Mapping
        </ha-button>
      </div>

      <!-- Thresholds section -->
      <div style="margin-top: 16px;">
        <h3>${this._localize('thresholds')}</h3>
        ${thresholds.map((thresh, idx) => html`
          <div style="display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--divider-color); padding: 12px; margin-bottom: 12px; border-radius: 4px; background: var(--card-background-color);">
            <div style="display: flex; gap: 8px; align-items: center;">
              <ha-textfield
                style="flex: 1;"
                label="${this._localize('value')}"
                .value=${thresh.value || ""}
                @input=${(e) => this._updateThreshold(idx, 'value', e.target.value)}
              ></ha-textfield>
              
              <ha-textfield
                style="flex: 1;"
                label="${this._localize('icon')}"
                .value=${thresh.icon || ""}
                @input=${(e) => this._updateThreshold(idx, 'icon', e.target.value)}
              ></ha-textfield>

              <ha-icon-button
                @click=${() => this._removeThreshold(idx)}
              ><ha-icon icon="mdi:close"></ha-icon></ha-icon-button>
            </div>
            
            <div style="display: flex; gap: 8px; align-items: center;">
              <ha-textfield
                style="flex: 1;"
                label="${this._localize('color')}"
                .value=${thresh.color || ""}
                @input=${(e) => this._updateThreshold(idx, 'color', e.target.value)}
              ></ha-textfield>

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
                <mwc-list-item value="">${this._localize('none')}</mwc-list-item>
                <mwc-list-item value="blink">${this._localize('blink')}</mwc-list-item>
                <mwc-list-item value="pulse">${this._localize('pulse')}</mwc-list-item>
                <mwc-list-item value="shake">${this._localize('shake')}</mwc-list-item>
                <mwc-list-item value="bounce">${this._localize('bounce')}</mwc-list-item>
                <mwc-list-item value="flash">${this._localize('flash')}</mwc-list-item>
                <mwc-list-item value="float">${this._localize('float')}</mwc-list-item>
                <mwc-list-item value="spin-slow">${this._localize('spinning')}</mwc-list-item>
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

customElements.define("icon-card-feature-editor", IconCardFeatureEditor);
