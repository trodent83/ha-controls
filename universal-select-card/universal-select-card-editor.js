import { HAControlBase, html } from "../ha-control-base.js?v=0.6.4";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.4';

/**
 * UniversalSelectCardEditor
 * Visual configuration editor for UniversalSelectCard.
 * Generates dropdown field bindings, custom label mappings, and interactive card feature loaders.
 * 
 * @extends HAControlBase
 */
class UniversalSelectCardEditor extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Inherits properties from HAControlBase, tracks the editor config copy and active tab selection state.
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
   * Initializes the UniversalSelectCardEditor component instance,
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
  get translationPath() { return "/local/ha-controls/universal-select-card/translations"; }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() { return VERSION; }

  /**
   * Receives the configuration object from Home Assistant Lovelace dashboard.
   * 
   * @param {Object} config - The raw configuration schema from Lovelace dashboard
   */
  setConfig(config) {
    this._config = config;

    const knownKeys = [
      "entity",
      "lock_entity",
      "show_label",
      "layout",
      "options_order",
      "options_config"
    ];
    this._unrecognizedKeys = this._validateConfigKeys(config, knownKeys);
  }

  /**
   * Generates the schema definition for general card configurations (e.g. entities list, layout, labels).
   * 
   * @private
   * @returns {Array<Object>} Base configuration form fields schema
   */
  _baseSchema() {
    return [
      { name: "entity", label: this._localize('controlled_dropdown'), selector: { entity: { domain: "input_select" } } },
      { name: "lock_entity", label: this._localize('disable_control'), selector: { entity: { domain: "binary_sensor" } } },
      { name: "show_label", label: this._localize('show_labels'), selector: { boolean: {} } },
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
   * Formats and returns a human-readable display name for custom Lovelace card features.
   * 
   * @param {string} type - Feature identifier tag name (e.g., 'custom:timer-card-feature')
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
   * Cleans the active configuration of any unrecognized properties.
   * Keeps only universal select card schema fields.
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
    if (this._config.entity !== undefined) cleaned.entity = this._config.entity;
    if (this._config.lock_entity !== undefined) cleaned.lock_entity = this._config.lock_entity;
    addIfDiff("show_label", true);
    addIfDiff("layout", "row");
    if (this._config.options_order !== undefined) cleaned.options_order = this._config.options_order;
    
    if (this._config.options_config && typeof this._config.options_config === 'object') {
      cleaned.options_config = {};
      for (const [optName, optConf] of Object.entries(this._config.options_config)) {
        const o = {};
        if (optConf.label !== undefined) o.label = optConf.label;
        if (optConf.active_label_entity !== undefined) o.active_label_entity = optConf.active_label_entity;
        if (optConf.icon !== undefined) o.icon = optConf.icon;
        if (optConf.color !== undefined) o.color = optConf.color;
        if (optConf.animation !== undefined) o.animation = optConf.animation;
        if (optConf.hide_label_if_active !== undefined) o.hide_label_if_active = optConf.hide_label_if_active;
        if (optConf.hold_action !== undefined) o.hold_action = optConf.hold_action;
        if (optConf.features !== undefined) o.features = optConf.features;
        cleaned.options_config[optName] = o;
      }
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
      type: this._config?.type || "custom:universal-select-card",
      entity: ""
    };
    this._fireConfigChanged();
  }

  /**
   * Renders the editor configuration page layout.
   * Generates forms for base variables and iterates over select options to generate panels.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this._config) return html``;
    const data = { layout: 'row', ...this._config };
    
    const entityId = this._config.entity;
    const stateObj = entityId ? this.hass.states[entityId] : null;
    let options = stateObj?.attributes?.options || [];

    // Sort options according to the user-defined order in the configuration, if provided
    if (this._config.options_order) {
        const order = this._config.options_order;
        options = [...options].sort((a, b) => {
            const idxA = order.indexOf(a);
            const idxB = order.indexOf(b);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        });
    }

    return html`
      ${this.renderStyle('universal-select-card-editor.css')}
      ${this.renderConfigValidationWarning()}
      
      <div class="ha-tabs">
        <div 
          class="ha-tab ${this._activeTab === 'general' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'general'; }}
        >
          ${this._localize('general') || 'General'}
        </div>
        <div 
          class="ha-tab ${this._activeTab === 'options' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'options'; }}
        >
          ${this._localize('options') || 'Options'}
        </div>
      </div>

      ${this._activeTab === 'general' ? html`
        <ha-form
          .hass=${this.hass}
          .data=${data}
          .schema=${this._baseSchema()}
          .computeLabel=${(s) => s.label || s.name}
          @value-changed=${this._valueChanged}
        ></ha-form>
      ` : html`
        <div class="options-list" style="margin-top: 0;">
          ${options.length === 0 ? html`
            <div style="padding: 16px; text-align: center; color: var(--secondary-text-color);">
              ${this._localize('no_options_found') || 'No options found for the selected entity.'}
            </div>
          ` : options.map((option, idx) => this._renderOption(option, idx, options.length))}
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

  /**
   * Renders details form panel for an individual dropdown option.
   * 
   * @param {string} option - Option name being rendered
   * @param {number} idx - Index sequence of option button
   * @param {number} total - Total count of options
   * @private
   * @returns {import('lit-html').TemplateResult} Rendered options settings pane HTML
   */
  _renderOption(option, idx, total) {
      const optionData = this._config.options_config?.[option] || {};
      const mainSchema = [
          {
            name: "",
            type: "grid",
            schema: [
              { name: "label", label: this._localize('custom_label'), selector: { text: {} } },
              { name: "active_label_entity", label: this._localize('active_label_entity') || "Active Label Entity", selector: { entity: {} } },
              { name: "icon", label: this._localize('icon'), selector: { icon: {} } },
              { name: "color", label: this._localize('color'), selector: { text: {} } },
              { 
                name: "animation", 
                label: this._localize('animation'), 
                selector: { 
                  select: { 
                    options: [
                      { value: "", label: this._localize('none') },
                      { value: "bounce", label: this._localize('bounce') },
                      { value: "blink", label: this._localize('blink') },
                      { value: "rotating", label: this._localize('rotating') },
                      { value: "pulse", label: this._localize('pulse') },
                      { value: "shake", label: this._localize('shake') },
                      { value: "float", label: this._localize('float') },
                      { value: "spin-slow", label: this._localize('spin_slow') }
                    ] 
                  } 
                }
              },
              { name: "hide_label_if_active", label: this._localize('hide_label_if_active') || "Hide Label When Active", selector: { boolean: {} } }
            ]
          }
      ];

      const actionSchema = [
          {
            name: "hold_action",
            label: this._localize('hold_action'),
            selector: { "ui-action": {} }
          }
      ];

      return html`
        <ha-expansion-panel outlined class="option-panel">
            <div slot="header" class="panel-header">
                <div class="panel-title">${optionData.label || option}</div>
                <div class="panel-header-actions">
                    <ha-icon-button
                    @click=${(e) => { e.stopPropagation(); this._moveOption(option, -1); }}
                    .disabled=${idx === 0}
                    ><ha-icon icon="mdi:arrow-up"></ha-icon></ha-icon-button>
                    <ha-icon-button
                    @click=${(e) => { e.stopPropagation(); this._moveOption(option, 1); }}
                    .disabled=${idx === total - 1}
                    ><ha-icon icon="mdi:arrow-down"></ha-icon></ha-icon-button>
                </div>
            </div>
            <div class="panel-content">
                <ha-form
                    .hass=${this.hass}
                    .data=${optionData}
                    .schema=${mainSchema}
                    .computeLabel=${(s) => s.label || s.name}
                    @value-changed=${(e) => this._optionValueChanged(option, e)}
                ></ha-form>
                <div class="form-divider"></div>
                <ha-form
                    .hass=${this.hass}
                    .data=${optionData}
                    .schema=${actionSchema}
                    .computeLabel=${(s) => s.label || s.name}
                    @value-changed=${(e) => this._optionValueChanged(option, e)}
                ></ha-form>
                <div class="form-divider"></div>
                <div class="features-section">
                    <div class="features-header">${this._localize('features') || "Features"}</div>
                    <div class="features-list">
                        ${(optionData.features || []).map((feature, fIdx) => html`
                            <div class="feature-item">
                                <div class="feature-item-header">
                                    <span>${this._getFeatureName(feature.type)}</span>
                                    <ha-icon-button
                                        @click=${(e) => { e.stopPropagation(); this._removeFeature(option, fIdx); }}
                                    ><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
                                </div>
                                <feature-renderer-editor-card
                                    .hass=${this.hass}
                                    .config=${feature}
                                    @config-changed=${(e) => { e.stopPropagation(); this._updateFeature(option, fIdx, e.detail.config); }}
                                ></feature-renderer-editor-card>
                            </div>
                         `)}
                    </div>
                    <div class="feature-add">
                        <feature-selector-card
                          .hass=${this.hass}
                          label="${this._localize('add_feature')}"
                          @feature-selected=${(e) => this._addFeature(option, e)}
                        ></feature-selector-card>
                    </div>
                </div>
            </div>
        </ha-expansion-panel>
      `;
  }

  /**
   * Appends a new layout feature block to an option configuration, applying stub configs if present.
   * 
   * @param {string} option - Option name where feature is added
   * @param {CustomEvent} ev - Selection details containing feature type selector
   * @private
   */
  _addFeature(option, ev) {
    const type = ev.detail.type;
    if (!type) return;
    
    const featureConfig = { type: type };
    const isCustom = type.startsWith("custom:");
    const tag = isCustom ? type.substring(7) : `hui-${type}-card-feature`;
    const FeatureClass = customElements.get(tag);
    if (FeatureClass && FeatureClass.getStubConfig) {
        Object.assign(featureConfig, FeatureClass.getStubConfig());
    }

    const optionsConfig = this._config.options_config || {};
    const optionConfig = optionsConfig[option] || {};
    const features = [...(optionConfig.features || []), featureConfig];
    
    this._config = { ...this._config, options_config: { ...optionsConfig, [option]: { ...optionConfig, features } } };
    this._fireConfigChanged();
  }

  /**
   * Modifies display index sequence of options inside card dashboard configurations.
   * 
   * @param {string} option - Option targeted to move
   * @param {number} direction - Offset distance (-1 to slide left/up, 1 to slide right/down)
   * @private
   */
  _moveOption(option, direction) {
    const entityId = this._config?.entity;
    const stateObj = entityId ? this.hass.states[entityId] : null;
    let options = stateObj?.attributes?.options || [];
    
    let currentOrder = this._config.options_order ? [...this._config.options_order] : [...options];
    
    // Ensure all options are in currentOrder if not present
    options.forEach(opt => {
        if (!currentOrder.includes(opt)) currentOrder.push(opt);
    });

    const index = currentOrder.indexOf(option);
    if (index === -1) return;
    
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= currentOrder.length) return;

    [currentOrder[index], currentOrder[newIndex]] = [currentOrder[newIndex], currentOrder[index]];

    this._config = { ...this._config, options_order: currentOrder };
    this._fireConfigChanged();
  }

  /**
   * Removes a feature configuration from an option's list.
   * 
   * @param {string} option - Target option
   * @param {number} fIdx - Feature index to remove
   * @private
   */
  _removeFeature(option, fIdx) {
    const optionsConfig = this._config.options_config || {};
    const optionConfig = optionsConfig[option] || {};
    const features = [...(optionConfig.features || [])];
    features.splice(fIdx, 1);
    
    this._config = { ...this._config, options_config: { ...optionsConfig, [option]: { ...optionConfig, features } } };
    this._fireConfigChanged();
  }

  /**
   * Updates feature configurations by index.
   * 
   * @param {string} option - Target option
   * @param {number} fIdx - Feature index to replace
   * @param {Object} newFeatureConfig - Replacement feature layout schema
   * @private
   */
  _updateFeature(option, fIdx, newFeatureConfig) {
    const optionsConfig = this._config.options_config || {};
    const optionConfig = optionsConfig[option] || {};
    const features = [...(optionConfig.features || [])];
    features[fIdx] = newFeatureConfig;
    
    this._config = { ...this._config, options_config: { ...optionsConfig, [option]: { ...optionConfig, features } } };
    this._fireConfigChanged();
  }

  /**
   * Invoked when nested option attributes change within expansion panel configurations.
   * 
   * @param {string} option - Name of the option modified
   * @param {CustomEvent} ev - Form value-changed event
   * @private
   */
  _optionValueChanged(option, ev) {
      const newOptionConfig = { ...this._config.options_config?.[option], ...ev.detail.value };
      const optionsConfig = { ...this._config.options_config, [option]: newOptionConfig };
      this._config = { ...this._config, options_config: optionsConfig };
      this._fireConfigChanged();
  }

  /**
   * Invoked when top-level card configuration parameters are changed.
   * Cleans options details if entity source target is changed.
   * 
   * @param {CustomEvent} ev - Form value-changed event
   * @private
   */
  _valueChanged(ev) {
    const newConfig = ev.detail.value;

    if (this._config && this._config.entity !== newConfig.entity) {
      const { options_config, options_order, ...rest } = newConfig;
      this._config = rest;
    } else {
      this._config = { ...this._config, ...newConfig };
    }
    this._fireConfigChanged();
  }

  /**
   * Dispatches the updated configuration dictionary back to dashboard engine.
   * 
   * @private
   */
  _fireConfigChanged() {
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

customElements.define("universal-select-card-editor", UniversalSelectCardEditor);
