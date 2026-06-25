import { HAControlBase, html } from "../ha-control-base.js?v=0.6.4";

class FeatureSelector extends HAControlBase {
  static get properties() {
    return {
      hass: { attribute: false },
      label: { type: String },
      tags: { type: Array }
    };
  }

  _getAvailableFeatures() {
    const allFeatures = window.customCardFeatures || [];
    if (!this.tags || this.tags.length === 0) {
      return allFeatures;
    }
    return allFeatures.filter(f =>
      Array.isArray(f.tags) && f.tags.some(tag => this.tags.includes(tag))
    );
  }

  _valueChanged(ev) {
    const type = ev.detail.value.new_feature;
    if (!type) return;

    this.dispatchEvent(new CustomEvent("feature-selected", {
      detail: { type: type },
      bubbles: true,
      composed: true
    }));

    ev.target.value = { new_feature: "" };
  }

  render() {
    if (!this.hass) return html``;

    const availableFeatures = this._getAvailableFeatures();

    const schema = [
      {
        name: "new_feature",
        label: this.label || "Add Feature",
        selector: {
          select: {
            options: [
              { value: "", label: "Select a feature..." },
              ...availableFeatures.map(f => ({ value: f.type, label: f.name }))
            ],
            mode: "dropdown",
            filter: true
          }
        }
      }
    ];

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${{ new_feature: "" }}
        .schema=${schema}
        .computeLabel=${(s) => s.label}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

customElements.define("feature-selector-card", FeatureSelector);