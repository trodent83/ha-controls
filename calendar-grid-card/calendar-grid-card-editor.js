const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

class CalendarGridCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, _config: {}, _dayNamesExpanded: { state: true } };
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
    if (target.configValue) {
      if (target.value === "") {
        const newConfig = { ...this._config };
        delete newConfig[target.configValue];
        this._config = newConfig;
      } else {
        let newValue = target.checked !== undefined ? target.checked : target.value;
        if (target.configValue === "day_names") {
            newValue = newValue.split(',').map(v => v.trim());
        }
        this._config = {
          ...this._config,
          [target.configValue]: newValue,
        };
      }
    }
    this._fireConfigChanged();
  }

  _viewChanged(ev) {
    if (!this._config || !this.hass) return;
    this._config = {
      ...this._config,
      default_view: ev.target.checked ? 'week' : 'month',
    };
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

    let dayNames = this._config.day_names;
    if (typeof dayNames === 'string') {
        dayNames = dayNames.split(',').map(v => v.trim());
    }
    if (!dayNames || !Array.isArray(dayNames) || dayNames.length !== 7) {
        const firstDayOfWeek = this._config.first_day_of_week !== undefined ? parseInt(this._config.first_day_of_week) : 1;
        const defaultDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames = [];
        for (let i = 0; i < 7; i++) {
            dayNames.push(defaultDayNames[(firstDayOfWeek + i) % 7]);
        }
    }

    return html`
      <link rel="stylesheet" href="/local/ha-controls/calendar-grid-card/calendar-grid-card-editor.css?v=0.2.4">
      <div class="card-config">
        <ha-select
            label="First day of week"
            .value=${this._config.first_day_of_week !== undefined ? String(this._config.first_day_of_week) : "1"}
            .configValue=${"first_day_of_week"}
            @selected=${this._valueChanged}
            @closed=${(e) => e.stopPropagation()}
            fixedMenuPosition
            naturalMenuWidth
        >
            <mwc-list-item value="0">Sunday</mwc-list-item>
            <mwc-list-item value="1">Monday</mwc-list-item>
            <mwc-list-item value="2">Tuesday</mwc-list-item>
            <mwc-list-item value="3">Wednesday</mwc-list-item>
            <mwc-list-item value="4">Thursday</mwc-list-item>
            <mwc-list-item value="5">Friday</mwc-list-item>
            <mwc-list-item value="6">Saturday</mwc-list-item>
        </ha-select>
        <ha-formfield label="Week View">
            <ha-switch
                .checked=${this._config.default_view === 'week'}
                @change=${this._viewChanged}
            ></ha-switch>
        </ha-formfield>
        <div class="day-names-container" style="margin-top: 8px; margin-bottom: 8px;">
            <div class="header" @click=${this._toggleDayNames} style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <span style="font-weight: bold;">Day Names</span>
                <ha-icon icon="${this._dayNamesExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}"></ha-icon>
            </div>
            ${this._dayNamesExpanded ? html`
                <div class="day-names-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
                    ${dayNames.map((day, index) => html`
                        <ha-textfield
                            label="Day ${index + 1}"
                            .value=${day}
                            @input=${(ev) => this._dayNameChanged(ev, index)}
                        ></ha-textfield>
                    `)}
                </div>
            ` : ''}
        </div>
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
        <ha-formfield label="Show refresh button">
            <ha-switch
                .checked=${this._config.show_refresh_button !== false}
                .configValue=${"show_refresh_button"}
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
            <mwc-list-item value="hidden">Hidden</mwc-list-item>
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

  _toggleDayNames() {
      this._dayNamesExpanded = !this._dayNamesExpanded;
  }

  _dayNameChanged(ev, index) {
      const newValue = ev.target.value;
      let dayNames = this._config.day_names;
      if (typeof dayNames === 'string') {
          dayNames = dayNames.split(',').map(v => v.trim());
      }
      if (!dayNames || !Array.isArray(dayNames) || dayNames.length !== 7) {
          const firstDayOfWeek = this._config.first_day_of_week !== undefined ? parseInt(this._config.first_day_of_week) : 1;
          const defaultDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          dayNames = [];
          for (let i = 0; i < 7; i++) {
              dayNames.push(defaultDayNames[(firstDayOfWeek + i) % 7]);
          }
      }
      const newDayNames = [...dayNames];
      newDayNames[index] = newValue;
      this._config = { ...this._config, day_names: newDayNames };
      this._fireConfigChanged();
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