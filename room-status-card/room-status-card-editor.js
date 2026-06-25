import { HAControlBase, html } from "../ha-control-base.js?v=0.6.1";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.26';

/**
 * RoomStatusCardEditor
 * Visual configuration editor UI for RoomStatusCard.
 * Manages general headers, badges list, and dynamic nested features per badge.
 * 
 * @extends HAControlBase
 */
class RoomStatusCardEditor extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Tracks editor config copy and tab selection state.
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

  /**
   * Initializes the RoomStatusCardEditor component instance,
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
  get translationPath() { return "/local/ha-controls/room-status-card/translations"; }

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

    const knownKeys = [
      "name",
      "icon",
      "header_settings",
      "show_header",
      "show_icon",
      "badges"
    ];
    this._unrecognizedKeys = this._validateConfigKeys(config, knownKeys);
  }

  /**
   * Invoked when top-level card configuration parameters are changed.
   * 
   * @param {CustomEvent} ev - Form value-changed event details
   * @private
   */
  _valueChanged(ev) {
    const config = ev.detail.value;
    this._config = { ...this._config, ...config };
    this._fireConfigChanged();
  }

  /**
   * Invoked when general badge attributes are edited.
   * 
   * @param {CustomEvent} ev - Form value-changed event details
   * @param {number} index - Index sequence of badge being edited
   * @private
   */
  _badgeChanged(ev, index) {
    const badges = [...(this._config.badges || [])];
    badges[index] = { ...badges[index], ...ev.detail.value };
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  /**
   * Appends a blank default badge object configuration to the badges array list.
   * 
   * @private
   */
  _addBadge() {
    const badges = [...(this._config.badges || []), { entity: "", color: "", features: [] }];
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  /**
   * Deletes a badge object configuration by index.
   * 
   * @param {number} index - Index of target badge to remove
   * @private
   */
  _removeBadge(index) {
    const badges = [...(this._config.badges || [])];
    badges.splice(index, 1);
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  /**
   * Adjusts the display sequence of badges.
   * 
   * @param {number} index - Index of badge to move
   * @param {number} direction - Direction delta (-1 to move up, 1 to move down)
   * @private
   */
  _moveBadge(index, direction) {
    const badges = [...(this._config.badges || [])];
    if (index + direction < 0 || index + direction >= badges.length) return;
    
    const temp = badges[index];
    badges[index] = badges[index + direction];
    badges[index + direction] = temp;
    
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  /**
   * Returns feature compatibility tags.
   * 
   * @type {Array<string>}
   */
  get featureTags() {
    return ['room-status-card'];
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
   * Appends a new layout feature block to a badge config.
   * 
   * @param {number} badgeIndex - Index of target badge
   * @param {CustomEvent} ev - Selection details containing feature type selector
   * @private
   */
  _addFeature(badgeIndex, ev) {
    const type = ev.detail.type;
    if (!type) return;

    const featureConfig = { type };
    const isCustom = type.startsWith("custom:");
    const tag = isCustom ? type.substring(7) : `hui-${type}-card-feature`;
    const FeatureClass = customElements.get(tag);
    if (FeatureClass && FeatureClass.getStubConfig) {
      Object.assign(featureConfig, FeatureClass.getStubConfig());
    }

    const badges = [...this._config.badges];
    const features = [...(badges[badgeIndex].features || []), featureConfig];
    badges[badgeIndex] = { ...badges[badgeIndex], features };
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  /**
   * Removes a feature configuration from a badge's list.
   * 
   * @param {number} badgeIndex - Index of target badge
   * @param {number} featureIndex - Feature index to remove
   * @private
   */
  _removeFeature(badgeIndex, featureIndex) {
    const badges = [...this._config.badges];
    const features = [...(badges[badgeIndex].features || [])];
    features.splice(featureIndex, 1);
    badges[badgeIndex] = { ...badges[badgeIndex], features };
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  /**
   * Updates feature configurations by index.
   * 
   * @param {number} badgeIndex - Index of target badge
   * @param {number} featureIndex - Feature index to replace
   * @param {Object} newFeatureConfig - Replacement feature layout schema
   * @private
   */
  _updateFeature(badgeIndex, featureIndex, newFeatureConfig) {
    const badges = [...this._config.badges];
    const features = [...(badges[badgeIndex].features || [])];
    features[featureIndex] = newFeatureConfig;
    badges[badgeIndex] = { ...badges[badgeIndex], features };
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  /**
   * Dispatches the updated config state back to the Lovelace dashboard configuration framework.
   * 
   * @private
   */
  _fireConfigChanged() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Constructs the top-level card settings form schema fields dictionary.
   * 
   * @private
   * @returns {Array<Object>} Form fields schema definition for ha-form
   */
  _schema() {
    return [
      { 
        name: "", 
        type: "grid", 
        schema: [
          { name: "name", label: this._localize('room_name'), selector: { text: {} } },
          { name: "icon", label: this._localize('icon'), selector: { icon: {} } },
        ]
      },
      {
        name: "header_settings",
        label: this._localize('header_settings'),
        type: "grid",
        schema: [
          { name: "show_header", label: this._localize('display_room_name'), selector: { boolean: {} } },
          { name: "show_icon", label: this._localize('display_icon'), selector: { boolean: {} } },
          {
            name: "heading_style",
            label: this._localize('heading_style') || "Heading Style",
            selector: {
              select: {
                options: [
                  { value: "title", label: this._localize('style_title') || "Title" },
                  { value: "subtitle", label: this._localize('style_subtitle') || "Subtitle" }
                ]
              }
            }
          }
        ]
      }
    ];
  }

  /**
   * Cleans the active configuration of any unrecognized properties.
   * Keeps only room status card schema fields.
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
    addIfDiff("name", "Room");
    addIfDiff("icon", "mdi:home");
    if (this._config.header_settings !== undefined) {
      cleaned.header_settings = {};
      if (this._config.header_settings.show_header !== undefined) {
        cleaned.header_settings.show_header = this._config.header_settings.show_header;
      }
      if (this._config.header_settings.show_icon !== undefined) {
        cleaned.header_settings.show_icon = this._config.header_settings.show_icon;
      }
      if (this._config.header_settings.heading_style !== undefined && this._config.header_settings.heading_style !== 'subtitle') {
        cleaned.header_settings.heading_style = this._config.header_settings.heading_style;
      }
    }
    
    if (this._config.badges && Array.isArray(this._config.badges)) {
      cleaned.badges = this._config.badges.map(badge => {
        const b = {};
        if (badge.entity !== undefined) b.entity = badge.entity;
        if (badge.color !== undefined) b.color = badge.color;
        if (badge.features !== undefined) b.features = badge.features;
        return b;
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
      type: this._config?.type || "custom:room-status-card",
      badges: []
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

    const badges = this._config.badges || [];

    return html`
      ${this.renderStyle('room-status-card-editor.css')}
      ${this.renderConfigValidationWarning()}
      
      <div class="ha-tabs">
        <div 
          class="ha-tab ${this._activeTab === 'general' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'general'; }}
        >
          ${this._localize('general') || 'General'}
        </div>
        <div 
          class="ha-tab ${this._activeTab === 'badges' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'badges'; }}
        >
          ${this._localize('badges') || 'Badges'}
        </div>
      </div>

      ${this._activeTab === 'general' ? html`
        <ha-form
          .hass=${this.hass}
          .data=${{
            ...this._config,
            header_settings: {
              heading_style: 'subtitle',
              ...this._config.header_settings
            }
          }}
          .schema=${this._schema()}
          .computeLabel=${(schema) => schema.label || schema.name}
          @value-changed=${this._valueChanged}
        ></ha-form>
      ` : html`
        <div class="badges-section" style="margin-top: 0;">
          <h3>${this._localize('badges')}</h3>
          ${badges.map((badge, idx) => {
            const entityId = badge.entity;
            const stateObj = entityId && this.hass ? this.hass.states[entityId] : null;
            const friendlyName = stateObj?.attributes?.friendly_name || entityId;
            
            const badgeSchema = [
              { name: "entity", selector: { entity: {} } },
              { name: "color", label: this._localize('default_color') || 'Color', selector: { text: {} } }
            ];
            
            const badgeData = { ...badge };

            return html`
              <ha-expansion-panel outlined style="margin-bottom: 12px; display: block;">
                <div slot="header" class="badge-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                  <span>${friendlyName || this._localize('badge_num', { num: idx + 1 })}</span>
                  <div @click=${(e) => e.stopPropagation()}>
                    <ha-icon-button
                      @click=${() => this._moveBadge(idx, -1)}
                      .disabled=${idx === 0}
                    ><ha-icon icon="mdi:arrow-up"></ha-icon></ha-icon-button>
                    <ha-icon-button
                      @click=${() => this._moveBadge(idx, 1)}
                      .disabled=${idx === badges.length - 1}
                    ><ha-icon icon="mdi:arrow-down"></ha-icon></ha-icon-button>
                    <ha-icon-button
                      class="remove-btn-compact"
                      @click=${() => this._removeBadge(idx)}
                    ><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
                  </div>
                </div>
                
                <div class="badge-content" style="padding: 16px;">
                  <ha-form
                    .hass=${this.hass}
                    .data=${badgeData}
                    .schema=${badgeSchema}
                    .computeLabel=${(schema) => schema.label || schema.name}
                    @value-changed=${(e) => this._badgeChanged(e, idx)}
                  ></ha-form>

                  <!-- Features list under badge -->
                  <div class="features-section" style="margin-top: 16px;">
                    <h4 style="margin-bottom: 8px;">${this._localize('features') || 'Features'}</h4>
                    <div class="features-list">
                      ${(badge.features || []).map((feature, fIdx) => html`
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
                  </div>
                </div>
              </ha-expansion-panel>
            `;
          })}
          
          <ha-button raised @click=${this._addBadge} style="margin-top: 8px;">
            <ha-icon icon="mdi:plus" slot="icon"></ha-icon> ${this._localize('add_badge')}
          </ha-button>
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

customElements.define("room-status-card-editor", RoomStatusCardEditor);
