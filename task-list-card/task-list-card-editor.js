import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.2';

class TaskListCardEditor extends HAControlBase {
  static get properties() {
    return { ...super.properties, _config: {} };
  }

  get translationPath() { return "/local/ha-controls/task-list-card/translations"; }
  get translationVersion() { return VERSION; }

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
    const configValue = target.configValue;
    const value = target.checked !== undefined ? target.checked : target.value;

    if (configValue) {
        this._config = { ...this._config, [configValue]: value };
        this._fireConfigChanged();
    }
  }

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

  _addFilter(index) {
    const entities = this._getEntities();
    let entityConf = typeof entities[index] === 'object' ? { ...entities[index] } : { entity: entities[index] };
    
    if (!entityConf.filters) {
      entityConf.filters = [];
      if (entityConf.filter) {
        entityConf.filters.push({ pattern: entityConf.filter, case_sensitive: entityConf.case_sensitive !== false });
        delete entityConf.filter;
        delete entityConf.case_sensitive;
      }
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
    } else if (entityConf.filter && filterIndex === 0) {
      delete entityConf.filter;
      delete entityConf.case_sensitive;
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
      if (entityConf.filter) {
        entityConf.filters.push({ pattern: entityConf.filter, case_sensitive: entityConf.case_sensitive !== false });
        delete entityConf.filter;
        delete entityConf.case_sensitive;
      }
    }
    
    entityConf.filters[filterIndex] = { ...entityConf.filters[filterIndex], [prop]: ev.target[prop === 'case_sensitive' ? 'checked' : 'value'] };
    entities[entityIndex] = entityConf;
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  _removeEntity(index) {
    const entities = this._getEntities();
    entities.splice(index, 1);
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

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

  render() {
    if (!this.hass || !this._config) return html``;
    const entities = this._getEntities();
    const due_date_colors = this._config.due_date_colors || [];

    return html`
      <link rel="stylesheet" href="/local/ha-controls/task-list-card/task-list-card-editor.css?v=${VERSION}">
      <div class="card-config">
        <div class="options">
            <ha-textfield
              label="${this._localize('title')}"
              .value="${this._config.title || ''}"
              .configValue="${'title'}"
              @input="${this._valueChanged}"
            ></ha-textfield>
            <ha-icon-picker
              label="${this._localize('icon')}"
              .value="${this._config.icon === undefined ? 'mdi:calendar-check' : this._config.icon}"
              .configValue="${'icon'}"
              @value-changed="${(e) => this._iconChanged(e)}"
            ></ha-icon-picker>
            <ha-textfield
              label="${this._localize('max_days')}"
              type="number"
              .value="${this._config.max_days !== undefined ? this._config.max_days : ''}"
              .configValue="${'max_days'}"
              @input="${this._valueChanged}"
            ></ha-textfield>
            <div class="switches-grid">
              <ha-formfield label="${this._localize('show_no_due_date')}">
                <ha-switch
                  .checked="${this._config.show_no_due_date !== false}"
                  .configValue="${'show_no_due_date'}"
                  @change="${this._valueChanged}"
                ></ha-switch>
              </ha-formfield>
              <ha-formfield label="${this._localize('show_completed')}">
                <ha-switch
                  .checked="${this._config.show_completed !== false}"
                  .configValue="${'show_completed'}"
                  @change="${this._valueChanged}"
                ></ha-switch>
              </ha-formfield>
              <ha-formfield label="${this._localize('show_refresh_button')}">
                <ha-switch
                  .checked="${this._config.show_refresh_button === true}"
                  .configValue="${'show_refresh_button'}"
                  @change="${this._valueChanged}"
                ></ha-switch>
              </ha-formfield>
              <ha-formfield label="${this._localize('show_delete_completed_button')}">
                <ha-switch
                  .checked="${this._config.show_delete_completed_button === true}"
                  .configValue="${'show_delete_completed_button'}"
                  @change="${this._valueChanged}"
                ></ha-switch>
              </ha-formfield>
              <ha-formfield label="${this._localize('block_future_toggles')}">
                <ha-switch
                  .checked="${this._config.block_future_toggles !== false}"
                  .configValue="${'block_future_toggles'}"
                  @change="${this._valueChanged}"
                ></ha-switch>
              </ha-formfield>
            </div>
        </div>

        <ha-expansion-panel header="${this._localize('entities')}" outlined expanded class="panel">
          <div class="entities-list">
            ${entities.map((entityConf, index) => {
              const entityId = typeof entityConf === 'object' ? entityConf.entity : entityConf;
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
                    .hass="${this.hass}"
                    .value="${entityId}"
                    .includeDomains="${['todo']}"
                    @value-changed="${(e) => this._entityChanged(e, index)}"
                  ></ha-entity-picker>
                  <ha-icon-button
                    @click="${() => this._removeEntity(index)}"
                  ><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
                </div>
                <div class="filters-list">
                  ${filters.map((filter, filterIndex) => html`
                    <div class="filter-row">
                      <ha-textfield
                        label="${this._localize('filter_regex')}"
                        .value="${filter.pattern || ''}"
                        @input="${(e) => this._filterChanged(e, index, filterIndex, 'pattern')}"
                      ></ha-textfield>
                      <ha-formfield label="${this._localize('case_sensitive')}">
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
                  <ha-button @click="${() => this._addFilter(index)}">${this._localize('add_filter')}</ha-button>
                </div>
              </div>
            `})}
            <div class="add-button">
              <ha-button raised @click="${this._addEntity}">
                <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
                ${this._localize('add_entity')}
              </ha-button>
            </div>
          </div>
        </ha-expansion-panel>

        <ha-expansion-panel header="${this._localize('due_date_colors')}" outlined class="panel">
          <div class="due-date-colors">
          ${due_date_colors.map((rule, index) => html`
            <div class="due-date-color-row">
              <ha-select
                label="${this._localize('operator')}"
                class="operator"
                .value="${rule.operator || '<='}"
                @selected="${(e) => this._dueDateColorChanged(e, index, 'operator')}"
                @closed="${(e) => e.stopPropagation()}"
                fixedMenuPosition
                naturalMenuWidth
              >
                <mwc-list-item value="=">=</mwc-list-item>
                <mwc-list-item value="<>">&lt;&gt;</mwc-list-item>
                <mwc-list-item value="<">&lt;</mwc-list-item>
                <mwc-list-item value="<=">&lt;=</mwc-list-item>
                <mwc-list-item value=">">&gt;</mwc-list-item>
                <mwc-list-item value=">=">&gt;=</mwc-list-item>
              </ha-select>
              <ha-textfield
                label="${this._localize('days')}"
                type="number"
                class="days"
                .value="${rule.days}"
                @input="${(e) => this._dueDateColorChanged(e, index, 'days')}"
              ></ha-textfield>
              <ha-textfield
                label="${this._localize('color')}"
                class="color"
                .value="${rule.color}"
                @input="${(e) => this._dueDateColorChanged(e, index, 'color')}"
              ></ha-textfield>
              <ha-icon-button
                @click="${() => this._removeDueDateColor(index)}"
              ><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
            </div>
          `)}
          <div class="add-button">
            <ha-button raised @click="${this._addDueDateColor}">
              <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
              ${this._localize('add_rule')}
            </ha-button>
          </div>
        </div>
        </ha-expansion-panel>

        <ha-expansion-panel header="${this._localize('appearance')}" outlined class="panel">
          <div class="options">
            <div class="switches-grid">
              <ha-formfield label="${this._localize('show_due_date')}">
                <ha-switch
                  .checked="${this._config.show_due_date !== false}"
                  .configValue="${'show_due_date'}"
                  @change="${this._valueChanged}"
                ></ha-switch>
              </ha-formfield>
              <ha-formfield label="${this._localize('show_description')}">
                <ha-switch
                  .checked="${this._config.show_description === true}"
                  .configValue="${'show_description'}"
                  @change="${this._valueChanged}"
                ></ha-switch>
              </ha-formfield>
              <ha-formfield label="${this._localize('show_due_in_days')}">
                <ha-switch
                  .checked="${this._config.show_due_in_days === true}"
                  .configValue="${'show_due_in_days'}"
                  @change="${this._valueChanged}"
                ></ha-switch>
              </ha-formfield>
              <ha-formfield label="${this._localize('merge_tasks_same_day')}">
                <ha-switch
                  .checked="${this._config.merge_tasks_same_day === true}"
                  .configValue="${'merge_tasks_same_day'}"
                  @change="${this._valueChanged}"
                ></ha-switch>
              </ha-formfield>
              <ha-formfield label="${this._localize('show_source')}">
                <ha-switch
                  .checked="${this._config.show_source === true}"
                  .configValue="${'show_source'}"
                  @change="${this._valueChanged}"
                ></ha-switch>
              </ha-formfield>
            </div>
            <ha-select
              label="${this._localize('separator_mode')}"
              .value="${this._config.separator_mode || 'day'}"
              .configValue="${'separator_mode'}"
              @selected="${this._valueChanged}"
              @closed="${(e) => e.stopPropagation()}"
              fixedMenuPosition
              naturalMenuWidth
            >
              <mwc-list-item value="day">${this._localize('day')}</mwc-list-item>
              <mwc-list-item value="week">${this._localize('week')}</mwc-list-item>
              <mwc-list-item value="month">${this._localize('month')}</mwc-list-item>
            </ha-select>
            <ha-textfield
              label="${this._localize('default_color')}"
              .value="${this._config.default_due_date_color || ''}"
              .configValue="${'default_due_date_color'}"
              @input="${this._valueChanged}"
            ></ha-textfield>
            <ha-textfield
              label="${this._localize('date_separator_color')}"
              .value="${this._config.date_separator_color || ''}"
              .configValue="${'date_separator_color'}"
              @input="${this._valueChanged}"
            ></ha-textfield>
            <ha-textfield
              label="${this._localize('separator_color')}"
              .value="${this._config.day_separator_color || ''}"
              .configValue="${'day_separator_color'}"
              @input="${this._valueChanged}"
            ></ha-textfield>
            <ha-textfield
              label="${this._localize('due_in_days_separator_color')}"
              .value="${this._config.due_in_days_separator_color || ''}"
              .configValue="${'due_in_days_separator_color'}"
              @input="${this._valueChanged}"
            ></ha-textfield>
            <ha-textfield
              label="${this._localize('merged_tasks_separator_color')}"
              .value="${this._config.merged_tasks_separator_color || ''}"
              .configValue="${'merged_tasks_separator_color'}"
              @input="${this._valueChanged}"
            ></ha-textfield>
            <ha-textfield
              label="${this._localize('source_color')}"
              .value="${this._config.source_color || ''}"
              .configValue="${'source_color'}"
              @input="${this._valueChanged}"
            ></ha-textfield>
          </div>
        </ha-expansion-panel>
      </div>
    `;
  }
}

customElements.define("task-list-card-editor", TaskListCardEditor);