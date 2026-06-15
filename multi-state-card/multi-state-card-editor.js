import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '0.1.16';

/**
 * MultiStateCardEditor
 * Visual configuration editor UI for MultiStateCard.
 * 
 * @extends HAControlBase
 */
class MultiStateCardEditor extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Tracks local config instance copy and active tab selection state.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return { 
      ...super.properties, 
      _config: {},
      _activeTab: { type: String }
    };
  }

  /**
   * Initializes the MultiStateCardEditor component instance,
   * setting default active tab to 'general'.
   */
  constructor() {
    super();
    this._activeTab = 'general';
  }

  /**
   * Resolves the directory path hosting the translation localizations.
   * 
   * @type {string}
   */
  get translationPath() { return "/local/ha-controls/multi-state-card/translations"; }

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
   * Appends a blank default entity configuration block to the entities list.
   * 
   * @private
   */
  _addEntity() {
    const entities = [...(this._config.entities || []), { entity: "", features: [] }];
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
    return ['multi-state-card'];
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
   * Generates the schema definition for general card configurations (e.g. layout).
   * 
   * @private
   * @returns {Array<Object>} Form field schemas
   */
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

  /**
   * Cleans the active configuration of any unrecognized properties.
   * Keeps only multi state card schema fields.
   * 
   * @private
   */
  _cleanConfig() {
    if (!this._config) return;
    const cleaned = {
      type: this._config.type
    };
    if (this._config.layout !== undefined) cleaned.layout = this._config.layout;
    
    if (this._config.entities && Array.isArray(this._config.entities)) {
      cleaned.entities = this._config.entities.map(ent => {
        const e = {};
        if (ent.entity !== undefined) e.entity = ent.entity;
        if (ent.tap_action !== undefined) e.tap_action = ent.tap_action;
        if (ent.hold_action !== undefined) e.hold_action = ent.hold_action;
        if (ent.features !== undefined) e.features = ent.features;
        return e;
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
      type: this._config?.type || "custom:multi-state-card",
      entities: []
    };
    this._fireConfigChanged();
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
      ${this.renderStyle('multi-state-card-editor.css')}
      
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
      </div>

      ${this._activeTab === 'general' ? html`
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
      ` : html`
        <div class="card-config" style="margin-top: 0;">
          <div class="entities-container">
            ${(this._config.entities || []).map((ent, idx) => {
              const entityLabel = ent.name || ent.entity || `Item ${idx + 1}`;

              const combinedData = {
                entity: ent.entity || "",
                tap_action: ent.tap_action || { action: "none" },
                hold_action: ent.hold_action || { action: "none" }
              };

              const combinedSchema = [
                { name: "entity", label: this._localize('entity_override'), selector: { entity: {} } },
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
                        <div class="feature-add">
                          <feature-selector-card
                            .hass=${this.hass}
                            .label=${this._localize('add_feature')}
                            .tags=${this.featureTags}
                            @feature-selected=${(e) => this._addFeature(idx, e)}
                          ></feature-selector-card>
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
}

customElements.define("multi-state-card-editor", MultiStateCardEditor);
