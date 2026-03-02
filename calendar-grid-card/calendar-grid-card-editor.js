const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

class CalendarGridCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, _config: {} };
  }

  connectedCallback() {
    super.connectedCallback();
    if (!customElements.get("ha-entity-picker")) {
      const card = customElements.get("hui-entities-card");
      if (card) {
        card.getConfigElement();
      }
    }
  }

  setConfig(config) {
    this._config = config;
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const target = ev.target;
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (target.value === "") {
        const newConfig = { ...this._config };
        delete newConfig[target.configValue];
        this._config = newConfig;
      } else {
        this._config = {
          ...this._config,
          [target.configValue]: target.checked !== undefined ? target.checked : target.value,
        };
      }
    }
    this._fireConfigChanged();
  }

  _fireConfigChanged() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (!this.hass || !this._config) {
      return html``;
    }

    const entities = this._config.entities || [];

    return html`
      <link rel="stylesheet" href="/local/ha-controls/calendar-grid-card/calendar-grid-card-editor.css?v=0.0.17">
      <div class="card-config">
        <div class="option">
            <div class="heading">Entities</div>
            <div class="entities">
                ${entities.map((entityConf, index) => {
                    const entityId = typeof entityConf === "object" ? entityConf.entity : entityConf;
                    return html`
                        <div class="entity-row">
                            <ha-entity-picker
                                .hass=${this.hass}
                                .value=${entityId}
                                .includeDomains=${["calendar"]}
                                @value-changed=${(ev) => this._entityChanged(ev, index)}
                                allow-custom-entity
                            ></ha-entity-picker>
                            <ha-icon-button
                                @click=${() => this._removeEntity(index)}
                            ><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
                        </div>
                    `;
                })}
                <ha-entity-picker
                    .hass=${this.hass}
                    .includeDomains=${["calendar"]}
                    @value-changed=${this._addEntity}
                    allow-custom-entity
                ></ha-entity-picker>
            </div>
        </div>
        
        <ha-textfield
            label="First day of week (0=Sun, 1=Mon)"
            type="number"
            .value=${this._config.first_day_of_week !== undefined ? this._config.first_day_of_week : 1}
            .configValue=${"first_day_of_week"}
            @input=${this._valueChanged}
        ></ha-textfield>
      </div>
    `;
  }

  _entityChanged(ev, index) {
      const newValue = ev.detail.value;
      const newEntities = [...(this._config.entities || [])];
      if (typeof newEntities[index] === 'object') {
          newEntities[index] = { ...newEntities[index], entity: newValue };
      } else {
          newEntities[index] = newValue;
      }
      this._config = { ...this._config, entities: newEntities };
      this._fireConfigChanged();
  }

  _removeEntity(index) {
      const newEntities = [...(this._config.entities || [])];
      newEntities.splice(index, 1);
      this._config = { ...this._config, entities: newEntities };
      this._fireConfigChanged();
  }

  _addEntity(ev) {
      const newValue = ev.detail.value;
      if (!newValue) return;
      const newEntities = [...(this._config.entities || [])];
      newEntities.push(newValue);
      this._config = { ...this._config, entities: newEntities };
      this._fireConfigChanged();
      ev.target.value = "";
  }
}

customElements.define("calendar-grid-card-editor", CalendarGridCardEditor);