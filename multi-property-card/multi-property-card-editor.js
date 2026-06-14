import { HAControlThresholdBase, html } from "../ha-control-base.js?v=0.5.3";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.25';

/**
 * MultiPropertyCardEditor
 * Visual configuration editor UI for MultiPropertyCard.
 * Manages grid layout options, entity attributes, conditional evaluation rules, state thresholds, and dynamic features.
 * 
 * @extends HAControlThresholdBase
 */
class MultiPropertyCardEditor extends HAControlThresholdBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Tracks local config instance copy.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return { ...super.properties, _config: {} };
  }

  /**
   * Resolves the directory path hosting the translation localizations.
   * 
   * @type {string}
   */
  get translationPath() { return "/local/ha-controls/multi-property-card/translations"; }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() { return VERSION; }

  /**
   * Receives configuration details from Lovelace dashboard interface.
   * 
   * @param {Object} config - Config parameters
   */
  setConfig(config) {
    this._config = config;
  }

  /**
   * Appends a default blank threshold configuration object to an entity threshold rules list.
   * 
   * @param {number} entityIdx - Index of target entity item
   * @private
   */
  _addThreshold(entityIdx) {
    const entities = [...this._config.entities];
    const thresholds = [...(entities[entityIdx].thresholds || [])];
    thresholds.push({ value: "", color: "", animation: "" });
    entities[entityIdx] = { ...entities[entityIdx], thresholds };
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  /**
   * Modifies fields inside an individual threshold rule block.
   * 
   * @param {number} entityIdx - Index of target entity item
   * @param {number} threshIdx - Index sequence of threshold rule
   * @param {string|null} key - Threshold attribute name, or null if updating multiple properties
   * @param {any} value - Assigned replacement value
   * @private
   */
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

  /**
   * Deletes a threshold rule block from an entity.
   * 
   * @param {number} entityIdx - Index of target entity item
   * @param {number} threshIdx - Index sequence of threshold rule to remove
   * @private
   */
  _removeThreshold(entityIdx, threshIdx) {
    const entities = [...this._config.entities];
    const thresholds = [...entities[entityIdx].thresholds];
    thresholds.splice(threshIdx, 1);
    entities[entityIdx] = { ...entities[entityIdx], thresholds };
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  /**
   * Invoked when top-level card configuration parameters are changed.
   * 
   * @param {CustomEvent} ev - Form value-changed event details
   * @private
   */
  _globalValueChanged(ev) {
    if (!this._config || !this.hass) return;
    this._config = { ...this._config, ...ev.detail.value };
    this._fireConfigChanged();
  }

  /**
   * Appends a default blank entity configuration block to the entities list.
   * 
   * @private
   */
  _addEntity() {
    const entities = [...(this._config.entities || []), { entity: "", name: "", thresholds: [], features: [] }];
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  /**
   * Modifies display index sequence of entities inside card configurations.
   * 
   * @param {number} index - Index sequence of entity item to slide
   * @param {number} direction - Offset direction delta (-1 for up, 1 for down)
   * @private
   */
  _moveEntity(index, direction) {
    const entities = [...(this._config.entities || [])];
    if (index + direction < 0 || index + direction >= entities.length) return;
    
    const temp = entities[index];
    entities[index] = entities[index + direction];
    entities[index + direction] = temp;
    
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  /**
   * Deletes an entity configuration from the array list.
   * 
   * @param {number} index - Index sequence of item to delete
   * @private
   */
  _removeEntity(index) {
    const entities = [...this._config.entities];
    entities.splice(index, 1);
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  /**
   * Dispatches the updated configuration dictionary back to dashboard engine.
   * 
   * @private
   */
  _fireConfigChanged() {
    this.dispatchEvent(new CustomEvent("config-changed", { 
      detail: { config: this._config },
      bubbles: true,
      composed: true 
    }));
  }

  /**
   * Returns feature compatibility tags.
   * 
   * @type {Array<string>}
   */
  get featureTags() {
    return ['multi-property-card'];
  }

  /**
   * Formats and returns a human-readable display name for custom Lovelace card features.
   * 
   * @param {string} type - Feature identifier tag name
   * @private
   * @returns {string} Human-readable feature name
   */
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

  /**
   * Appends a new layout feature block to an entity config, applying stub configs if present.
   * 
   * @param {number} entityIndex - Index of target entity
   * @param {CustomEvent} ev - Selection details containing feature type selector
   * @private
   */
  _addFeature(entityIndex, ev) {
    const type = ev.detail.type;
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
  }

  /**
   * Removes a feature configuration from an entity's list.
   * 
   * @param {number} entityIndex - Index of target entity
   * @param {number} featureIndex - Feature index to remove
   * @private
   */
  _removeFeature(entityIndex, featureIndex) {
    const entities = [...this._config.entities];
    const features = [...(entities[entityIndex].features || [])];
    features.splice(featureIndex, 1);
    entities[entityIndex] = { ...entities[entityIndex], features };
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  /**
   * Updates feature configurations by index.
   * 
   * @param {number} entityIndex - Index of target entity
   * @param {number} featureIndex - Feature index to replace
   * @param {Object} newFeatureConfig - Replacement feature layout schema
   * @private
   */
  _updateFeature(entityIndex, featureIndex, newFeatureConfig) {
    const entities = [...this._config.entities];
    const features = [...(entities[entityIndex].features || [])];
    features[featureIndex] = newFeatureConfig;
    entities[entityIndex] = { ...entities[entityIndex], features };
    this._config = { ...this._config, entities };
    this._fireConfigChanged();
  }

  /**
   * Generates the schema definition for general card configurations.
   * 
   * @private
   * @returns {Array<Object>} Form field schemas
   */
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

  /**
   * Renders the editor configuration page layout.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this._config) return html``;

    return html`
      ${this.renderStyle('multi-property-card-editor.css')}
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

                    <!-- Thresholds Section -->
                    <div class="thresholds-section" style="margin-top: 16px;">
                      <ha-expansion-panel 
                        outlined 
                        header="${this._localize('thresholds_state_rules')}"
                        .secondary=${this._localize('rules_defined', { count: (ent.thresholds || []).length })}
                      >
                        ${(ent.thresholds || []).map((thresh, tIdx) => html`
                          <div class="threshold-block">
                            <div class="threshold-sub-header">
                              <span>${this._localize('rule_number', { num: tIdx + 1 })} ${thresh.value ? `(${thresh.value})` : ""}</span>
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

                    <!-- Features section -->
                    <div class="features-section" style="margin-top: 16px;">
                      <ha-expansion-panel
                        outlined
                        header="${this._localize('features') || 'Features'}"
                        .secondary=${this._localize('rules_defined', { count: (ent.features || []).length })}
                      >
                        <div class="features-list">
                          ${(ent.features || []).map((feature, fIdx) => html`
                            <div class="feature-item" style="border: 1px solid var(--divider-color); padding: 8px; margin-bottom: 8px; border-radius: 4px; background: var(--card-background-color);">
                              <div class="feature-item-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="font-weight: 500;">${this._getFeatureName(feature.type)}</span>
                                <ha-icon-button
                                  @click=${() => this._removeFeature(idx, fIdx)}
                                ><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
                              </div>
                              <feature-renderer-editor-card
                                .hass=${this.hass}
                                .config=${feature}
                                @config-changed=${(e) => {
                                  e.stopPropagation();
                                  this._updateFeature(idx, fIdx, e.detail.config);
                                }}
                              ></feature-renderer-editor-card>
                            </div>
                          `)}
                        </div>
                        <div class="feature-add" style="margin-top: 8px;">
                          <feature-selector-card
                            .hass=${this.hass}
                            .label=${this._localize('add_feature')}
                            .tags=${this.featureTags}
                            @feature-selected=${(e) => this._addFeature(idx, e)}
                          ></feature-selector-card>
                        </div>
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
