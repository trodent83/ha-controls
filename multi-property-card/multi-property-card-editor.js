const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

class MultiPropertyCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, _config: {} };
  }

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
    thresholds[threshIdx] = { ...thresholds[threshIdx], [key]: value };
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

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const target = ev.target.configValue;
    const value = ev.detail?.value !== undefined ? ev.detail.value : ev.target.checked;
    this._config = { ...this._config, [target]: value };
    this._fireConfigChanged();
  }

  _entityChanged(ev, index) {
    const entities = [...this._config.entities];
    const newValue = ev.detail.value.entity;
    entities[index] = { ...entities[index], entity: newValue };
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  _addEntity() {
    const entities = [...(this._config.entities || []), { entity: "", name: "", thresholds: [] }];
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

  render() {
    if (!this.hass || !this._config) return html``;

    return html`
      <link rel="stylesheet" href="/local/ha-controls/multi-property-card/multi-property-card-editor.css?v=0.1.9">
      <div class="card-config">
            
        <div class="global-settings">
          <div class="switch-item">
            <span>Show Labels</span>
            <ha-switch .checked=${this._config.show_label !== false} .configValue=${"show_label"} @change=${this._valueChanged}></ha-switch>
          </div>
          <div class="switch-item">
            <span>Show Values</span>
            <ha-switch .checked=${this._config.show_value !== false} .configValue=${"show_value"} @change=${this._valueChanged}></ha-switch>
          </div>
          <div class="switch-item">
            <span>Show Unavailable</span>
            <ha-switch .checked=${this._config.show_unavailable === true} .configValue=${"show_unavailable"} @change=${this._valueChanged}></ha-switch>
          </div>
        </div>

        <div class="divider"></div>

        <div class="entities-container">
          ${(this._config.entities || []).map((ent, idx) => {
            const entityId = typeof ent === 'string' ? ent : ent.entity;
            const stateObj = this.hass.states[entityId];

            const hassFriendlyName = stateObj ? stateObj.attributes.friendly_name : "";
            const entityLabel = ent.name || hassFriendlyName || entityId || `Entity ${idx + 1}`;

            const localSchema = [{ name: "entity", selector: { entity: {} } }];
            const localData = { entity: entityId };

            const actionSchema = [
              { name: "tap_action", label: "Tap Action", selector: { "ui-action": {} } },
              { name: "hold_action", label: "Hold Action", selector: { "ui-action": {} } }
            ];
            const actionData = { 
              tap_action: ent.tap_action || { action: "none" }, 
              hold_action: ent.hold_action || { action: "none" } 
            };

            return html`
              <ha-expansion-panel>
                  <div slot="header" class="panel-header">
                    <div class="panel-title">${entityLabel}</div>
                    <ha-icon-button
                      class="delete-button"
                      @click=${(e) => { e.stopPropagation(); this._removeEntity(idx); }}
                    ><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
                  </div>

                  <div class="panel-content">
                    <ha-form
                      .hass=${this.hass}
                      .data=${localData}
                      .schema=${localSchema}
                      .computeLabel=${(schema) => schema.name === "entity" ? "" : schema.name}
                      @value-changed=${(e) => this._entityChanged(e, idx)}
                    ></ha-form>

                    <ha-textfield
                      label="Friendly Name Override"
                      .value=${ent.name || ""}
                      @input=${(e) => {
                        const ents = [...this._config.entities];
                        ents[idx] = { ...ents[idx], name: e.target.value };
                        this._config = { ...this._config, entities: ents };
                        this._fireConfigChanged();
                      }}
                    >
                      ${ent.name ? html`
                        <ha-icon-button slot="suffix" @click=${(e) => {
                            e.stopPropagation();
                            const ents = [...this._config.entities];
                            ents[idx] = { ...ents[idx], name: "" };
                            this._config = { ...this._config, entities: ents };
                            this._fireConfigChanged();
                        }}><ha-icon icon="mdi:close"></ha-icon></ha-icon-button>
                      ` : ""}
                    </ha-textfield>

                    <ha-icon-picker
                      .hass=${this.hass}
                      label="Icon Override"
                      .value=${ent.icon}
                      @value-changed=${(e) => {
                        const ents = [...this._config.entities];
                        ents[idx] = { ...ents[idx], icon: e.detail.value };
                        this._config = { ...this._config, entities: ents };
                        this._fireConfigChanged();
                      }}
                    ></ha-icon-picker>

                    <ha-textfield
                      label="Color Override"
                      .value=${ent.color || ""}
                      @input=${(e) => {
                        const ents = [...this._config.entities];
                        ents[idx] = { ...ents[idx], color: e.target.value };
                        this._config = { ...this._config, entities: ents };
                        this._fireConfigChanged();
                      }}
                    >
                      ${ent.color ? html`
                        <ha-icon-button slot="suffix" @click=${(e) => {
                            e.stopPropagation();
                            const ents = [...this._config.entities];
                            ents[idx] = { ...ents[idx], color: "" };
                            this._config = { ...this._config, entities: ents };
                            this._fireConfigChanged();
                        }}><ha-icon icon="mdi:close"></ha-icon></ha-icon-button>
                      ` : ""}
                    </ha-textfield>

                    <ha-select
                      label="Default Animation"
                      .value=${ent.animation || ""}
                      @closed=${(e) => {
                        e.stopPropagation();
                        const target = e.target;
                        if (target.value !== undefined && target.value !== ent.animation) {
                          const ents = [...this._config.entities];
                          ents[idx] = { ...ents[idx], animation: target.value };
                          this._config = { ...this._config, entities: ents };
                          this._fireConfigChanged();
                        }
                      }}
                      fixedMenuPosition
                      naturalMenuWidth
                    >
                      <mwc-list-item value="">None</mwc-list-item>
                      <mwc-list-item value="blink">Blink</mwc-list-item>
                      <mwc-list-item value="bounce">Bounce</mwc-list-item>
                      <mwc-list-item value="rotating">Rotating</mwc-list-item>
                      <mwc-list-item value="pulse">Pulse</mwc-list-item>
                      <mwc-list-item value="shake">Shake</mwc-list-item>
                      <mwc-list-item value="float">Float</mwc-list-item>
                      <mwc-list-item value="spin-slow">Spin Slow</mwc-list-item>
                    </ha-select>

                    <div class="actions-container">
                      <ha-form
                        .hass=${this.hass}
                        .data=${actionData}
                        .schema=${actionSchema}
                        .computeLabel=${(schema) => schema.label}
                        @value-changed=${(e) => {
                          const ents = [...this._config.entities];
                          ents[idx] = { ...ents[idx], ...e.detail.value };
                          this._config = { ...this._config, entities: ents };
                          this._fireConfigChanged();
                        }}
                      ></ha-form>
                    </div>

                    <div class="thresholds-section">
                      <ha-expansion-panel 
                        outlined 
                        header="Thresholds / State Rules"
                        .secondary=${`Rules defined: ${(ent.thresholds || []).length}`}
                      >
                        ${(ent.thresholds || []).map((thresh, tIdx) => html`
                          <div class="threshold-block">
                            <div class="threshold-sub-header">
                              <span>Rule #${tIdx + 1} ${thresh.value ? `(${thresh.value})` : ""}</span>
                              <ha-icon-button
                                class="remove-btn-compact"
                                @click=${() => this._removeThreshold(idx, tIdx)}
                              ><ha-icon icon="mdi:close"></ha-icon></ha-icon-button>
                            </div>

                            <div class="threshold-row row-1">
                              <ha-textfield
                                class="flex-grow"
                                label="Value"
                                .value=${thresh.value || ""}
                                @input=${(e) => this._updateThreshold(idx, tIdx, 'value', e.target.value)}
                              ></ha-textfield>
                              <ha-textfield
                                class="flex-grow"
                                label="Color"
                                .value=${thresh.color || ""}
                                @input=${(e) => this._updateThreshold(idx, tIdx, 'color', e.target.value)}
                              ></ha-textfield>
                            </div>

                            <!-- Row 2: Animation (Full Width) -->
                            <div class="threshold-row row-2">
                              <ha-select
                                label="Animation"
                                .value=${thresh.animation || ""}
                                .idx=${idx}
                                .tIdx=${tIdx}
                                @closed=${(e) => {
                                  // stopPropagation verhindert, dass das Event den Editor schließt
                                  e.stopPropagation();
                                  const target = e.target;
                                  if (target.value !== undefined && target.value !== thresh.animation) {
                                    this._updateThreshold(idx, tIdx, 'animation', target.value);
                                  }
                                }}
                                fixedMenuPosition
                                naturalMenuWidth
                              >
                                <mwc-list-item value="">None</mwc-list-item>
                                <mwc-list-item value="blink">Blink</mwc-list-item>
                                <mwc-list-item value="bounce">Bounce</mwc-list-item>
                                <mwc-list-item value="rotating">Rotating</mwc-list-item>
                                <mwc-list-item value="pulse">Pulse</mwc-list-item>
                                <mwc-list-item value="shake">Shake</mwc-list-item>
                                <mwc-list-item value="float">Float</mwc-list-item>
                                <mwc-list-item value="spin-slow">Spin Slow</mwc-list-item>
                              </ha-select>
                            </div>
                          </div>
                        `)}

                        <ha-button @click=${() => this._addThreshold(idx)}>
                          <ha-icon icon="mdi:plus" slot="icon"></ha-icon> Add Rule
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
            Add Entity
          </ha-button>
        </div>
      </div>
    `;
  }
}

customElements.define("multi-property-card-editor", MultiPropertyCardEditor);
