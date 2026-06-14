import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

class ConstantTextFeatureEditor extends HAControlBase {
  static get properties() {
    return { ...super.properties, _config: {} };
  }

  get translationPath() { return "/local/ha-controls/multi-state-card/translations"; }
  get translationVersion() { return "1.0.0"; }

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
      { name: "text", label: this._localize('text'), selector: { text: {} } },
      {
        name: "",
        type: "grid",
        schema: [
          { name: "color", label: this._localize('color_inherit'), selector: { "text": {} } },
          { name: "font_size", label: this._localize('font_size_placeholder'), selector: { text: {} } }
        ]
      },
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