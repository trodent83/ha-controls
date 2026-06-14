import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.12';

/**
 * MultiPropertyCard
 * (Registered as 'multi-state-card')
 * A Home Assistant dashboard card displaying icons, state descriptors, and inline controls for multiple entities.
 * Supports conditional JS expression parsing (`eval` execution against state changes) to filter entity visibility.
 * 
 * @extends HAControlBase
 */
class MultiPropertyCard extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Inherits properties from HAControlBase and tracks the config object.
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
  get translationPath() { return "/local/ha-controls/multi-state-card/translations"; }

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
   * @returns {HTMLElement} The multi-state-card-editor configuration element
   */
  static getConfigElement() {
    return document.createElement("multi-state-card-editor");
  }

  /**
   * Controls when the element should re-render to optimize dashboard performance.
   * Evaluates javascript conditional expressions on state changes to update element presentation conditionally.
   * 
   * @param {Map<string, any>} changedProps - Map of properties that changed in this cycle
   * @returns {boolean} True if the card should re-render, false otherwise
   */
  shouldUpdate(changedProps) {
    if (changedProps.has('config')) {
      this._conditionCache = {};
      return true;
    }

    if (changedProps.has('hass')) {
      const oldHass = changedProps.get('hass');
      if (!oldHass || !this.hass || !this.config || !this.config.entities) return true;

      let hasChanges = false;
      if (!this._conditionCache) this._conditionCache = {};

      for (const [index, ent] of this.config.entities.entries()) {
        if (!ent) continue;
        const entityId = typeof ent === 'string' ? ent : ent.entity;
        if (!entityId) continue;
        const stateObj = entityId ? this.hass.states[entityId] : undefined;
        const oldStateObj = entityId ? oldHass.states[entityId] : undefined;
        
        const stateChanged = oldStateObj !== stateObj;
        
        let conditionResult = true;
        let conditionChanged = false;

        if (typeof ent === 'object' && ent.condition) {
          try {
            const hass = this.hass;
            const entity = stateObj;
            const state = stateObj?.state;
            const attributes = stateObj?.attributes;
            conditionResult = !!eval(ent.condition);
          } catch (e) {
            conditionResult = false;
          }

          if (this._conditionCache[index] !== conditionResult) {
            this._conditionCache[index] = conditionResult;
            conditionChanged = true;
          }
        }

        if (conditionChanged || (conditionResult && stateChanged)) {
          hasChanges = true;
        }
      }
      return hasChanges;
    }
    return true;
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
      show_icon: true,
      layout: "row",
      entities: [
        {
          entity: "sun.sun",
        }
      ]
    };
  }

  /**
   * Fallback icon resolver. Maps entity domains and device classes to standard Material Design Icons.
   * 
   * @param {string} domain - The entity domain (e.g. 'light', 'sensor')
   * @param {string} deviceClass - Optional device_class attribute of the entity
   * @private
   * @returns {string} Material Design Icon string (e.g., 'mdi:flash')
   */
  _getFallbackIcon(domain, deviceClass) {
    const defaults = {
      battery: 'mdi:battery', temperature: 'mdi:thermometer', humidity: 'mdi:water-percent',
      light: 'mdi:lightbulb', switch: 'mdi:flash', binary_sensor: 'mdi:checkbox-marked-circle-outline'
    };
    return defaults[deviceClass] || defaults[domain] || 'mdi:circle-outline';
  }

  /**
   * Renders the custom card's HTML template.
   * Maps out buttons and embedded renderer features.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.config?.entities || !this.hass) return this.renderError(this._localize('no_entities'));

    const layoutClass = this.config.layout === 'column' ? 'layout-column' : 'layout-row';

    return html`
      ${this.renderStyle('multi-state-card.css')}
      <ha-card>
        <div class="content-container ${layoutClass}">
      ${(this.config.entities || [])
        .map(entConf => {
          const entityId = (typeof entConf === 'string' ? entConf : entConf.entity);
          let stateObj, domain, deviceClass;

          if (entityId) {
            stateObj = this.hass.states[entityId];
            if (!stateObj && !this.config.show_unavailable) {
              return html``;
            }
            domain = entityId.split('.')[0];
            deviceClass = stateObj?.attributes?.device_class;
          } else {
            if (!entConf.name && !entConf.icon) return html``;
            domain = 'constant';
            deviceClass = undefined;
          }

          const finalColor = entConf.color || 'var(--primary-text-color)';
          const finalAnim = entConf.animation || '';

          const icon = entConf.icon || this._getFallbackIcon(domain, deviceClass);

          const showIcon = entConf.show_icon !== undefined ? entConf.show_icon : this.config.show_icon;

          return html`<div class="multi-state-entity">
            <div
              class="btn"
              style="color: ${finalColor};"
              @click="${() => this._runAction(entConf, 'tap')}"
              @contextmenu="${(e) => { e.preventDefault(); this._runAction(entConf, 'hold'); }}"
            >
              ${showIcon ? html`<ha-icon .icon="${icon}" class="${finalAnim}"></ha-icon>` : ''}
              ${(entConf.features && Array.isArray(entConf.features)) ? html`
                <div class="features-container">
                  ${entConf.features.map(featureConfig => html`
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
      show_icon: true,
      show_unavailable: false,
      ...config
    };
  }
}

customElements.define("multi-state-card", MultiPropertyCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "multi-state-card",
  name: "Multi State Card",
  description: "Displays entities with their multiple states.",
  preview: true
});
