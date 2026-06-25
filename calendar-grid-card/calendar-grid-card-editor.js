import { HAControlBase, html } from "../ha-control-base.js?v=0.6.4";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '0.4.21';

/**
 * CalendarGridCardEditor
 * Visual configuration editor UI for CalendarGridCard.
 * Manages calendar entities picker list, styling color overrides, regex exclusion filters,
 * first day of week selection, orientation layout grids, and sidebar positions.
 * 
 * @extends HAControlBase
 */
class CalendarGridCardEditor extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Tracks local config instance copy, dayNames section toggle state, and active tab selection state.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return { 
      ...super.properties, 
      _config: { type: Object }, 
      _dayNamesExpanded: { state: true },
      _activeTab: { type: String }
    };
  }

  /**
   * Initializes the CalendarGridCardEditor component instance,
   * setting default active tab to 'general'.
   */
  constructor() {
    super();
    this._activeTab = 'general';
  }

  /**
   * LitElement lifecycle mounting callback.
   * Leverages core Home Assistant entities pickers if not already loaded globally.
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
   * Resolves the directory path hosting the translation localizations.
   * 
   * @type {string}
   */
  get translationPath() {
    return "/local/ha-controls/calendar-grid-card/translations";
  }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() {
    return VERSION;
  }

  /**
   * Receives configuration details from Lovelace dashboard interface.
   * 
   * @param {Object} config - Config parameters
   */
  setConfig(config) {
    this._config = config;

    const knownKeys = [
      "first_day_of_week",
      "orientation",
      "default_view",
      "day_names",
      "today_background",
      "today_border",
      "show_finished_events",
      "show_refresh_button",
      "sidebar_position",
      "entities",
      "event_features"
    ];
    this._unrecognizedKeys = this._validateConfigKeys(config, knownKeys);
  }

  /**
   * Handles configuration values change event inside editor textfields, updating properties and dispatching events.
   * Cleans keys if they are emptied.
   * 
   * @param {Event} ev - Input event details
   * @private
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
   * Handles changes to the week/month view switch.
   * 
   * @param {Event} ev - Switch change event
   * @private
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
   * Dispatches the updated config dictionary back to dashboard engine.
   * 
   * @private
   */
  _fireConfigChanged() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Receives form values changes from the top-level `<ha-form>` component.
   * 
   * @param {CustomEvent} ev - Form value changed details
   * @private
   */
  _formValueChanged(ev) {
    this._config = { ...this._config, ...ev.detail.value };
    this._fireConfigChanged();
  }

  /**
   * Gathers list of day names based on configured list overrides or default localization strings.
   * 
   * @private
   * @returns {Array<string>} List of week day names
   */
  _getDayNames() {
    let dayNames = this._config.day_names;
    if (typeof dayNames === 'string') {
      dayNames = dayNames.split(',').map(v => v.trim());
    }

    if (dayNames && Array.isArray(dayNames) && dayNames.length === 7) {
      return dayNames;
    }

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
   * Renders the editor configuration interface layout.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  /**
   * Cleans the active configuration of any unrecognized properties.
   * Keeps only calendar grid card schema fields.
   * 
   * @private
   */
  _cleanConfig() {
    if (!this._config) return;
    const cleaned = {
      type: this._config.type
    };
    const addIfDiff = (key, defaultVal) => {
      const val = this._config[key];
      if (val !== undefined && val !== null && String(val) !== String(defaultVal)) {
        cleaned[key] = val;
      }
    };
    addIfDiff("first_day_of_week", 1);
    addIfDiff("orientation", "horizontal");
    addIfDiff("default_view", "month");
    addIfDiff("show_finished_events", true);
    addIfDiff("show_refresh_button", true);
    addIfDiff("sidebar_position", "right");

    if (this._config.day_names !== undefined) cleaned.day_names = this._config.day_names;
    if (this._config.today_background !== undefined) cleaned.today_background = this._config.today_background;
    if (this._config.today_border !== undefined) cleaned.today_border = this._config.today_border;
    if (this._config.event_features !== undefined) cleaned.event_features = this._config.event_features;
    
    if (this._config.entities && Array.isArray(this._config.entities)) {
      cleaned.entities = this._config.entities.map(ent => {
        if (typeof ent === 'object') {
          const e = { entity: ent.entity };
          if (ent.name !== undefined) e.name = ent.name;
          if (ent.color !== undefined) e.color = ent.color;
          if (ent.backgroundColor !== undefined) e.backgroundColor = ent.backgroundColor;
          if (ent.iconColor !== undefined) e.iconColor = ent.iconColor;
          if (ent.activeColor !== undefined) e.activeColor = ent.activeColor;
          if (ent.activeBackgroundColor !== undefined) e.activeBackgroundColor = ent.activeBackgroundColor;
          if (ent.activeIconAnimation !== undefined) e.activeIconAnimation = ent.activeIconAnimation;
          if (ent.filters !== undefined) e.filters = ent.filters;
          return e;
        }
        return ent;
      });
    }
    
    this._config = cleaned;
    this._fireConfigChanged();
  }

  /**
   * Resets the active configuration back to standard stub values.
   * 
   * @private
   */
  _resetConfig() {
    this._config = {
      type: this._config?.type || "custom:calendar-grid-card",
      entities: []
    };
    this._fireConfigChanged();
  }

  /**
   * Renders the editor configuration interface layout.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this._config) return html``;

    const entities = this._config.entities || [];
    const dayNames = this._getDayNames();

    const currentFeatures = this._config.event_features || [
      { type: "time" },
      { type: "location" },
      { type: "description" },
      { type: "attendees" }
    ];
    const hasTime = currentFeatures.some(f => f.type === 'time');
    const hasLocation = currentFeatures.some(f => f.type === 'location');
    const hasDescription = currentFeatures.some(f => f.type === 'description');
    const hasAttendees = currentFeatures.some(f => f.type === 'attendees');

    return html`
      ${this.renderStyle('calendar-grid-card-editor.css')}
      ${this.renderConfigValidationWarning()}
      
      <div class="ha-tabs">
        <div 
          class="ha-tab ${this._activeTab === 'general' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'general'; }}
        >
          ${this._localize('general') || 'General'}
        </div>
        <div 
          class="ha-tab ${this._activeTab === 'calendars' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'calendars'; }}
        >
          ${this._localize('cgc.editor.entities') || 'Calendars'}
        </div>
      </div>

      ${this._activeTab === 'general' ? html`
        <div class="card-config" style="margin-top: 0;">
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
                          <ha-input
                              label="${this._localize('cgc.editor.day_n', { n: index + 1 })}"
                              .value=${day}
                              @input=${(ev) => this._dayNameChanged(ev, index)}
                          ></ha-input>
                      `)}
                  </div>
              ` : ''}
          </div>
          <ha-input
              label="${this._localize('cgc.editor.today_background')}"
              .value=${this._config.today_background || ''}
              .configValue=${"today_background"}
              @input=${(ev) => this._valueChanged(ev)}
          ></ha-input>
          <ha-input
              label="${this._localize('cgc.editor.today_border')}"
              .value=${this._config.today_border || ''}
              .configValue=${"today_border"}
              @input=${(ev) => this._valueChanged(ev)}
          ></ha-input>
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
          <div class="event-features-container" style="margin-top: 16px; border-top: 1px solid var(--divider-color); padding-top: 16px;">
              <div class="heading" style="font-weight: 500; margin-bottom: 8px;">${this._localize('cgc.editor.event_features') || 'Event Details Dialog Features'}</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <ha-formfield label="${this._localize('cgc.editor.feature_time') || 'Show Time'}">
                      <ha-switch
                          .checked=${hasTime}
                          @change=${(ev) => this._toggleEventFeature('time', ev.target.checked)}
                      ></ha-switch>
                  </ha-formfield>
                  <ha-formfield label="${this._localize('cgc.editor.feature_location') || 'Show Location'}">
                      <ha-switch
                          .checked=${hasLocation}
                          @change=${(ev) => this._toggleEventFeature('location', ev.target.checked)}
                      ></ha-switch>
                  </ha-formfield>
                  <ha-formfield label="${this._localize('cgc.editor.feature_description') || 'Show Description'}">
                      <ha-switch
                          .checked=${hasDescription}
                          @change=${(ev) => this._toggleEventFeature('description', ev.target.checked)}
                      ></ha-switch>
                  </ha-formfield>
                  <ha-formfield label="${this._localize('cgc.editor.feature_attendees') || 'Show Attendees'}">
                      <ha-switch
                          .checked=${hasAttendees}
                          @change=${(ev) => this._toggleEventFeature('attendees', ev.target.checked)}
                      ></ha-switch>
                  </ha-formfield>
              </div>
          </div>
        </div>
      ` : html`
        <div class="card-config" style="margin-top: 0;">
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
                                  ></ha-icon-button>
                              </div>
                              <div class="separator"></div>
                              <div class="entity-options">
                                  <ha-input
                                      label="${this._localize('cgc.editor.name')}"
                                      .value=${name || ''}
                                      @input=${(ev) => this._entityColorChanged(ev, index, 'name')}
                                  ></ha-input>
                                  <ha-input
                                      label="${this._localize('cgc.editor.foreground')}"
                                      .value=${color || ''}
                                      @input=${(ev) => this._entityColorChanged(ev, index, 'color')}
                                  ></ha-input>
                                  <ha-input
                                      label="${this._localize('cgc.editor.background')}"
                                      .value=${backgroundColor || ''}
                                      @input=${(ev) => this._entityColorChanged(ev, index, 'backgroundColor')}
                                  ></ha-input>
                                  <ha-input
                                      label="${this._localize('cgc.editor.icon_color')}"
                                      .value=${iconColor || ''}
                                      @input=${(ev) => this._entityColorChanged(ev, index, 'iconColor')}
                                  ></ha-input>
                                  <div class="separator"></div>
                                  <ha-input
                                      label="${this._localize('cgc.editor.active_foreground')}"
                                      .value=${activeColor || ''}
                                      @input=${(ev) => this._entityColorChanged(ev, index, 'activeColor')}
                                  ></ha-input>
                                  <ha-input
                                      label="${this._localize('cgc.editor.active_background')}"
                                      .value=${activeBackgroundColor || ''}
                                      @input=${(ev) => this._entityColorChanged(ev, index, 'activeBackgroundColor')}
                                  ></ha-input>
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
                                          <ha-input
                                              class="filter-pattern"
                                              label="${this._localize('cgc.editor.pattern')}"
                                              .value=${filter.pattern || ''}
                                              @input=${(ev) => this._filterChanged(ev, index, filterIndex, 'pattern')}
                                          ></ha-input>
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
      `}

      <div class="editor-actions">
        <ha-button @click=${this._cleanConfig} outlined>
          <ha-icon icon="mdi:broom" slot="icon"></ha-icon>
          ${this._localize('clean') || 'Clean'}
        </ha-button>
        <ha-button @click=${this._resetConfig} outlined class="warning">
          <ha-icon icon="mdi:restore" slot="icon"></ha-icon>
          ${this._localize('reset') || 'Reset'}
        </ha-button>
      </div>
    `;
  }

  /**
   * Toggles the day names list editor visibility.
   * 
   * @private
   */
   _toggleDayNames() {
      this._dayNamesExpanded = !this._dayNamesExpanded;
  }

  _toggleEventFeature(type, checked) {
    let currentFeatures = this._config.event_features || [
      { type: "time" },
      { type: "location" },
      { type: "description" },
      { type: "attendees" }
    ];
    if (checked) {
      if (!currentFeatures.some(f => f.type === type)) {
        currentFeatures = [...currentFeatures, { type }];
      }
    } else {
      currentFeatures = currentFeatures.filter(f => f.type !== type);
    }
    this._config = { ...this._config, event_features: currentFeatures };
    this._fireConfigChanged();
  }

  /**
   * Updates an individual day name in the configurations array.
   * 
   * @param {Event} ev - Input event details
   * @param {number} index - Index sequence of day name edited
   * @private
   */
  _dayNameChanged(ev, index) {
      const newValue = ev.target.value;
      const dayNames = this._getDayNames();
      const newDayNames = [...dayNames];
      newDayNames[index] = newValue;
      
      this._config = { ...this._config, day_names: newDayNames };
      this._fireConfigChanged();
  }

  /**
   * General delegate utility updating target entity configuration blocks.
   * Normalizes entity config definitions.
   * 
   * @param {number} index - Index of target entity configuration to update
   * @param {Function} updateFn - Mutator delegate returning updated schema config
   * @private
   */
  _updateEntity(index, updateFn) {
    const newEntities = [...(this._config.entities || [])];
    let entityConf = newEntities[index];
    
    entityConf = typeof entityConf === 'string' 
      ? { entity: entityConf } 
      : { ...entityConf };

    const updatedConf = updateFn(entityConf);
    newEntities[index] = updatedConf;

    this._config = { ...this._config, entities: newEntities };
    this._fireConfigChanged();
  }

  /**
   * Updates calendar entity target source ID.
   * 
   * @param {CustomEvent} ev - Picker changed event details
   * @param {number} index - Index of entity row
   * @private
   */
  _entityChanged(ev, index) {
    this._updateEntity(index, (entityConf) => {
      return { ...entityConf, entity: ev.detail.value };
    });
  }

  /**
   * General entity properties mutator (names, color fields).
   * 
   * @param {Event} ev - Input event details
   * @param {number} index - Index of entity configuration block
   * @param {string} prop - Property key targeted
   * @private
   */
  _entityColorChanged(ev, index, prop) {
    this._updateEntity(index, (entityConf) => {
      return { ...entityConf, [prop]: ev.target.value };
    });
  }

  /**
   * Deletes a calendar entity configuration block by index.
   * 
   * @param {number} index - Index sequence of entity item to delete
   * @private
   */
  _removeEntity(index) {
      const newEntities = [...(this._config.entities || [])];
      newEntities.splice(index, 1);
      this._config = { ...this._config, entities: newEntities };
      this._fireConfigChanged();
  }

  /**
   * Appends a blank default filter definition object to a calendar configuration block.
   * Migrates legacy filter attributes if present.
   * 
   * @param {number} index - Index of target entity config block
   * @private
   */
  _addFilter(index) {
    this._updateEntity(index, (entityConf) => {
      const filters = entityConf.filters ? [...entityConf.filters] : [];
      
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
   * Deletes a filter pattern rule block by index from a calendar entity.
   * 
   * @param {number} entityIndex - Index of target entity config block
   * @param {number} filterIndex - Index sequence of filter to remove
   * @private
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
   * Updates regex properties inside an individual filter block.
   * Migrates legacy filter definitions if present.
   * 
   * @param {Event} ev - Input/switch event details
   * @param {number} entityIndex - Index of target entity config block
   * @param {number} filterIndex - Index sequence of filter rule
   * @param {string} prop - Property key updated ('pattern' or 'case_sensitive')
   * @private
   */
  _filterChanged(ev, entityIndex, filterIndex, prop) {
    this._updateEntity(entityIndex, (entityConf) => {
      let filters = entityConf.filters ? [...entityConf.filters] : [];
      const newConf = { ...entityConf };

      if (!entityConf.filters && entityConf.filter) {
        filters.push({ pattern: entityConf.filter, case_sensitive: entityConf.case_sensitive !== false });
        delete newConf.filter;
        delete newConf.case_sensitive;
      }

      filters[filterIndex] = { ...filters[filterIndex], [prop]: ev.target[prop === 'case_sensitive' ? 'checked' : 'value'] };
      newConf.filters = filters;
      return newConf;
    });
  }

  /**
   * Appends a new calendar source entity ID to target arrays.
   * 
   * @param {CustomEvent} ev - Picker changed event details
   * @private
   */
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