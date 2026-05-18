import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.12';

class MultiPropertyCardEditor extends HAControlBase {
  static get properties() {
    return { ...super.properties, _config: {} };
  }

  get translationPath() { return "/local/ha-controls/multi-state-card/translations"; }
  get translationVersion() { return VERSION; }

  setConfig(config) {
    this._config = config;
  }

  _globalValueChanged(ev) {
    if (!this._config || !this.hass) return;
    this._config = { ...this._config, ...ev.detail.value };
    this._fireConfigChanged();
  }

  _addEntity() {
    const entities = [...(this._config.entities || []), {}];
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
    return [
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
      <link rel="stylesheet" href="/local/ha-controls/multi-state-card/multi-state-card-editor.css?v=${VERSION}">
      <ha-card .header=${this._localize('global_settings')}>
        <div class="card-content">
          <ha-form
            .hass=${this.hass}
            .data=${this._config}
            .schema=${this._globalSchema()}
            .computeLabel=${(schema) => schema.label || schema.name}
            @value-changed=${this._globalValueChanged}
          ></ha-form>
        </div>
      </ha-card>

      <div class="card-config">
        <div class="entities-container">
          ${(this._config.entities || []).map((ent, idx) => {
            const entityLabel = ent.name || `Item ${idx + 1}`;

            const combinedData = {
              icon: ent.icon || "",
              show_icon: ent.show_icon !== false,
              color: ent.color || "",
              animation: ent.animation || "",
              tap_action: ent.tap_action || { action: "none" },
              hold_action: ent.hold_action || { action: "none" }
            };

            const combinedSchema = [
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

                    <h4>${this._localize('features')}</h4>
                    <ha-yaml-editor
                      .hass=${this.hass}
                      .defaultValue=${ent.features || []}
                      @value-changed=${(e) => {
                        e.stopPropagation();
                        const newFeatures = e.detail.value;
                        const ents = [...this._config.entities];
                        ents[idx] = { ...ents[idx], features: newFeatures };
                        this._config = { ...this._config, entities: ents };
                        this._fireConfigChanged();
                      }}
                    ></ha-yaml-editor>
                  </div>
              </ha-expansion-panel>
              ${idx < (this._config.entities || []).length - 1
                ? html`<div class="entity-separator"></div>`
                : ''}
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

customElements.define("multi-state-card-editor", MultiPropertyCardEditor);
