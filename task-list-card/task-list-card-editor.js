const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

class TaskListCardEditor extends LitElement {
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
    const configValue = target.configValue;
    const value = target.checked !== undefined ? target.checked : target.value;

    if (configValue) {
        this._config = { ...this._config, [configValue]: value };
        this._fireConfigChanged();
    }
  }

  _entityChanged(ev, index) {
    const entities = this._getEntities();
    entities[index] = ev.detail.value;
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
      <link rel="stylesheet" href="/local/ha-controls/task-list-card/task-list-card-editor.css?v=0.0.26">
      <div class="card-config">
        <div class="options">
          <ha-textfield
            label="Max Days"
            type="number"
            .value="${this._config.max_days !== undefined ? this._config.max_days : ''}"
            .configValue="${'max_days'}"
            @input="${this._valueChanged}"
          ></ha-textfield>
          <ha-textfield
            label="Date Separator Color"
            .value="${this._config.date_separator_color || ''}"
            .configValue="${'date_separator_color'}"
            @input="${this._valueChanged}"
          ></ha-textfield>
          <ha-select
            label="Separator Mode"
            .value="${this._config.separator_mode || 'day'}"
            .configValue="${'separator_mode'}"
            @selected="${this._valueChanged}"
            @closed="${(e) => e.stopPropagation()}"
            fixedMenuPosition
            naturalMenuWidth
          >
            <mwc-list-item value="day">Day</mwc-list-item>
            <mwc-list-item value="week">Week</mwc-list-item>
            <mwc-list-item value="month">Month</mwc-list-item>
          </ha-select>
          <ha-textfield
            label="Separator Color"
            .value="${this._config.day_separator_color || ''}"
            .configValue="${'day_separator_color'}"
            @input="${this._valueChanged}"
          ></ha-textfield>
        </div>
        <div class="options switches-grid">
          <ha-formfield label="Show no due date">
            <ha-switch
              .checked="${this._config.show_no_due_date !== false}"
              .configValue="${'show_no_due_date'}"
              @change="${this._valueChanged}"
            ></ha-switch>
          </ha-formfield>
          <ha-formfield label="Show completed">
            <ha-switch
              .checked="${this._config.show_completed !== false}"
              .configValue="${'show_completed'}"
              @change="${this._valueChanged}"
            ></ha-switch>
          </ha-formfield>
          <ha-formfield label="Show due date">
            <ha-switch
              .checked="${this._config.show_due_date !== false}"
              .configValue="${'show_due_date'}"
              @change="${this._valueChanged}"
            ></ha-switch>
          </ha-formfield>
          <ha-formfield label="Show description">
            <ha-switch
              .checked="${this._config.show_description === true}"
              .configValue="${'show_description'}"
              @change="${this._valueChanged}"
            ></ha-switch>
          </ha-formfield>
        </div>

        <div class="options">
            <ha-textfield
                label="Default Color"
                .value="${this._config.default_due_date_color || ''}"
                .configValue="${'default_due_date_color'}"
                @input="${this._valueChanged}"
            ></ha-textfield>
        </div>

        <div class="due-date-colors">
          <h3>Due Date Colors</h3>
          ${due_date_colors.map((rule, index) => html`
            <div class="due-date-color-row">
              <ha-select
                label="Operator"
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
                label="Days"
                type="number"
                class="days"
                .value="${rule.days}"
                @input="${(e) => this._dueDateColorChanged(e, index, 'days')}"
              ></ha-textfield>
              <ha-textfield
                label="Color"
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
              Add Rule
            </ha-button>
          </div>
        </div>

        <div class="entities-list">
          <h3>Todo Entities</h3>
          ${entities.map((entity, index) => html`
            <div class="entity-row">
              <ha-entity-picker
                .hass="${this.hass}"
                .value="${entity}"
                .includeDomains="${['todo']}"
                @value-changed="${(e) => this._entityChanged(e, index)}"
              ></ha-entity-picker>
              <ha-icon-button
                @click="${() => this._removeEntity(index)}"
              ><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
            </div>
          `)}
          <div class="add-button">
            <ha-button raised @click="${this._addEntity}">
              <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
              Add Entity
            </ha-button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("task-list-card-editor", TaskListCardEditor);