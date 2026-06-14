import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

class ConstantTextFeatureEditor extends HAControlBase {
  static get properties() {
    return { ...super.properties, _config: {} };
  }

  setConfig(config) {
    this._config = config;
  }

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

  render() {
    if (!this.hass || !this._config) return html``;

    const schema = [
      { name: "text", label: "Text", selector: { text: {} } },
      {
        name: "",
        type: "grid",
        schema: [
          { name: "color", label: "Color (empty to inherit)", selector: { "text": {} } },
          { name: "font_size", label: "Font Size (e.g. 12px)", selector: { text: {} } }
        ]
      },
      {
        name: "font_weight",
        label: "Font Weight",
        selector: {
          select: {
            options: [
              { value: "normal", label: "Normal" },
              { value: "bold", label: "Bold" }
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