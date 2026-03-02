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
      <link rel="stylesheet" href="/local/ha-controls/calendar-grid-card/calendar-grid-card-editor.css?v=0.0.46">
      <div class="card-config">
        <ha-textfield
            label="First day of week (0=Sun, 1=Mon)"
            type="number"
            .value=${this._config.first_day_of_week !== undefined ? this._config.first_day_of_week : 1}
            .configValue=${"first_day_of_week"}
            @input=${this._valueChanged}
        ></ha-textfield>
        <ha-textfield
            label="Today Background"
            .value=${this._config.today_background || ''}
            .configValue=${"today_background"}
            @input=${this._valueChanged}
        ></ha-textfield>
        <ha-textfield
            label="Today Border"
            .value=${this._config.today_border || ''}
            .configValue=${"today_border"}
            @input=${this._valueChanged}
        ></ha-textfield>
        <ha-formfield label="Show finished events">
            <ha-switch
                .checked=${this._config.show_finished_events !== false}
                .configValue=${"show_finished_events"}
                .value=${"on"}
                @change=${this._valueChanged}
            ></ha-switch>
        </ha-formfield>
        <ha-select
            label="Sidebar Position"
            .value=${this._config.sidebar_position || 'right'}
            .configValue=${"sidebar_position"}
            @selected=${this._valueChanged}
            @closed=${(e) => e.stopPropagation()}
            fixedMenuPosition
            naturalMenuWidth
        >
            <mwc-list-item value="right">Right</mwc-list-item>
            <mwc-list-item value="left">Left</mwc-list-item>
            <mwc-list-item value="top">Top</mwc-list-item>
            <mwc-list-item value="bottom">Bottom</mwc-list-item>
        </ha-select>
        <div class="separator"></div>
        <div class="option">
            <div class="heading">Entities</div>
            <div class="entities">
                ${entities.map((entityConf, index) => {
                    const entityId = typeof entityConf === "object" ? entityConf.entity : entityConf;
                    const name = typeof entityConf === "object" ? entityConf.name : "";
                    const color = typeof entityConf === "object" ? entityConf.color : "";
                    const backgroundColor = typeof entityConf === "object" ? entityConf.backgroundColor : "";
                    const iconColor = typeof entityConf === "object" ? entityConf.iconColor : "";
                    const activeColor = typeof entityConf === "object" ? entityConf.activeColor : "";
                    const activeBackgroundColor = typeof entityConf === "object" ? entityConf.activeBackgroundColor : "";
                    const activeIconAnimation = typeof entityConf === "object" ? entityConf.activeIconAnimation : "";

                    return html`
                        <div class="entity-row-container">
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
                            <div class="separator"></div>
                            <div class="entity-options">
                                <ha-textfield
                                    label="Name"
                                    .value=${name || ''}
                                    @input=${(ev) => this._entityColorChanged(ev, index, 'name')}
                                ></ha-textfield>
                                <ha-textfield
                                    label="Foreground"
                                    .value=${color || ''}
                                    @input=${(ev) => this._entityColorChanged(ev, index, 'color')}
                                ></ha-textfield>
                                <ha-textfield
                                    label="Background"
                                    .value=${backgroundColor || ''}
                                    @input=${(ev) => this._entityColorChanged(ev, index, 'backgroundColor')}
                                ></ha-textfield>
                                <ha-textfield
                                    label="Icon Color"
                                    .value=${iconColor || ''}
                                    @input=${(ev) => this._entityColorChanged(ev, index, 'iconColor')}
                                ></ha-textfield>
                                <div class="separator"></div>
                                <ha-textfield
                                    label="Active Foreground"
                                    .value=${activeColor || ''}
                                    @input=${(ev) => this._entityColorChanged(ev, index, 'activeColor')}
                                ></ha-textfield>
                                <ha-textfield
                                    label="Active Background"
                                    .value=${activeBackgroundColor || ''}
                                    @input=${(ev) => this._entityColorChanged(ev, index, 'activeBackgroundColor')}
                                ></ha-textfield>
                                <ha-select
                                    label="Active Icon Animation"
                                    .value=${activeIconAnimation || ''}
                                    @selected=${(ev) => this._entityColorChanged(ev, index, 'activeIconAnimation')}
                                    @closed=${(e) => e.stopPropagation()}
                                    fixedMenuPosition
                                    naturalMenuWidth
                                >
                                    <mwc-list-item value=""></mwc-list-item>
                                    <mwc-list-item value="spinning">Spinning</mwc-list-item>
                                    <mwc-list-item value="pulsing">Pulsing</mwc-list-item>
                                </ha-select>
                            </div>
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

  _entityColorChanged(ev, index, prop) {
      const newValue = ev.target.value;
      const newEntities = [...(this._config.entities || [])];
      let entityConf = newEntities[index];
      if (typeof entityConf === 'string') {
          entityConf = { entity: entityConf };
      } else {
          entityConf = { ...entityConf };
      }
      entityConf[prop] = newValue;
      newEntities[index] = entityConf;
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