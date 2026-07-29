import { HAControlThresholdBase, html } from "../ha-control-threshold-base.js?v=0.6.9";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.25';

/**
 * MultiPropertyCard
 * A custom Home Assistant Lovelace dashboard card that renders a layout row/column grid of entity states.
 * Supports threshold-based coloring, fallback icon mapping, Javasript condition logic filters,
 * custom units override, interactive tap/hold action execution, and dynamic child features.
 * 
 * @extends HAControlThresholdBase
 */
class MultiPropertyCard extends HAControlThresholdBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Inherits properties from HAControlThresholdBase and tracks the config object.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return { ...super.properties, config: {} };
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
   * Creates and returns the configuration editor element for this card.
   * Home Assistant Lovelace visual editor links to this method.
   * 
   * @static
   * @returns {HTMLElement} The multi-property-card-editor configuration element
   */
  static getConfigElement() {
    return document.createElement("multi-property-card-editor");
  }



  /**
   * Returns default stub configuration details for this custom card.
   * Used when users click to add this card to their dashboards.
   * 
   * @static
   * @returns {Object} Stub configuration details
   */
  static getStubConfig() {
    return {
      show_label: true,
      show_value: true,
      show_icon: true,
      layout: "row",
      entities: [
        {
          entity: "sun.sun",
          name: "Sun Status",
          thresholds: [
            { value: "above_horizon", color: "orange", animation: "blink" }
          ]
        }
      ]
    };
  }

  /**
   * Renders the custom card's HTML template.
   * Filters entities list by JavaScript conditions and availability, drawing status icons and parameters values.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.config?.entities || !this.hass) return this.renderError(this._localize('no_entities'));

    const layoutClass = this.config.layout === 'column' ? 'layout-column' : 'layout-row';

    return html`
      ${this.renderStyle('multi-property-card.css')}
      <ha-card>
        <div class="content-container ${layoutClass}">
      ${this.config.entities
        .filter(entConf => {
          const entityId = typeof entConf === 'string' ? entConf : entConf?.entity;

          if (!entityId) {
            if (typeof entConf === 'object' && entConf.condition) {
              try {
                const hass = this.hass;
                return eval(entConf.condition);
              } catch (e) {
                return false;
              }
            }
            return true;
          }

          const stateObj = this.hass?.states[entityId];
          if (!stateObj) return false;

          if (typeof entConf === 'object' && entConf.condition) {
            try {
              const hass = this.hass;
              const entity = stateObj;
              const state = stateObj.state;
              const attributes = stateObj.attributes;
              return eval(entConf.condition);
            } catch (e) {
              console.error("Error evaluating condition for", entityId, e);
              return false;
            }
          }

          const attr = typeof entConf === 'object' ? entConf.attribute : null;
          const val = attr ? stateObj.attributes[attr] : stateObj.state;

          const isUnavailable =
            val === undefined ||
            val === null ||
            String(val).toLowerCase() === 'unavailable' ||
            String(val).toLowerCase() === 'unknown' ||
            String(val).toLowerCase() === 'none';

          if (this.config.show_unavailable === true) return true;

          return !isUnavailable;
        })
        .map(entConf => {
          const entityId = typeof entConf === 'string' ? entConf : entConf.entity;
          const stateObj = entityId ? this.hass.states[entityId] : null;

          const domain = (entityId && entityId.includes('.')) ? entityId.split('.')[0] : 'unknown';

          let state;
          if (stateObj) {
            state = entConf.attribute ? stateObj?.attributes[entConf.attribute] : stateObj?.state;
          } else if (typeof entConf === 'object' && entConf.value !== undefined) {
            state = entConf.value;
          }
          const isUnavailable = entityId ? (!stateObj || state === 'unavailable' || state === 'unknown' || state === undefined || state === null) : false;
          const deviceClass = stateObj?.attributes?.device_class;

          const matchColor = this._getMatchedProperty(state, entConf.thresholds, 'color');
          const matchAnim = this._getMatchedProperty(state, entConf.thresholds, 'animation');
          const finalColor = isUnavailable ? 'var(--disabled-text-color)' : (matchColor !== null ? (matchColor || 'var(--primary-text-color)') : (entConf.color || 'var(--primary-text-color)'));
          const finalAnim = matchAnim !== null ? matchAnim : (entConf.animation || '');

          const icon = entConf.icon || stateObj?.attributes?.icon || this._getFallbackIcon(domain, deviceClass);
          const unit = entConf.unit !== undefined ? entConf.unit : stateObj?.attributes?.unit_of_measurement || '';

          let labelStyle = "";
          if (entConf.label_font_size) {
            const size = entConf.label_font_size;
            labelStyle += `font-size: ${isNaN(size) ? size : size + 'px'};`;
          }
          if (entConf.label_bold) labelStyle += `font-weight: bold;`;

          const showValue = entConf.show_value !== undefined ? entConf.show_value : this.config.show_value;
          const showLabel = entConf.show_label !== undefined ? entConf.show_label : this.config.show_label;
          const showIcon = entConf.show_icon !== undefined ? entConf.show_icon : this.config.show_icon;

          return html`
            <div class="btn ${isUnavailable ? 'is-unavailable' : ''}" 
                style="color: ${finalColor};" 
                @click="${() => this._runAction(entConf, 'tap')}"
                @contextmenu="${(e) => { e.preventDefault(); this._runAction(entConf, 'hold'); }}">
              
              ${showIcon !== false ? html`<ha-icon .icon="${icon}" class="${finalAnim}"></ha-icon>` : ''}

              <div class="info-container">
                ${showLabel ? html`
                  <div class="label" style="${labelStyle}">
                    ${entConf.name || stateObj?.attributes?.friendly_name || entityId || ''}
                  </div>
                ` : ''}
                ${showValue ? html`
                  <div class="value-container">
                      <span class="value-text">${state ?? (entityId ? this._localize('not_available') : '')}</span>
                      ${unit ? html`<span class="unit-text">${unit}</span>` : ''}
                  </div>
                ` : ''}
              </div>

              ${(entConf.features && Array.isArray(entConf.features)) ? html`
                <div class="features-container">
                  ${entConf.features.filter(featureConfig => {
            if (featureConfig.condition) {
              try {
                const hass = this.hass;
                const entity = stateObj;
                const state = stateObj?.state;
                const attributes = stateObj?.attributes;
                return eval(featureConfig.condition);
              } catch (e) {
                console.error("Error evaluating condition for feature", featureConfig, e);
                return false;
              }
            }
            return true;
          }).map(featureConfig => html`
                    <feature-renderer-card
                      .hass=${this.hass}
                      .config=${featureConfig}
                      .stateObj=${stateObj}
                      .color=${finalColor}
                    ></feature-renderer-card>
                  `)}
                </div>
              ` : ''}
            </div>
          `;
        })}
        </div>
      </ha-card>
    `;
  }

  /**
   * Dispatches Lovelace custom actions (tap/hold) matching user dashboard specifications.
   * 
   * @param {Object} item - Entity card item configuration schema
   * @param {string} actionType - Trigger mode ('tap' or 'hold')
   * @private
   */
  _runAction(item, actionType) {
    const actionConfig = actionType === 'hold' ? item.hold_action : item.tap_action;
    if (!actionConfig || actionConfig.action === "none") return;
    this.dispatchEvent(new CustomEvent("hass-action", {
      detail: { config: item, action: actionType },
      bubbles: true, composed: true,
    }));
  }

  /**
   * Sets the user configuration object for the card, validating required parameters.
   * Throws configuration errors if essential parameters (e.g. entities list) are missing.
   * 
   * @param {Object} config - The raw configuration schema from Lovelace dashboard
   * @throws {Error} If entities list is missing in dashboard config
   */
  setConfig(config) {
    if (!config.entities) {
      throw new Error("Please define entities");
    }
    this.config = {
      show_label: true,
      show_value: true,
      show_icon: true,
      show_unavailable: false,
      ...config
    };
  }
}

customElements.define("multi-property-card", MultiPropertyCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "multi-property-card",
  name: "Multi Property Card",
  description: "Displays multiple entities with their information and possible custom actions.",
  preview: true
});
