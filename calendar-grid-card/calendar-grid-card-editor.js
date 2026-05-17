import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

const VERSION = new URL(import.meta.url).searchParams.get('v') || '0.4.21';

class CalendarGridCardEditor extends HAControlBase {
  static get properties() {
    return { ...super.properties, _config: {}, _dayNamesExpanded: { state: true } };
  }

  /**
   * Invoked when the element is added to the document's DOM.
   * Ensures that the ha-entity-picker is available.
   */
  connectedCallback() {
    super.connectedCallback();
    // Load ha-entity-picker if not available
    if (customElements.get("ha-entity-picker")) return;

    const card = customElements.get("hui-entities-card");
    if (!card) return;

    card.getConfigElement();
  }

  /**
   * Returns the path to the translation files.
   */
  get translationPath() {
    return "/local/ha-controls/calendar-grid-card/translations";
  }

  /**
   * Returns the version of the translation files.
   */
  get translationVersion() {
    return VERSION;
  }

  /**
   * Sets the configuration for the card.
   * @param {Object} config - The configuration object.
   */
  setConfig(config) {
    // Set configuration
    this._config = config;
  }

  /**
   * Handles changes to configuration values from the UI.
   * @param {Event} ev - The event object.
   */
  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const target = ev.target;
    const configValue = target.configValue || target.getAttribute('configValue');

    if (!configValue) return;

    // If the value is empty, remove it from the configuration
    if (target.value === "") {
      const newConfig = { ...this._config };
      delete newConfig[configValue];
      this._config = newConfig;
      this._fireConfigChanged();
      return;
    }

    // Otherwise, update the configuration with the new value
    let newValue = target.checked !== undefined ? target.checked : target.value;
    // Handle day names list
    if (configValue === "day_names") {
        newValue = newValue.split(',').map(v => v.trim());
    }
    this._config = {
      ...this._config,
      [configValue]: newValue,
    };
    this._fireConfigChanged();
  }

  /**
   * Handles changes to the view (week/month) toggle.
   * @param {Event} ev - The event object.
   */
  _viewChanged(ev) {
    if (!this._config || !this.hass) return;
    // Update default view based on switch state
    this._config = {
      ...this._config,
      default_view: ev.target.checked ? 'week' : 'month',
    };
    this._fireConfigChanged();
  }

  /**
   * Dispatches a config-changed event to notify the parent element.
   */
  _fireConfigChanged() {
    // Dispatch config changed event
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Handles changes from the ha-form element.
   * @param {Event} ev - The event object.
   */
  _formValueChanged(ev) {
    // Update config from form values
    this._config = { ...this._config, ...ev.detail.value };
    this._fireConfigChanged();
  }

  /**
   * Retrieves the list of day names based on configuration or defaults.
   * @returns {Array<string>} The list of day names.
   */
  _getDayNames() {
    let dayNames = this._config.day_names;
    // Handle string input for day names
    if (typeof dayNames === 'string') {
      dayNames = dayNames.split(',').map(v => v.trim());
    }

    // Return configured day names if valid
    if (dayNames && Array.isArray(dayNames) && dayNames.length === 7) {
      return dayNames;
    }

    // Default day names based on first day of week
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
    const result = [];
    for (let i = 0; i < 7; i++) {
      result.push(defaultDayNames[(firstDayOfWeek + i) % 7]);
    }
    return result;
  }

  /**
   * Renders the editor UI.
   * @returns {TemplateResult} The rendered HTML.
   */
  render() {
    if (!this.hass || !this._config) return html``;

    const entities = this._config.entities || [];
    const dayNames = this._getDayNames();

    return html`
      <link rel="stylesheet" href="/local/ha-controls/calendar-grid-card/calendar-grid-card-editor.css?v=${this.translationVersion}">
      <div class="card-config">
        <ha-form
            .hass=${this.hass}
            .data=${{ 
                first_day_of_week: this._config.first_day_of_week !== undefined ? String(this._config.first_day_of_week) : "1",
                orientation: this._config.orientation || "horizontal"
            }}
            .schema=${[
                {
                    name: "first_day_of_week",
                    label: this._localize('cgc.editor.first_day_of_week'),
                    selector: {
                        select: {
                            options: [
                                { value: "0", label: this._localize('cgc.editor.sunday') },
                                { value: "1", label: this._localize('cgc.editor.monday') },
                                { value: "2", label: this._localize('cgc.editor.tuesday') },
                                { value: "3", label: this._localize('cgc.editor.wednesday') },
                                { value: "4", label: this._localize('cgc.editor.thursday') },
                                { value: "5", label: this._localize('cgc.editor.friday') },
                                { value: "6", label: this._localize('cgc.editor.saturday') }
                            ],
                            mode: "dropdown"
                        }
                    }
                },
                {
                    name: "orientation",
                    label: this._localize('cgc.editor.orientation'),
                    selector: {
                        select: {
                            options: [
                                { value: "horizontal", label: this._localize('cgc.editor.horizontal') },
                                { value: "vertical", label: this._localize('cgc.editor.vertical') }
                            ],
                            mode: "dropdown"
                        }
                    }
                }
            ]}
            .computeLabel=${(s) => s.label}
            @value-changed=${(ev) => this._formValueChanged(ev)}
        ></ha-form>
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
        <ha-form
            .hass=${this.hass}
            .data=${{ sidebar_position: this._config.sidebar_position || 'right' }}
            .schema=${[
                {
                    name: "sidebar_position",
                    label: this._localize('cgc.editor.sidebar_position'),
                    selector: {
                        select: {
                            options: [
                                { value: "right", label: this._localize('cgc.editor.pos_right') },
                                { value: "left", label: this._localize('cgc.editor.pos_left') },
                                { value: "top", label: this._localize('cgc.editor.pos_top') },
                                { value: "bottom", label: this._localize('cgc.editor.pos_bottom') },
                                { value: "hidden", label: this._localize('cgc.editor.pos_hidden') }
                            ],
                            mode: "dropdown"
                        }
                    }
                }
            ]}
            .computeLabel=${(s) => s.label}
            @value-changed=${(ev) => this._formValueChanged(ev)}
        ></ha-form>
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
                                <ha-form
                                    .hass=${this.hass}
                                    .data=${{ activeIconAnimation: activeIconAnimation || '' }}
                                    .schema=${[
                                        {
                                            name: "activeIconAnimation",
                                            label: this._localize('cgc.editor.active_icon_animation'),
                                            selector: {
                                                select: {
                                                    options: [
                                                        { value: "", label: "" },
                                                        { value: "spinning", label: this._localize('cgc.editor.anim_spinning') },
                                                        { value: "pulsing", label: this._localize('cgc.editor.anim_pulsing') }
                                                    ],
                                                    mode: "dropdown"
                                                }
                                            }
                                        }
                                    ]}
                                    .computeLabel=${(s) => s.label}
                                    @value-changed=${(ev) => this._entityColorChanged({ target: { value: ev.detail.value.activeIconAnimation } }, index, 'activeIconAnimation')}
                                ></ha-form>
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

  /**
   * Toggles the visibility of the day names editor.
   */
  _toggleDayNames() {
      // Toggle visibility of day names editor
      this._dayNamesExpanded = !this._dayNamesExpanded;
  }

  /**
   * Handles changes to a specific day name.
   * @param {Event} ev - The event object.
   * @param {number} index - The index of the day name being changed.
   */
  _dayNameChanged(ev, index) {
      const newValue = ev.target.value;
      const dayNames = this._getDayNames();
      const newDayNames = [...dayNames];
      newDayNames[index] = newValue;
      
      // Update day names in config
      this._config = { ...this._config, day_names: newDayNames };
      this._fireConfigChanged();
  }

  /**
   * Helper method to update a specific entity configuration.
   * @param {number} index - The index of the entity to update.
   * @param {Function} updateFn - A function that takes the current entity config and returns the updated one.
   */
  _updateEntity(index, updateFn) {
    const newEntities = [...(this._config.entities || [])];
    let entityConf = newEntities[index];
    
    // Normalize entity config to object
    entityConf = typeof entityConf === 'string' 
      ? { entity: entityConf } 
      : { ...entityConf };

    const updatedConf = updateFn(entityConf);
    newEntities[index] = updatedConf;

    this._config = { ...this._config, entities: newEntities };
    this._fireConfigChanged();
  }

  /**
   * Handles changes to an entity selection.
   * @param {Event} ev - The event object.
   * @param {number} index - The index of the entity being changed.
   */
  _entityChanged(ev, index) {
    // Update entity ID
    this._updateEntity(index, (entityConf) => {
      return { ...entityConf, entity: ev.detail.value };
    });
  }

  /**
   * Handles changes to entity properties (color, name, etc.).
   * @param {Event} ev - The event object.
   * @param {number} index - The index of the entity.
   * @param {string} prop - The property being changed.
   */
  _entityColorChanged(ev, index, prop) {
    // Update entity property (color, name, etc)
    this._updateEntity(index, (entityConf) => {
      return { ...entityConf, [prop]: ev.target.value };
    });
  }

  /**
   * Removes an entity from the configuration.
   * @param {number} index - The index of the entity to remove.
   */
  _removeEntity(index) {
      const newEntities = [...(this._config.entities || [])];
      // Remove entity at index
      newEntities.splice(index, 1);
      this._config = { ...this._config, entities: newEntities };
      this._fireConfigChanged();
  }

  /**
   * Adds a new filter to an entity configuration.
   * @param {number} index - The index of the entity.
   */
  _addFilter(index) {
    this._updateEntity(index, (entityConf) => {
      const filters = entityConf.filters ? [...entityConf.filters] : [];
      
      // Migrate legacy filter to filters array
      if (entityConf.filter) {
        filters.push({ pattern: entityConf.filter, case_sensitive: entityConf.case_sensitive !== false });
        delete entityConf.filter;
        delete entityConf.case_sensitive;
      }
      
      filters.push({ pattern: '', case_sensitive: true });
      return { ...entityConf, filters };
    });
  }

  /**
   * Removes a filter from an entity configuration.
   * @param {number} entityIndex - The index of the entity.
   * @param {number} filterIndex - The index of the filter to remove.
   */
  _removeFilter(entityIndex, filterIndex) {
    this._updateEntity(entityIndex, (entityConf) => {
      if (entityConf.filters) {
        const newFilters = [...entityConf.filters];
        newFilters.splice(filterIndex, 1);
        return { ...entityConf, filters: newFilters };
      }

      if (entityConf.filter && filterIndex === 0) {
        const newConf = { ...entityConf };
        delete newConf.filter;
        delete newConf.case_sensitive;
        return newConf;
      }
      return entityConf;
    });
  }

  /**
   * Handles changes to a filter property.
   * @param {Event} ev - The event object.
   * @param {number} entityIndex - The index of the entity.
   * @param {number} filterIndex - The index of the filter.
   * @param {string} prop - The property being changed.
   */
  _filterChanged(ev, entityIndex, filterIndex, prop) {
    this._updateEntity(entityIndex, (entityConf) => {
      // Ensure filters array exists
      let filters = entityConf.filters ? [...entityConf.filters] : [];
      const newConf = { ...entityConf };

      // Migrate legacy filter if needed
      if (!entityConf.filters && entityConf.filter) {
        filters.push({ pattern: entityConf.filter, case_sensitive: entityConf.case_sensitive !== false });
        delete newConf.filter;
        delete newConf.case_sensitive;
      }

      // Update specific filter
      filters[filterIndex] = { ...filters[filterIndex], [prop]: ev.target[prop === 'case_sensitive' ? 'checked' : 'value'] };
      newConf.filters = filters;
      return newConf;
    });
  }

  /**
   * Adds a new entity to the configuration.
   * @param {Event} ev - The event object containing the new entity ID.
   */
  _addEntity(ev) {
      const newValue = ev.detail.value;
      if (!newValue) return;
      
      const newEntities = [...(this._config.entities || [])];
      // Add new entity
      newEntities.push(newValue);
      this._config = { ...this._config, entities: newEntities };
      this._fireConfigChanged();
      
      // Clear input
      ev.target.value = "";
  }
}

customElements.define("calendar-grid-card-editor", CalendarGridCardEditor);