const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

const translationCache = {};

class CalendarGridCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, _config: {}, _dayNamesExpanded: { state: true }, _strings: { state: true } };
  }

  constructor() {
    super();
    this._strings = {};
    this._loadedLang = null;
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
    const configValue = target.configValue || target.getAttribute('configValue');
    if (configValue) {
      if (target.value === "") {
        const newConfig = { ...this._config };
        delete newConfig[configValue];
        this._config = newConfig;
      } else {
        let newValue = target.checked !== undefined ? target.checked : target.value;
        if (configValue === "day_names") {
            newValue = newValue.split(',').map(v => v.trim());
        }
        this._config = {
          ...this._config,
          [configValue]: newValue,
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

  updated(changedProps) {
    if (changedProps.has('hass') && this.hass) {
        const lang = this.hass.language;
        if (lang !== this._loadedLang) {
            this._loadTranslations(lang);
        }
    }
  }

  async _loadTranslations(lang) {
      this._loadedLang = lang;
      const languages = [lang];
      if (lang.includes('-')) {
          languages.push(lang.split('-')[0]);
      }
      if (!languages.includes('en')) {
          languages.push('en');
      }

      let setStrings = false;

      for (const l of languages) {
          if (!translationCache[l]) {
              try {
                  const response = await fetch(`/local/ha-controls/calendar-grid-card/translations/${l}.json?v=0.3.9`);
                  if (response.ok) {
                      translationCache[l] = await response.json();
                  }
              } catch (e) {
                  // Ignore
              }
          }
          
          if (translationCache[l]) {
              if (!setStrings) {
                  this._strings = translationCache[l];
                  setStrings = true;
              }
              if (l === 'en') return;
              if (translationCache['en']) return;
          }
      }
  }

  _localize(key, replace = {}) {
    let translated = this._strings ? this._strings[key] : undefined;
    if (translated === undefined) {
        // Try fallback to en if current is not en and we have en loaded
        if (this._loadedLang !== 'en' && translationCache['en']) {
            translated = translationCache['en'][key];
        }
    }
    if (translated === undefined) return key;

    for (const [k, v] of Object.entries(replace)) {
        translated = translated.replace(`{${k}}`, v);
    }
    return translated;
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
        const defaultDayNames = [
            this._localize('cgc.days.short_sun'),
            this._localize('cgc.days.short_mon'),
            this._localize('cgc.days.short_tue'),
            this._localize('cgc.days.short_wed'),
            this._localize('cgc.days.short_thu'),
            this._localize('cgc.days.short_fri'),
            this._localize('cgc.days.short_sat')
        ];
        dayNames = [];
        for (let i = 0; i < 7; i++) {
            dayNames.push(defaultDayNames[(firstDayOfWeek + i) % 7]);
        }
    }

    return html`
      <link rel="stylesheet" href="/local/ha-controls/calendar-grid-card/calendar-grid-card-editor.css?v=0.4.0">
      <div class="card-config">
        <ha-select
            label="${this._localize('cgc.editor.first_day_of_week')}"
            .value=${this._config.first_day_of_week !== undefined ? String(this._config.first_day_of_week) : "1"}
            .configValue=${"first_day_of_week"}
            @selected=${(ev) => this._valueChanged(ev)}
            @closed=${(e) => e.stopPropagation()}
            fixedMenuPosition
            naturalMenuWidth
        >
            <mwc-list-item value="0">${this._localize('cgc.editor.sunday')}</mwc-list-item>
            <mwc-list-item value="1">${this._localize('cgc.editor.monday')}</mwc-list-item>
            <mwc-list-item value="2">${this._localize('cgc.editor.tuesday')}</mwc-list-item>
            <mwc-list-item value="3">${this._localize('cgc.editor.wednesday')}</mwc-list-item>
            <mwc-list-item value="4">${this._localize('cgc.editor.thursday')}</mwc-list-item>
            <mwc-list-item value="5">${this._localize('cgc.editor.friday')}</mwc-list-item>
            <mwc-list-item value="6">${this._localize('cgc.editor.saturday')}</mwc-list-item>
        </ha-select>
        <ha-formfield label="${this._localize('cgc.editor.week_view')}">
            <ha-switch
                .checked=${this._config.default_view === 'week'}
                @change=${(ev) => this._viewChanged(ev)}
            ></ha-switch>
        </ha-formfield>
        <div class="day-names-container">
            <div class="header" @click=${() => this._toggleDayNames()}>
                <span>${this._localize('cgc.editor.day_names')}</span>
                <ha-icon icon="${this._dayNamesExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}"></ha-icon>
            </div>
            ${this._dayNamesExpanded ? html`
                <div class="day-names-list">
                    ${dayNames.map((day, index) => html`
                        <ha-textfield
                            label="${this._localize('cgc.editor.day_n', { n: index + 1 })}"
                            .value=${day}
                            @input=${(ev) => this._dayNameChanged(ev, index)}
                        ></ha-textfield>
                    `)}
                </div>
            ` : ''}
        </div>
        <ha-textfield
            label="${this._localize('cgc.editor.today_background')}"
            .value=${this._config.today_background || ''}
            .configValue=${"today_background"}
            @input=${(ev) => this._valueChanged(ev)}
        ></ha-textfield>
        <ha-textfield
            label="${this._localize('cgc.editor.today_border')}"
            .value=${this._config.today_border || ''}
            .configValue=${"today_border"}
            @input=${(ev) => this._valueChanged(ev)}
        ></ha-textfield>
        <ha-formfield label="${this._localize('cgc.editor.show_finished_events')}">
            <ha-switch
                .checked=${this._config.show_finished_events !== false}
                .configValue=${"show_finished_events"}
                .value=${"on"}
                @change=${(ev) => this._valueChanged(ev)}
            ></ha-switch>
        </ha-formfield>
        <ha-formfield label="${this._localize('cgc.editor.show_refresh_button')}">
            <ha-switch
                .checked=${this._config.show_refresh_button !== false}
                .configValue=${"show_refresh_button"}
                .value=${"on"}
                @change=${(ev) => this._valueChanged(ev)}
            ></ha-switch>
        </ha-formfield>
        <ha-select
            label="${this._localize('cgc.editor.sidebar_position')}"
            .value=${this._config.sidebar_position || 'right'}
            .configValue=${"sidebar_position"}
            @selected=${(ev) => this._valueChanged(ev)}
            @closed=${(e) => e.stopPropagation()}
            fixedMenuPosition
            naturalMenuWidth
        >
            <mwc-list-item value="right">${this._localize('cgc.editor.pos_right')}</mwc-list-item>
            <mwc-list-item value="left">${this._localize('cgc.editor.pos_left')}</mwc-list-item>
            <mwc-list-item value="top">${this._localize('cgc.editor.pos_top')}</mwc-list-item>
            <mwc-list-item value="bottom">${this._localize('cgc.editor.pos_bottom')}</mwc-list-item>
            <mwc-list-item value="hidden">${this._localize('cgc.editor.pos_hidden')}</mwc-list-item>
        </ha-select>
        <div class="separator"></div>
        <div class="option">
            <div class="heading">${this._localize('cgc.editor.entities')}</div>
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

                    let filters = [];
                    if (typeof entityConf === 'object') {
                        if (entityConf.filters) {
                            filters = entityConf.filters;
                        } else if (entityConf.filter) {
                            filters = [{ pattern: entityConf.filter, case_sensitive: entityConf.case_sensitive !== false }];
                        }
                    }

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
                                    label="${this._localize('cgc.editor.name')}"
                                    .value=${name || ''}
                                    @input=${(ev) => this._entityColorChanged(ev, index, 'name')}
                                ></ha-textfield>
                                <ha-textfield
                                    label="${this._localize('cgc.editor.foreground')}"
                                    .value=${color || ''}
                                    @input=${(ev) => this._entityColorChanged(ev, index, 'color')}
                                ></ha-textfield>
                                <ha-textfield
                                    label="${this._localize('cgc.editor.background')}"
                                    .value=${backgroundColor || ''}
                                    @input=${(ev) => this._entityColorChanged(ev, index, 'backgroundColor')}
                                ></ha-textfield>
                                <ha-textfield
                                    label="${this._localize('cgc.editor.icon_color')}"
                                    .value=${iconColor || ''}
                                    @input=${(ev) => this._entityColorChanged(ev, index, 'iconColor')}
                                ></ha-textfield>
                                <div class="separator"></div>
                                <ha-textfield
                                    label="${this._localize('cgc.editor.active_foreground')}"
                                    .value=${activeColor || ''}
                                    @input=${(ev) => this._entityColorChanged(ev, index, 'activeColor')}
                                ></ha-textfield>
                                <ha-textfield
                                    label="${this._localize('cgc.editor.active_background')}"
                                    .value=${activeBackgroundColor || ''}
                                    @input=${(ev) => this._entityColorChanged(ev, index, 'activeBackgroundColor')}
                                ></ha-textfield>
                                <ha-select
                                    label="${this._localize('cgc.editor.active_icon_animation')}"
                                    .value=${activeIconAnimation || ''}
                                    @selected=${(ev) => this._entityColorChanged(ev, index, 'activeIconAnimation')}
                                    @closed=${(e) => e.stopPropagation()}
                                    fixedMenuPosition
                                    naturalMenuWidth
                                >
                                    <mwc-list-item value=""></mwc-list-item>
                                    <mwc-list-item value="spinning">${this._localize('cgc.editor.anim_spinning')}</mwc-list-item>
                                    <mwc-list-item value="pulsing">${this._localize('cgc.editor.anim_pulsing')}</mwc-list-item>
                                </ha-select>
                            </div>
                            <div class="filters-list">
                                <div class="filters-header">${this._localize('cgc.editor.filters_header')}</div>
                                ${filters.map((filter, filterIndex) => html`
                                    <div class="filter-row">
                                        <ha-textfield
                                            class="filter-pattern"
                                            label="${this._localize('cgc.editor.pattern')}"
                                            .value=${filter.pattern || ''}
                                            @input=${(ev) => this._filterChanged(ev, index, filterIndex, 'pattern')}
                                        ></ha-textfield>
                                        <ha-formfield label="${this._localize('cgc.editor.case_sensitive')}">
                                            <ha-switch
                                                .checked=${filter.case_sensitive !== false}
                                                @change=${(ev) => this._filterChanged(ev, index, filterIndex, 'case_sensitive')}
                                            ></ha-switch>
                                        </ha-formfield>
                                        <ha-icon-button
                                            @click=${() => this._removeFilter(index, filterIndex)}
                                        ><ha-icon icon="mdi:delete-outline"></ha-icon></ha-icon-button>
                                    </div>
                                `)}
                                <ha-button @click=${() => this._addFilter(index)}>${this._localize('cgc.editor.add_filter')}</ha-button>
                            </div>
                        </div>
                    `;
                })}
                <div class="separator"></div>
                <div class="add-entity-header">${this._localize('cgc.editor.add_new_calendar')}</div>
                <ha-entity-picker
                    .hass=${this.hass}
                    .includeDomains=${["calendar"]}
                    @value-changed=${(ev) => this._addEntity(ev)}
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
          const defaultDayNames = [
            this._localize('cgc.days.short_sun'),
            this._localize('cgc.days.short_mon'),
            this._localize('cgc.days.short_tue'),
            this._localize('cgc.days.short_wed'),
            this._localize('cgc.days.short_thu'),
            this._localize('cgc.days.short_fri'),
            this._localize('cgc.days.short_sat')
          ];
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

  _addFilter(index) {
      const newEntities = [...(this._config.entities || [])];
      let entityConf = newEntities[index];
      if (typeof entityConf === 'string') {
          entityConf = { entity: entityConf };
      } else {
          entityConf = { ...entityConf };
      }
      
      const filters = entityConf.filters ? [...entityConf.filters] : [];
      if (entityConf.filter) {
          filters.push({ pattern: entityConf.filter, case_sensitive: entityConf.case_sensitive !== false });
          delete entityConf.filter;
          delete entityConf.case_sensitive;
      }
      filters.push({ pattern: '', case_sensitive: true });
      entityConf.filters = filters;
      newEntities[index] = entityConf;
      this._config = { ...this._config, entities: newEntities };
      this._fireConfigChanged();
  }

  _removeFilter(entityIndex, filterIndex) {
      const newEntities = [...(this._config.entities || [])];
      let entityConf = newEntities[entityIndex];
      if (typeof entityConf === 'string') {
          entityConf = { entity: entityConf };
      } else {
          entityConf = { ...entityConf };
      }
      
      if (entityConf.filters) {
        const newFilters = [...entityConf.filters];
        newFilters.splice(filterIndex, 1);
        entityConf.filters = newFilters;
      } else if (entityConf.filter && filterIndex === 0) {
        delete entityConf.filter;
        delete entityConf.case_sensitive;
      }
      
      newEntities[entityIndex] = entityConf;
      this._config = { ...this._config, entities: newEntities };
      this._fireConfigChanged();
  }

  _filterChanged(ev, entityIndex, filterIndex, prop) {
      const newEntities = [...(this._config.entities || [])];
      let entityConf = newEntities[entityIndex];
      if (typeof entityConf === 'string') {
          entityConf = { entity: entityConf };
      } else {
          entityConf = { ...entityConf };
      }
      
      let filters = entityConf.filters ? [...entityConf.filters] : [];
      if (!entityConf.filters && entityConf.filter) {
          filters.push({ pattern: entityConf.filter, case_sensitive: entityConf.case_sensitive !== false });
          delete entityConf.filter;
          delete entityConf.case_sensitive;
      }
      
      filters[filterIndex] = { ...filters[filterIndex], [prop]: ev.target[prop === 'case_sensitive' ? 'checked' : 'value'] };
      entityConf.filters = filters;

      newEntities[entityIndex] = entityConf;
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