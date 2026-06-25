import { HAControlBase, html } from "../ha-control-base.js?v=0.6.4";

/**
 * Cache-busting version parameter for dynamic asset loading.
 * @type {string}
 */
const VERSION = "1.0.0";

/**
 * CalendarListCardEditor
 * Visual configuration editor UI for CalendarListCard.
 * Manages tabs for General, Entities, Features, Rules, and Appearance config.
 * 
 * @extends HAControlBase
 */
class CalendarListCardEditor extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return { 
      ...super.properties, 
      _config: { type: Object },
      _activeTab: { type: String }
    };
  }

  constructor() {
    super();
    this._activeTab = 'general';
  }

  /**
   * Resolves the directory path hosting the translation localizations.
   * 
   * @type {string}
   */
  get translationPath() { return "/local/ha-controls/calendar-list-card/translations"; }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() { return VERSION; }

  /**
   * Visual editor life cycle setup.
   */
  connectedCallback() {
    super.connectedCallback();
    if (!customElements.get("ha-entity-picker")) {
      const card = customElements.get("hui-entities-card");
      if (card) {
        card.getConfigElement();
      }
    }
  }

  /**
   * Receives config changes.
   * 
   * @param {Object} config - Lovelace configuration
   */
  setConfig(config) {
    this._config = config;

    const knownKeys = [
      "title",
      "icon",
      "max_days",
      "max_items",
      "show_due_date",
      "show_description",
      "show_due_in_days",
      "show_source",
      "show_refresh_button",
      "show_finished_events",
      "default_due_date_color",
      "date_separator_color",
      "day_separator_color",
      "due_in_days_separator_color",
      "source_color",
      "separator_mode",
      "entities",
      "entity",
      "due_date_colors",
      "features"
    ];
    this._unrecognizedKeys = this._validateConfigKeys(config, knownKeys);
  }

  /**
   * Handles visual value updates.
   * 
   * @param {Event} ev - Input event
   * @private
   */
  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const target = ev.target;
    const configValue = target.configValue;
    const value = target.checked !== undefined ? target.checked : target.value;

    if (configValue) {
        this._config = { ...this._config, [configValue]: value };
        this._fireConfigChanged();
    }
  }

  /**
   * Handles entities selection updates.
   */
  _entityChanged(ev, index) {
    const entities = this._getEntities();
    const newValue = ev.detail.value;
    if (typeof entities[index] === 'object') {
      entities[index] = { ...entities[index], entity: newValue };
    } else {
      entities[index] = newValue;
    }
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  _addEntity() {
    const entities = this._getEntities();
    entities.push("");
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  _removeEntity(index) {
    const entities = this._getEntities();
    entities.splice(index, 1);
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  _addFilter(index) {
    const entities = this._getEntities();
    let entityConf = typeof entities[index] === 'object' ? { ...entities[index] } : { entity: entities[index] };
    
    if (!entityConf.filters) {
      entityConf.filters = [];
    }
    entityConf.filters.push({ pattern: '', case_sensitive: true });
    entities[index] = entityConf;
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  _removeFilter(entityIndex, filterIndex) {
    const entities = this._getEntities();
    let entityConf = typeof entities[entityIndex] === 'object' ? { ...entities[entityIndex] } : { entity: entities[entityIndex] };
    
    if (entityConf.filters) {
      entityConf.filters.splice(filterIndex, 1);
    }
    entities[entityIndex] = entityConf;
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  _filterChanged(ev, entityIndex, filterIndex, prop) {
    const entities = this._getEntities();
    let entityConf = typeof entities[entityIndex] === 'object' ? { ...entities[entityIndex] } : { entity: entities[entityIndex] };
    
    if (!entityConf.filters) {
      entityConf.filters = [];
    }
    
    entityConf.filters[filterIndex] = { 
      ...entityConf.filters[filterIndex], 
      [prop]: ev.target[prop === 'case_sensitive' ? 'checked' : 'value'] 
    };
    entities[entityIndex] = entityConf;
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  /**
   * Helper parsing loaded features name.
   */
  _getFeatureName(type) {
    if (!type) return "Unknown Feature";
    const customFeatures = window.customCardFeatures || [];
    const found = customFeatures.find(f => f.type === type);
    if (found && found.name) return found.name;
    
    let cleanType = type.startsWith("custom:") ? type.substring(7) : type;
    cleanType = cleanType.replace(/-card-feature$/, '').replace(/-/g, ' ');
    return cleanType.replace(/\b\w/g, c => c.toUpperCase());
  }

  _addFeature(ev) {
    const type = ev.detail.type;
    if (!type) return;
    
    const featureConfig = { type: type };
    const isCustom = type.startsWith("custom:");
    const tag = isCustom ? type.substring(7) : `hui-${type}-card-feature`;
    const FeatureClass = customElements.get(tag);
    if (FeatureClass && FeatureClass.getStubConfig) {
        Object.assign(featureConfig, FeatureClass.getStubConfig());
    }

    const features = [...(this._config.features || []), featureConfig];
    this._config = { ...this._config, features };
    this._fireConfigChanged();
  }

  _removeFeature(fIdx) {
    const features = [...(this._config.features || [])];
    features.splice(fIdx, 1);
    this._config = { ...this._config, features };
    this._fireConfigChanged();
  }

  _updateFeature(fIdx, newFeatureConfig) {
    const features = [...(this._config.features || [])];
    features[fIdx] = newFeatureConfig;
    this._config = { ...this._config, features };
    this._fireConfigChanged();
  }

  /**
   * Operator color thresholds updates.
   */
  _dueDateColorChanged(ev, index, prop) {
    const due_date_colors = [...(this._config.due_date_colors || [])];
    due_date_colors[index] = { ...due_date_colors[index], [prop]: ev.target.value };
    this._config = { ...this._config, due_date_colors };
    this._fireConfigChanged();
  }

  _addDueDateColor() {
    const due_date_colors = [...(this._config.due_date_colors || [])];
    due_date_colors.push({ days: 0, color: "", operator: "<=" });
    this._config = { ...this._config, due_date_colors };
    this._fireConfigChanged();
  }

  _removeDueDateColor(index) {
    const due_date_colors = [...(this._config.due_date_colors || [])];
    due_date_colors.splice(index, 1);
    this._config = { ...this._config, due_date_colors };
    this._fireConfigChanged();
  }

  _iconChanged(ev) {
    this._config = { ...this._config, icon: ev.detail.value };
    this._fireConfigChanged();
  }

  _fireConfigChanged() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
  }

  _getEntities() {
    if (this._config.entities) return [...this._config.entities];
    if (this._config.entity) return [this._config.entity];
    return [];
  }

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
    if (this._config.title !== undefined) cleaned.title = this._config.title;
    addIfDiff("icon", "mdi:calendar-multiselect");
    if (this._config.max_days !== undefined) cleaned.max_days = this._config.max_days;
    if (this._config.max_items !== undefined) cleaned.max_items = this._config.max_items;
    
    addIfDiff("show_due_date", true);
    addIfDiff("show_description", false);
    addIfDiff("show_due_in_days", true);
    addIfDiff("show_source", false);
    addIfDiff("show_refresh_button", false);
    addIfDiff("show_finished_events", true);

    addIfDiff("separator_mode", "day");
    addIfDiff("date_separator_color", "transparent");
    
    if (this._config.default_due_date_color !== undefined) cleaned.default_due_date_color = this._config.default_due_date_color;
    if (this._config.day_separator_color !== undefined) cleaned.day_separator_color = this._config.day_separator_color;
    if (this._config.due_in_days_separator_color !== undefined) cleaned.due_in_days_separator_color = this._config.due_in_days_separator_color;
    if (this._config.source_color !== undefined) cleaned.source_color = this._config.source_color;
    
    if (this._config.entities && Array.isArray(this._config.entities)) {
      cleaned.entities = this._config.entities.map(ent => {
        if (typeof ent === 'object') {
          const e = { entity: ent.entity };
          if (ent.filters !== undefined) e.filters = ent.filters;
          return e;
        }
        return ent;
      });
    }
    
    if (this._config.due_date_colors && Array.isArray(this._config.due_date_colors)) {
      cleaned.due_date_colors = this._config.due_date_colors.map(rule => {
        const r = {};
        if (rule.days !== undefined) r.days = rule.days;
        if (rule.color !== undefined) r.color = rule.color;
        if (rule.operator !== undefined) r.operator = rule.operator;
        return r;
      });
    }

    if (this._config.features !== undefined) cleaned.features = this._config.features;
    
    this._config = cleaned;
    this._fireConfigChanged();
  }

  _resetConfig() {
    this._config = {
      type: this._config?.type || "custom:calendar-list-card",
      entities: []
    };
    this._fireConfigChanged();
  }

  render() {
    if (!this.hass || !this._config) return html``;
    const entities = this._getEntities();
    const due_date_colors = this._config.due_date_colors || [];

    return html`
      ${this.renderStyle('calendar-list-card-editor.css')}
      ${this.renderConfigValidationWarning()}
      
      <div class="ha-tabs">
        <div 
          class="ha-tab ${this._activeTab === 'general' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'general'; }}
        >
          ${this._localize('general') || 'General'}
        </div>
        <div 
          class="ha-tab ${this._activeTab === 'entities' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'entities'; }}
        >
          ${this._localize('entities') || 'Entities'}
        </div>
        <div 
          class="ha-tab ${this._activeTab === 'features' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'features'; }}
        >
          ${this._localize('features') || 'Features'}
        </div>
        <div 
          class="ha-tab ${this._activeTab === 'rules' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'rules'; }}
        >
          ${this._localize('rules') || 'Rules'}
        </div>
        <div 
          class="ha-tab ${this._activeTab === 'appearance' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'appearance'; }}
        >
          ${this._localize('appearance') || 'Appearance'}
        </div>
      </div>

      ${this._activeTab === 'general' ? html`
        <div class="card-config" style="margin-top: 0;">
          <div class="options">
              <ha-input
                label="${this._localize('title') || 'Title'}"
                .value="${this._config.title || ''}"
                .configValue="${'title'}"
                @input="${(e) => this._valueChanged(e)}"
              ></ha-input>
              <ha-icon-picker
                label="${this._localize('icon') || 'Icon'}"
                .value="${this._config.icon === undefined ? 'mdi:calendar-multiselect' : this._config.icon}"
                .configValue="${'icon'}"
                @value-changed="${(e) => this._iconChanged(e)}"
              ></ha-icon-picker>
              <ha-input
                label="${this._localize('max_days') || 'Max Days'}"
                type="number"
                .value="${this._config.max_days !== undefined ? this._config.max_days : ''}"
                .configValue="${'max_days'}"
                @input="${(e) => this._valueChanged(e)}"
              ></ha-input>
              <ha-input
                label="${this._localize('max_items') || 'Max Items'}"
                type="number"
                .value="${this._config.max_items !== undefined ? this._config.max_items : ''}"
                .configValue="${'max_items'}"
                @input="${(e) => this._valueChanged(e)}"
              ></ha-input>
              <div class="switches-grid">
                <ha-formfield label="${this._localize('show_refresh_button') || 'Show refresh button'}">
                  <ha-switch
                    .checked="${this._config.show_refresh_button === true}"
                    .configValue="${'show_refresh_button'}"
                    @change="${(e) => this._valueChanged(e)}"
                  ></ha-switch>
                </ha-formfield>
                <ha-formfield label="${this._localize('show_finished_events') || 'Show finished events'}">
                  <ha-switch
                    .checked="${this._config.show_finished_events !== false}"
                    .configValue="${'show_finished_events'}"
                    @change="${(e) => this._valueChanged(e)}"
                  ></ha-switch>
                </ha-formfield>
              </div>
          </div>
        </div>
      ` : ''}

      ${this._activeTab === 'entities' ? html`
        <div class="card-config" style="margin-top: 0;">
          <ha-expansion-panel header="${this._localize('entities') || 'Entities'}" outlined expanded class="panel">
            <div class="entities-list">
              ${entities.map((entityConf, index) => {
                const entityId = typeof entityConf === 'object' ? entityConf.entity : entityConf;
                let filters = [];
                if (typeof entityConf === 'object' && entityConf.filters) {
                  filters = entityConf.filters;
                }

                return html`
                <div class="entity-row-container">
                  <div class="entity-row">
                    <ha-entity-picker
                      .hass="${this.hass}"
                      .value="${entityId}"
                      .includeDomains="${['calendar']}"
                      @value-changed="${(e) => this._entityChanged(e, index)}"
                    ></ha-entity-picker>
                    <ha-icon-button
                      @click="${() => this._removeEntity(index)}"
                    ><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
                  </div>
                  <div class="filters-list">
                    ${filters.map((filter, filterIndex) => html`
                      <div class="filter-row">
                        <ha-input
                          label="${this._localize('filter_regex') || 'Filter (Regex)'}"
                          .value="${filter.pattern || ''}"
                          @input="${(e) => this._filterChanged(e, index, filterIndex, 'pattern')}"
                        ></ha-input>
                        <ha-formfield label="${this._localize('case_sensitive') || 'Case Sensitive'}">
                          <ha-switch
                            .checked="${filter.case_sensitive !== false}"
                            @change="${(e) => this._filterChanged(e, index, filterIndex, 'case_sensitive')}"
                          ></ha-switch>
                        </ha-formfield>
                        <ha-icon-button
                          @click="${() => this._removeFilter(index, filterIndex)}"
                        ><ha-icon icon="mdi:delete-outline"></ha-icon></ha-icon-button>
                      </div>
                    `)}
                    <ha-button @click="${() => this._addFilter(index)}">${this._localize('add_filter') || 'Add Filter'}</ha-button>
                  </div>
                </div>
              `})}
              <div class="add-button">
                <ha-button raised @click="${() => this._addEntity()}">
                  <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
                  ${this._localize('add_entity') || 'Add Entity'}
                </ha-button>
              </div>
            </div>
          </ha-expansion-panel>
        </div>
      ` : ''}

      ${this._activeTab === 'features' ? html`
        <div class="card-config" style="margin-top: 0;">
          <ha-expansion-panel header="${this._localize('features') || 'Features'}" outlined expanded class="panel">
            <div class="features-list-editor">
              ${(this._config.features || []).map((feature, fIdx) => html`
                <div class="feature-item">
                  <div class="feature-item-header">
                    <span>${this._getFeatureName(feature.type)}</span>
                    <ha-icon-button
                      @click=${() => this._removeFeature(fIdx)}
                    ><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
                  </div>
                  <feature-renderer-editor-card
                    .hass=${this.hass}
                    .config=${feature}
                    @config-changed=${(e) => { e.stopPropagation(); this._updateFeature(fIdx, e.detail.config); }}
                  ></feature-renderer-editor-card>
                </div>
              `)}
              
              <div class="feature-add">
                <feature-selector-card
                  .hass=${this.hass}
                  label="${this._localize('add_feature') || 'Add Feature'}"
                  @feature-selected=${(e) => this._addFeature(e)}
                ></feature-selector-card>
              </div>
            </div>
          </ha-expansion-panel>
        </div>
      ` : ''}

      ${this._activeTab === 'rules' ? html`
        <div class="card-config" style="margin-top: 0;">
          <ha-expansion-panel header="${this._localize('due_date_colors') || 'Event Date Colors'}" outlined expanded class="panel">
            <div class="due-date-colors">
            ${due_date_colors.map((rule, index) => html`
              <div class="due-date-color-row">
                <ha-select
                  label="${this._localize('operator') || 'Operator'}"
                  class="operator"
                  .value="${rule.operator || '<='}"
                  @closed="${(e) => {
                    e.stopPropagation();
                    const target = e.target;
                    if (target.value !== undefined && target.value !== rule.operator) {
                      this._dueDateColorChanged({ target }, index, 'operator');
                    }
                  }}"
                  fixedMenuPosition
                  naturalMenuWidth
                >
                  <ha-list-item value="=">=</ha-list-item>
                  <ha-list-item value="<>">&lt;&gt;</ha-list-item>
                  <ha-list-item value="<">&lt;</ha-list-item>
                  <ha-list-item value="<=">&lt;=</ha-list-item>
                  <ha-list-item value=">">&gt;</ha-list-item>
                  <ha-list-item value=">=">&gt;=</ha-list-item>
                </ha-select>
                <ha-input
                  label="${this._localize('days') || 'Days'}"
                  type="number"
                  class="days"
                  .value="${rule.days !== undefined && rule.days !== null ? rule.days : ''}"
                  @input="${(e) => this._dueDateColorChanged(e, index, 'days')}"
                ></ha-input>
                <ha-input
                  label="${this._localize('color') || 'Color'}"
                  class="color"
                  .value="${rule.color ?? ''}"
                  @input="${(e) => this._dueDateColorChanged(e, index, 'color')}"
                ></ha-input>
                <ha-icon-button
                  @click="${() => this._removeDueDateColor(index)}"
                ><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
              </div>
            `)}
            <div class="add-button">
              <ha-button raised @click="${() => this._addDueDateColor()}">
                <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
                ${this._localize('add_rule') || 'Add Rule'}
              </ha-button>
            </div>
          </div>
          </ha-expansion-panel>
        </div>
      ` : ''}

      ${this._activeTab === 'appearance' ? html`
        <div class="card-config" style="margin-top: 0;">
          <ha-expansion-panel header="${this._localize('appearance') || 'Appearance'}" outlined expanded class="panel">
            <div class="options">
              <div class="switches-grid">
                <ha-formfield label="${this._localize('show_due_date') || 'Show event date'}">
                  <ha-switch
                    .checked="${this._config.show_due_date !== false}"
                    .configValue="${'show_due_date'}"
                    @change="${(e) => this._valueChanged(e)}"
                  ></ha-switch>
                </ha-formfield>
                <ha-formfield label="${this._localize('show_description') || 'Show description'}">
                  <ha-switch
                    .checked="${this._config.show_description === true}"
                    .configValue="${'show_description'}"
                    @change="${(e) => this._valueChanged(e)}"
                  ></ha-switch>
                </ha-formfield>
                <ha-formfield label="${this._localize('show_due_in_days') || 'Show relative days'}">
                  <ha-switch
                    .checked="${this._config.show_due_in_days !== false}"
                    .configValue="${'show_due_in_days'}"
                    @change="${(e) => this._valueChanged(e)}"
                  ></ha-switch>
                </ha-formfield>
                <ha-formfield label="${this._localize('show_source') || 'Show source calendar'}">
                  <ha-switch
                    .checked="${this._config.show_source === true}"
                    .configValue="${'show_source'}"
                    @change="${(e) => this._valueChanged(e)}"
                  ></ha-switch>
                </ha-formfield>
              </div>
              <ha-input
                label="${this._localize('default_color') || 'Default Color'}"
                .value="${this._config.default_due_date_color || ''}"
                .configValue="${'default_due_date_color'}"
                @input="${(e) => this._valueChanged(e)}"
              ></ha-input>
              <ha-input
                label="${this._localize('date_separator_color') || 'Date Separator Color'}"
                .value="${this._config.date_separator_color || ''}"
                .configValue="${'date_separator_color'}"
                @input="${(e) => this._valueChanged(e)}"
              ></ha-input>
              <ha-input
                label="${this._localize('separator_color') || 'Separator Color'}"
                .value="${this._config.day_separator_color || ''}"
                .configValue="${'day_separator_color'}"
                @input="${(e) => this._valueChanged(e)}"
              ></ha-input>
              <ha-input
                label="${this._localize('due_in_days_separator_color') || 'Relative Days Separator Color'}"
                .value="${this._config.due_in_days_separator_color || ''}"
                .configValue="${'due_in_days_separator_color'}"
                @input="${(e) => this._valueChanged(e)}"
              ></ha-input>
              <ha-select
                label="${this._localize('separator_mode') || 'Separator Mode'}"
                .value="${this._config.separator_mode || 'day'}"
                .configValue="${'separator_mode'}"
                @closed="${(e) => {
                  e.stopPropagation();
                  const target = e.target;
                  if (target.value !== undefined && target.value !== this._config.separator_mode) {
                    this._valueChanged({ target: { configValue: 'separator_mode', value: target.value } });
                  }
                }}"
                fixedMenuPosition
                naturalMenuWidth
                style="width: 100%; display: block; margin-top: 8px;"
              >
                <ha-list-item value="day">${this._localize('separator_mode_day') || 'Day Boundary'}</ha-list-item>
                <ha-list-item value="week">${this._localize('separator_mode_week') || 'Week Boundary'}</ha-list-item>
                <ha-list-item value="month">${this._localize('separator_mode_month') || 'Month Boundary'}</ha-list-item>
              </ha-select>
              <ha-input
                label="${this._localize('source_color') || 'Source Color'}"
                .value="${this._config.source_color || ''}"
                .configValue="${'source_color'}"
                @input="${(e) => this._valueChanged(e)}"
              ></ha-input>
            </div>
          </ha-expansion-panel>
        </div>
      ` : ''}

      <div class="editor-actions">
        <ha-button @click=${() => this._cleanConfig()} outlined>
          <ha-icon icon="mdi:broom" slot="icon"></ha-icon>
          ${this._localize('clean') || 'Clean'}
        </ha-button>
        <ha-button @click=${() => this._resetConfig()} outlined class="warning">
          <ha-icon icon="mdi:restore" slot="icon"></ha-icon>
          ${this._localize('reset') || 'Reset'}
        </ha-button>
      </div>
    `;
  }
}

if (!customElements.get("calendar-list-card-editor")) {
  customElements.define("calendar-list-card-editor", CalendarListCardEditor);
}
