import { HAControlBase, html } from "../ha-control-base.js?v=0.5.1";

const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.4';

class UniversalSelectCardEditor extends HAControlBase {
  static get properties() {
    return { ...super.properties, _config: { type: Object } };
  }

  get translationPath() { return "/local/ha-controls/universal-select-card/translations"; }
  get translationVersion() { return VERSION; }

  setConfig(config) {
    this._config = config;
  }

  _baseSchema() {
    return [
      { name: "entity", label: this._localize('controlled_dropdown'), selector: { entity: { domain: "input_select" } } },
      { name: "lock_entity", label: this._localize('disable_control'), selector: { entity: { domain: "binary_sensor" } } },
      { name: "show_label", label: this._localize('show_labels'), selector: { boolean: {} } },
      { 
        name: "layout", 
        label: this._localize('layout'), 
        selector: { 
          select: { 
            options: [
              { value: "row", label: this._localize('horizontal') },
              { value: "column", label: this._localize('vertical') }
            ] 
          } 
        } 
      }
    ];
  }

  render() {
    if (!this.hass || !this._config) return html``;
    const data = { layout: 'row', ...this._config };
    
    const entityId = this._config.entity;
    const stateObj = entityId ? this.hass.states[entityId] : null;
    let options = stateObj?.attributes?.options || [];

    if (this._config.options_order) {
        const order = this._config.options_order;
        options = [...options].sort((a, b) => {
            const idxA = order.indexOf(a);
            const idxB = order.indexOf(b);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        });
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._baseSchema()}
        .computeLabel=${(s) => s.label || s.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
      
      <div class="options-list">
        ${options.map((option, idx) => this._renderOption(option, idx, options.length))}
      </div>
    `;
  }

  _renderOption(option, idx, total) {
      const optionData = this._config.options_config?.[option] || {};
      const mainSchema = [
          {
            name: "",
            type: "grid",
            schema: [
              { name: "label", label: this._localize('custom_label'), selector: { text: {} } },
              { name: "icon", label: this._localize('icon'), selector: { icon: {} } },
              { name: "color", label: this._localize('color'), selector: { text: {} } },
              { 
                name: "animation", 
                label: this._localize('animation'), 
                selector: { 
                  select: { 
                    options: [
                      { value: "", label: this._localize('none') },
                      { value: "bounce", label: this._localize('bounce') },
                      { value: "blink", label: this._localize('blink') },
                      { value: "rotating", label: this._localize('rotating') },
                      { value: "pulse", label: this._localize('pulse') },
                      { value: "shake", label: this._localize('shake') },
                      { value: "float", label: this._localize('float') },
                      { value: "spin-slow", label: this._localize('spin_slow') }
                    ] 
                  } 
                } 
              }
            ]
          },
          {
            name: "",
            type: "grid",
            schema: [
              { 
                name: "active_label_script", 
                label: this._localize('active_label_script'), 
                selector: { text: { multiline: true, rows: 6 } },
                helper: "Return a string. Vars: hass, option.\n\nExamples:\n// Timer (00:00:00)\nconst t = hass.states['timer.x'];\nif (t?.state === 'active') {\n  const left = Math.max(0, new Date(t.attributes.finishes_at) - Date.now());\n  return new Date(left).toISOString().slice(11, 19);\n}\n\n// Conditional\nreturn hass.states['sun.sun'].state === 'above_horizon' ? 'Day' : 'Night';" 
              }
            ]
          }
      ];

      const actionSchema = [
          {
            name: "hold_action",
            label: this._localize('hold_action'),
            selector: { "ui-action": {} }
          }
      ];

      return html`
        <ha-expansion-panel outlined style="margin-top: 8px;">
            <div slot="header" class="panel-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div class="panel-title">${optionData.label || option}</div>
                <div style="display: flex; align-items: center;">
                    <ha-icon-button
                    @click=${(e) => { e.stopPropagation(); this._moveOption(option, -1); }}
                    .disabled=${idx === 0}
                    ><ha-icon icon="mdi:arrow-up"></ha-icon></ha-icon-button>
                    <ha-icon-button
                    @click=${(e) => { e.stopPropagation(); this._moveOption(option, 1); }}
                    .disabled=${idx === total - 1}
                    ><ha-icon icon="mdi:arrow-down"></ha-icon></ha-icon-button>
                </div>
            </div>
            <div class="panel-content" style="padding: 16px;">
                <ha-form
                    .hass=${this.hass}
                    .data=${optionData}
                    .schema=${mainSchema}
                    .computeLabel=${(s) => s.label || s.name}
                    @value-changed=${(e) => this._optionValueChanged(option, e)}
                ></ha-form>
                <div style="border-top: 1px solid var(--divider-color); margin: 24px 0 16px 0;"></div>
                <ha-form
                    .hass=${this.hass}
                    .data=${optionData}
                    .schema=${actionSchema}
                    .computeLabel=${(s) => s.label || s.name}
                    @value-changed=${(e) => this._optionValueChanged(option, e)}
                ></ha-form>
            </div>
        </ha-expansion-panel>
      `;
  }

  _moveOption(option, direction) {
    const entityId = this._config?.entity;
    const stateObj = entityId ? this.hass.states[entityId] : null;
    let options = stateObj?.attributes?.options || [];
    
    let currentOrder = this._config.options_order ? [...this._config.options_order] : [...options];
    
    // Ensure all options are in currentOrder if not present
    options.forEach(opt => {
        if (!currentOrder.includes(opt)) currentOrder.push(opt);
    });

    const index = currentOrder.indexOf(option);
    if (index === -1) return;
    
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= currentOrder.length) return;

    [currentOrder[index], currentOrder[newIndex]] = [currentOrder[newIndex], currentOrder[index]];

    this._config = { ...this._config, options_order: currentOrder };
    this._fireConfigChanged();
  }

  _optionValueChanged(option, ev) {
      const newOptionConfig = { ...this._config.options_config?.[option], ...ev.detail.value };
      const optionsConfig = { ...this._config.options_config, [option]: newOptionConfig };
      this._config = { ...this._config, options_config: optionsConfig };
      this._fireConfigChanged();
  }

  _valueChanged(ev) {
    const newConfig = ev.detail.value;

    if (this._config && this._config.entity !== newConfig.entity) {
      const { options_config, options_order, ...rest } = newConfig;
      this._config = rest;
    } else {
      this._config = { ...this._config, ...newConfig };
    }
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
}

customElements.define("universal-select-card-editor", UniversalSelectCardEditor);
