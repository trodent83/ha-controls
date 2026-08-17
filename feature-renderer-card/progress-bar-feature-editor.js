import { HAControlBase, html } from "../ha-control-base.js?v=0.6.9";

/**
 * ProgressBarFeatureEditor
 * Visual configuration editor UI for the ProgressBarFeature custom card feature.
 * 
 * @extends HAControlBase
 */
class ProgressBarFeatureEditor extends HAControlBase {
  static get properties() {
    return { ...super.properties, _config: {} };
  }

  get translationPath() { return "/local/ha-controls/feature-renderer-card/translations"; }
  get translationVersion() { return "0.1.36"; }

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
      { name: "name", label: "Name / Label", selector: { text: {} } },
      { name: "icon", label: "Icon", selector: { icon: {} } },
      {
        name: "",
        type: "grid",
        schema: [
          { name: "min", label: "Min Value", selector: { number: {} } },
          { name: "max", label: "Max Value", selector: { number: {} } }
        ]
      },
      { name: "unit", label: "Unit of Measurement Override (e.g. %)", selector: { text: {} } },
      { name: "color", label: "Color (empty to inherit)", selector: { text: {} } },
      {
        name: "",
        type: "grid",
        schema: [
          { name: "show_icon", label: "Show Icon", selector: { boolean: {} } },
          { name: "show_label", label: "Show Label", selector: { boolean: {} } },
          { name: "show_value", label: "Show Value", selector: { boolean: {} } },
          { name: "reverse", label: "Reverse Direction", selector: { boolean: {} } }
        ]
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

customElements.define("progress-bar-feature-editor", ProgressBarFeatureEditor);
