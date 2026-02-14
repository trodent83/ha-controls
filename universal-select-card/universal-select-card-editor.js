const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

class UniversalSelectCardEditor extends LitElement {
  static get properties() {
    return { hass: { type: Object }, _config: { type: Object } };
  }

  setConfig(config) {
    this._config = config;
  }

  _schema() {
    const entityId = this._config?.entity;
    const stateObj = entityId ? this.hass.states[entityId] : null;
    const options = stateObj?.attributes?.options || [];

    const baseSchema = [
      { name: "entity", label: "Controlled Dropdown", selector: { entity: { domain: "input_select" } } },
      { name: "lock_entity", label: "Disable Control", selector: { entity: { domain: "binary_sensor" } } },
      { name: "show_label", label: "Show Labels", selector: { boolean: {} } }
    ];

    if (options.length === 0) return baseSchema;

    const optionsSchema = options.map(option => ({
      name: "options_config",
      type: "expandable",
      title: `Button: ${option}`,
      schema: [
        {
          name: option,
          type: "grid",
          schema: [
            { name: "label", label: "Custom Label", selector: { text: {} } },
            { name: "icon", label: "Icon", selector: { icon: {} } },
            { name: "color", label: "Color (Hex/Name)", selector: { text: {} } }, // Simple text for stability
            { 
              name: "animation", 
              label: "Animation", 
              selector: { 
                select: { 
                  options: [
                    { value: "", label: "None" },
                    { value: "bounce", label: "Bounce" },
                    { value: "blink", label: "Blink" },
                    { value: "rotating", label: "Rotating" },
                    { value: "pulse", label: "Pulse" },
                    { value: "shake", label: "Shake" },
                    { value: "float", label: "Float" },
                    { value: "spin-slow", label: "Spin Slow" }
                  ] 
                } 
              } 
            }
          ]
        },
        {
          name: option,
          type: "grid",
          schema: [
            { 
              name: "active_label_script", 
              label: "Active Label Script (JS)", 
              selector: { text: { multiline: true, rows: 6 } },
              helper: "Return a string. Vars: hass, option.\n\nExamples:\n// Timer (00:00:00)\nconst t = hass.states['timer.x'];\nif (t?.state === 'active') {\n  const left = Math.max(0, new Date(t.attributes.finishes_at) - Date.now());\n  return new Date(left).toISOString().slice(11, 19);\n}\n\n// Conditional\nreturn hass.states['sun.sun'].state === 'above_horizon' ? 'Day' : 'Night';" 
            }
          ]
        }
      ]
    }));

    // The ... ensures ha-form gets a flat list of all configuration fields
    return [...baseSchema, ...optionsSchema];
  }

  render() {
    if (!this.hass || !this._config) return html``;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema()}
        .computeLabel=${(s) => s.label || s.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  _valueChanged(ev) {
    let config = ev.detail.value;

    if (this._config && this._config.entity !== config.entity) {
      const { options_config, ...rest } = config;
      config = rest;
    }

    const event = new CustomEvent("config-changed", {
      detail: { config: config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

customElements.define("universal-select-card-editor", UniversalSelectCardEditor);
