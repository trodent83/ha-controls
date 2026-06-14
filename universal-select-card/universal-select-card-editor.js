import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

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
   * Inherits properties from HAControlBase and tracks the editor config copy.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return { ...super.properties, _config: { type: Object } };
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
      <link rel="stylesheet" href="/local/ha-controls/universal-select-card/universal-select-card-editor.css?v=${VERSION}">
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${this._baseSchema()}
        .computeLabel=${(s) => s.label || s.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
      
      <div class="options-list">
        ${options.map((option, idx) => this._renderOption(option, idx, options.length))}
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
