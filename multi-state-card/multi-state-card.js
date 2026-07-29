import { HAControlBase, html } from "../ha-control-base.js?v=0.6.9";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '0.1.16';

/**
 * MultiStateCard
 * A Home Assistant dashboard card displaying dynamic controls entirely composed of card features.
 * Supports conditional JS expression parsing (`eval` execution against state changes) to filter entity visibility.
 * 
 * @extends HAControlBase
 */
class MultiStateCard extends HAControlBase {
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
  /**
   * Evaluates JavaScript expression securely in a local closure scope.
   * 
   * @param {string} expr - Expression string
   * @param {Object} stateObj - Entity state object
   * @private
   * @returns {any} Result of evaluation
   */
  _evalExpression(expr, stateObj) {
    if (!expr) return undefined;
    try {
      const hass = this.hass;
      const entity = stateObj;
      const state = stateObj?.state;
      const attributes = stateObj?.attributes || {};
      return eval(expr);
    } catch (e) {
      console.error("[MultiStateCard] Error evaluating expression:", expr, e);
      return undefined;
    }
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
      layout: "row",
      entities: [
        {
          entity: "sun.sun",
          features: [
            {
              type: "custom:icon-card-feature"
            }
          ]
        }
      ]
    };
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
          let stateObj;

          if (entityId) {
            stateObj = this.hass.states[entityId];
            if (!stateObj && !this.config.show_unavailable) {
              return html``;
            }
          }

          const isUnavailable = !stateObj || stateObj.state === 'unavailable';
          const isDisabled = (typeof entConf === 'object' && entConf.disabled_expression)
            ? !!this._evalExpression(entConf.disabled_expression, stateObj)
            : false;

          return html`<div class="multi-state-entity">
            <div
              class="btn ${isUnavailable ? 'is-unavailable' : ''} ${isDisabled ? 'is-disabled' : ''}"
              @click="${() => this._runAction(entConf, 'tap')}"
              @contextmenu="${(e) => { e.preventDefault(); this._runAction(entConf, 'hold'); }}"
            >
              ${(entConf.features && Array.isArray(entConf.features)) ? html`
                <div class="features-container">
                  ${entConf.features.filter(featureConfig => {
            if (featureConfig.condition) {
              return !!this._evalExpression(featureConfig.condition, stateObj);
            }
            return true;
          }).map(featureConfig => html`
                    <feature-renderer-card
                      .hass=${this.hass}
                      .config=${featureConfig}
                      .stateObj=${stateObj}
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

    // Direct dispatch of ll-custom for fire-dom-event actions to ensure bubbling to layout container
    if (actionConfig.action === "fire-dom-event") {
      this.dispatchEvent(new CustomEvent("ll-custom", {
        detail: actionConfig,
        bubbles: true,
        composed: true
      }));
      return;
    }

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
      show_unavailable: false,
      ...config
    };
  }
}

customElements.define("multi-state-card", MultiStateCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "multi-state-card",
  name: "Multi State Card",
  description: "Displays entities using a customizable array of features.",
  preview: true
});
