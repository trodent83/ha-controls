import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

class TimerCardFeatureEditor extends HAControlBase {
  static get properties() {
    return { ...super.properties, _config: {} };
  }

  get translationPath() { return "/local/ha-controls/universal-select-card/translations"; }
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
      { name: "entity", label: this._localize('override_entity'), selector: { entity: { domain: "timer" } } }
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

customElements.define("timer-card-feature-editor", TimerCardFeatureEditor);