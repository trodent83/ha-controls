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

  get featureTags() {
    return ['multi-state-card'];
  }

  _getFeatureName(type) {
    if (!type) return "Unknown Feature";
    const customFeatures = window.customCardFeatures || [];
    const found = customFeatures.find(f => f.type === type);
    if (found && found.name) {
      return found.name;
    }
    let cleanType = type.startsWith("custom:") ? type.substring(7) : type;
    cleanType = cleanType.replace(/-card-feature$/, '').replace(/-/g, ' ');
    return cleanType.replace(/\b\w/g, c => c.toUpperCase());
  }

  _addFeature(entityIndex, ev) {
    const type = ev.detail.value.new_feature;
    if (!type) return;

    const featureConfig = { type };
    const isCustom = type.startsWith("custom:");
    const tag = isCustom ? type.substring(7) : `hui-${type}-card-feature`;
    const FeatureClass = customElements.get(tag);
    if (FeatureClass && FeatureClass.getStubConfig) {
        Object.assign(featureConfig, FeatureClass.getStubConfig());
    }

    const entities = [...this._config.entities];
    const features = [...(entities[entityIndex].features || []), featureConfig];
    entities[entityIndex] = { ...entities[entityIndex], features };
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
    
    ev.target.value = { ...ev.target.value, new_feature: "" };
  }

  _removeFeature(entityIndex, featureIndex) {
    const entities = [...this._config.entities];
    const features = [...(entities[entityIndex].features || [])];
    features.splice(featureIndex, 1);
    entities[entityIndex] = { ...entities[entityIndex], features };
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  _updateFeature(entityIndex, featureIndex, newFeatureConfig) {
    const entities = [...this._config.entities];
    const features = [...(entities[entityIndex].features || [])];
    features[featureIndex] = newFeatureConfig;
    entities[entityIndex] = { ...entities[entityIndex], features };
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
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
      },
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
            const allFeatures = window.customCardFeatures || [];
            const includedTags = this.featureTags;
            let availableFeatures = allFeatures;

            if (includedTags && includedTags.length > 0) {
              availableFeatures = allFeatures.filter(f => 
                  Array.isArray(f.tags) && f.tags.some(tag => includedTags.includes(tag))
              );
            }

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

                    <div class="features-section">
                      <div class="features-header">${this._localize('features')}</div>
                      <div class="features-list">
                        ${(ent.features || []).map((feature, fIdx) => html`
                          <div class="feature-item">
                            <div class="feature-item-header">
                              <span>${this._getFeatureName(feature.type)}</span>
                              <ha-icon-button
                                @click=${() => this._removeFeature(idx, fIdx)}
                              ><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
                            </div>
                            <multi-state-feature-editor-renderer
                              .hass=${this.hass}
                              .config=${feature}
                              @config-changed=${(e) => {
                                e.stopPropagation();
                                this._updateFeature(idx, fIdx, e.detail.config);
                              }}
                            ></multi-state-feature-editor-renderer>
                          </div>
                        `)}
                      </div>
                      <div class="feature-add">
                        <ha-form
                          .hass=${this.hass}
                          .data=${{ new_feature: "" }}
                          .schema=${[
                            {
                              name: "new_feature",
                              label: this._localize('add_feature'),
                              selector: {
                                select: {
                                  options: [
                                    { value: "", label: "Select a feature..." },
                                    ...availableFeatures.map(f => ({ value: f.type, label: f.name }))
                                  ],
                                  mode: "dropdown",
                                  filter: true
                                }
                              }
                            }
                          ]}
                          .computeLabel=${(s) => s.label || s.name}
                          @value-changed=${(e) => this._addFeature(idx, e)}
                        ></ha-form>
                      </div>
                    </div>
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
