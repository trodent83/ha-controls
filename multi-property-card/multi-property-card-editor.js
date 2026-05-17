import { HAControlBase, html } from "../ha-control-base.js?v=0.5.1";

const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.12';

class MultiPropertyCardEditor extends HAControlBase {
  static get properties() {
    return { ...super.properties, _config: {} };
  }

  get translationPath() { return "/local/ha-controls/multi-property-card/translations"; }
  get translationVersion() { return VERSION; }

  setConfig(config) {
    this._config = config;
  }

  _addThreshold(entityIdx) {
    const entities = [...this._config.entities];
    const thresholds = [...(entities[entityIdx].thresholds || [])];
    thresholds.push({ value: "", color: "", animation: "" });
    entities[entityIdx] = { ...entities[entityIdx], thresholds };
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  _updateThreshold(entityIdx, threshIdx, key, value) {
    const entities = [...this._config.entities];
    const thresholds = [...entities[entityIdx].thresholds];
    if (key === null) {
      thresholds[threshIdx] = { ...thresholds[threshIdx], ...value };
    } else {
      thresholds[threshIdx] = { ...thresholds[threshIdx], [key]: value };
    }
    entities[entityIdx] = { ...entities[entityIdx], thresholds };
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  _removeThreshold(entityIdx, threshIdx) {
    const entities = [...this._config.entities];
    const thresholds = [...entities[entityIdx].thresholds];
    thresholds.splice(threshIdx, 1);
    entities[entityIdx] = { ...entities[entityIdx], thresholds };
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  _globalValueChanged(ev) {
    if (!this._config || !this.hass) return;
    this._config = { ...this._config, ...ev.detail.value };
    this._fireConfigChanged();
  }

  _addEntity() {
    const entities = [...(this._config.entities || []), { entity: "", name: "", thresholds: [] }];
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  _moveEntity(index, direction) {
    const entities = [...(this._config.entities || [])];
    if (index + direction < 0 || index + direction >= entities.length) return;
    
    const temp = entities[index];
    entities[index] = entities[index + direction];
    entities[index + direction] = temp;
    
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  _removeEntity(index) {
    const entities = [...this._config.entities];
    entities.splice(index, 1);
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  _fireConfigChanged() {
    this.dispatchEvent(new CustomEvent("config-changed", { 
      detail: { config: this._config },
      bubbles: true,
      composed: true 
    }));
  }

  _globalSchema() {
    const show_unavailable = this._localize('show_unavailable');
    return [
      {
        name: "",
        type: "grid",
        schema: [
          { name: "show_label", label: this._localize('show_labels'), selector: { boolean: {} } },
          { name: "show_value", label: this._localize('show_values'), selector: { boolean: {} } },
          { name: "show_unavailable", label: show_unavailable, selector: { boolean: {} } }
        ]
      },
      { 
        name: "layout", 
        label: this._localize('layout'), 
        selector: { 
          select: { 
            options: [
              { value: "row", label: this._localize('horizontal') },
              { value: "column", label: this._localize('vertical') }
            ] 
          } 
        } 
      }
    ];
  }

  render() {
    if (!this.hass || !this._config) return html``;

    return html`
      <link rel="stylesheet" href="/local/ha-controls/multi-property-card/multi-property-card-editor.css?v=${VERSION}">
      <div class="card-config">
            
        <div class="global-settings">
          <ha-form
            .hass=${this.hass}
            .data=${{
              show_label: this._config.show_label !== false,
              show_value: this._config.show_value !== false,
              show_unavailable: this._config.show_unavailable === true,
              layout: this._config.layout || "row"
            }}
            .schema=${this._globalSchema()}
            .computeLabel=${(schema) => schema.label || schema.name}
            @value-changed=${this._globalValueChanged}
          ></ha-form>
        </div>

        <div class="divider"></div>

        <div class="entities-container">
          ${(this._config.entities || []).map((ent, idx) => {
            const entityId = typeof ent === 'string' ? ent : ent.entity;
            const stateObj = entityId && this.hass ? this.hass.states[entityId] : null;

            const hassFriendlyName = stateObj?.attributes?.friendly_name || entityId;
            const entityLabel = ent.name || hassFriendlyName || this._localize('entity_num', { num: idx + 1 }) || `Entity ${idx + 1}`;

            const combinedData = {
              entity: entityId,
              name: ent.name || "",
              value: ent.value || "",
              icon: ent.icon || "",
              show_icon: ent.show_icon !== false,
              color: ent.color || "",
              label_font_size: ent.label_font_size ? String(ent.label_font_size).replace("px", "") : "",
              label_bold: ent.label_bold === true,
              animation: ent.animation || "",
              condition: ent.condition || "",
              tap_action: ent.tap_action || { action: "none" },
              hold_action: ent.hold_action || { action: "none" }
            };

            const combinedSchema = [
              { name: "entity", label: this._localize('entity'), selector: { entity: {} } },
              { name: "name", label: this._localize('friendly_name_override'), selector: { text: {} } },
              { name: "value", label: this._localize('static_value'), selector: { text: {} } },
              {
                name: "",
                type: "grid",
                schema: [
                  { name: "icon", label: this._localize('icon_override'), selector: { icon: {} } },
                  { name: "show_icon", label: this._localize('show_icon'), selector: { boolean: {} } }
                ]
              },
              { name: "color", label: this._localize('color_override'), selector: { text: {} } },
              {
                name: "",
                type: "grid",
                schema: [
                  { name: "label_font_size", label: this._localize('label_size'), selector: { text: {} } },
                  { name: "label_bold", label: this._localize('bold'), selector: { boolean: {} } }
                ]
              },
              { 
                name: "animation", 
                label: this._localize('default_animation'), 
                selector: { 
                  select: { 
                    options: [
                      { value: "", label: this._localize('none') },
                      { value: "blink", label: this._localize('blink') },
                      { value: "bounce", label: this._localize('bounce') },
                      { value: "rotating", label: this._localize('rotating') },
                      { value: "pulse", label: this._localize('pulse') },
                      { value: "shake", label: this._localize('shake') },
                      { value: "float", label: this._localize('float') },
                      { value: "spin-slow", label: this._localize('spin_slow') }
                    ]
                  } 
                } 
              },
              { 
                name: "condition", 
                label: this._localize('complex_visibility_condition'), 
                selector: { text: { multiline: true } },
                helper: this._localize('complex_visibility_condition_placeholder')
              },
              { name: "tap_action", label: this._localize('tap_action'), selector: { "ui-action": {} } },
              { name: "hold_action", label: this._localize('hold_action'), selector: { "ui-action": {} } }
            ];

            return html`
              <ha-expansion-panel>
                  <div slot="header" class="panel-header">
                    <div class="panel-title">${entityLabel}</div>
                    <div class="header-actions">
                      <ha-icon-button
                        @click=${(e) => { e.stopPropagation(); this._moveEntity(idx, -1); }}
                        .disabled=${idx === 0}
                      ><ha-icon icon="mdi:arrow-up"></ha-icon></ha-icon-button>
                      <ha-icon-button
                        @click=${(e) => { e.stopPropagation(); this._moveEntity(idx, 1); }}
                        .disabled=${idx === (this._config.entities || []).length - 1}
                      ><ha-icon icon="mdi:arrow-down"></ha-icon></ha-icon-button>
                      <ha-icon-button
                        class="delete-button"
                        @click=${(e) => { e.stopPropagation(); this._removeEntity(idx); }}
                      ><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
                    </div>
                  </div>

                  <div class="panel-content">
                    <ha-form
                      .hass=${this.hass}
                      .data=${combinedData}
                      .schema=${combinedSchema}
                      .computeLabel=${(schema) => schema.label || schema.name}
                      @value-changed=${(e) => {
                        const ents = [...this._config.entities];
                        const newValue = { ...e.detail.value };
                        
                        for (const key in newValue) {
                          if (newValue[key] === "") {
                            delete newValue[key];
                            delete ents[idx][key];
                          }
                        }

                        ents[idx] = { ...ents[idx], ...newValue };
                        this._config = { ...this._config, entities: ents };
                        this._fireConfigChanged();
                      }}
                    ></ha-form>

                    <div class="thresholds-section">
                      <ha-expansion-panel 
                        outlined 
                        header="${this._localize('thresholds_state_rules')}"
                        .secondary=${this._localize('rules_defined', { count: (ent.thresholds || []).length })}
                      >
                        ${(ent.thresholds || []).map((thresh, tIdx) => html`
                          <div class="threshold-block" style="padding: 16px; border: 1px solid var(--divider-color); border-radius: 8px; margin-bottom: 16px;">
                            <div class="threshold-sub-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                              <span style="font-weight: 500;">${this._localize('rule_number', { num: tIdx + 1 })} ${thresh.value ? `(${thresh.value})` : ""}</span>
                              <ha-icon-button
                                class="remove-btn-compact"
                                @click=${() => this._removeThreshold(idx, tIdx)}
                              ><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
                            </div>

                            <ha-form
                              .hass=${this.hass}
                              .data=${thresh}
                              .schema=${[
                                {
                                  name: "",
                                  type: "grid",
                                  schema: [
                                    { name: "value", label: this._localize('value'), selector: { text: {} } },
                                    { name: "color", label: this._localize('color'), selector: { text: {} } }
                                  ]
                                },
                                { 
                                  name: "animation", 
                                  label: this._localize('animation'), 
                                  selector: { 
                                    select: { 
                                      options: [
                                        { value: "", label: this._localize('none') },
                                        { value: "blink", label: this._localize('blink') },
                                        { value: "bounce", label: this._localize('bounce') },
                                        { value: "rotating", label: this._localize('rotating') },
                                        { value: "pulse", label: this._localize('pulse') },
                                        { value: "shake", label: this._localize('shake') },
                                        { value: "float", label: this._localize('float') },
                                        { value: "spin-slow", label: this._localize('spin_slow') }
                                      ]
                                    } 
                                  } 
                                }
                              ]}
                              .computeLabel=${(schema) => schema.label || schema.name}
                              @value-changed=${(e) => this._updateThreshold(idx, tIdx, null, e.detail.value)}
                            ></ha-form>
                          </div>
                        `)}

                        <ha-button @click=${() => this._addThreshold(idx)}>
                          <ha-icon icon="mdi:plus" slot="icon"></ha-icon> ${this._localize('add_rule')}
                        </ha-button>
                      </ha-expansion-panel>
                    </div>
                  </div>
            </ha-expansion-panel>
            `;
          })}
        </div>

        <div class="add-button-container">
          <ha-button raised @click=${this._addEntity}>
            <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
            ${this._localize('add_entity')}
          </ha-button>
        </div>
      </div>
    `;
  }
}

customElements.define("multi-property-card-editor", MultiPropertyCardEditor);
