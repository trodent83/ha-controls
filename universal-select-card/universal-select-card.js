import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.4';

/**
 * UniversalSelectCard
 * A versatile segmented control card for Home Assistant dashboard interface.
 * Maps dropdown selection options (from input_select entities) into customizable inline option tiles.
 * Supports action mappings (tap/hold), animations, custom labels/icons, and feature renderers.
 * 
 * @extends HAControlBase
 */
class UniversalSelectCard extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Inherits properties from HAControlBase and tracks the dashboard configuration object.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return { 
      ...super.properties,
      config: {} 
    };
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
   * Returns layout size factor of this card inside dashboard grids.
   * 
   * @returns {number} The visual layout size rating
   */
  getCardSize() {
    return 1;
  }

  /**
   * Controls when the element should re-render to optimize dashboard performance.
   * Re-renders on config updates or only when configured entities, labels, or feature items change state.
   * 
   * @param {Map<string, any>} changedProps - Map of properties that changed in this cycle
   * @returns {boolean} True if the card should re-render, false otherwise
   */
  shouldUpdate(changedProps) {
    if (changedProps.has('config')) {
      return true;
    }

    if (changedProps.has('hass')) {
      const oldHass = changedProps.get('hass');
      if (!oldHass || !this.hass || !this.config) return true;

      // Update if the main controlled entity changes its state
      if (oldHass.states[this.config.entity] !== this.hass.states[this.config.entity]) {
        return true;
      }

      // Update if the locking entity changes its state (used to disable the control)
      if (this.config.lock_entity && 
          oldHass.states[this.config.lock_entity] !== this.hass.states[this.config.lock_entity]) {
        return true;
      }

      const stateObj = this.hass.states[this.config.entity];
      if (stateObj) {
        const option = stateObj.state;
        const optCfg = this.config.options_config?.[option];
        
        // If the option's label depends on another entity's state, update when that entity changes
        if (optCfg?.active_label_entity && 
            oldHass.states[optCfg.active_label_entity] !== this.hass.states[optCfg.active_label_entity]) {
          return true;
        }
        
        // Propagate updates if any feature entity state changes
        if (Array.isArray(optCfg?.features)) {
          for (const feature of optCfg.features) {
            const fEntity = feature.entity;
            if (fEntity && oldHass.states[fEntity] !== this.hass.states[fEntity]) {
              return true;
            }
          }
        }
      }
      return false;
    }
    return true;
  }

  /**
   * Renders the custom card's HTML template.
   * Maps out selectable option buttons, applies styling custom variables, and renders embedded features.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.config || !this.config.entity || !this.hass) return html``;
    const stateObj = this.hass.states[this.config.entity];
    let options = stateObj?.attributes.options || [];
    
    // Sort options according to the user-defined order in the configuration, if provided
    if (this.config.options_order) {
      const order = this.config.options_order;
      options = [...options].sort((a, b) => {
        const idxA = order.indexOf(a);
        const idxB = order.indexOf(b);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }
    
    // Check if the card should be disabled based on the lock_entity
    const isLocked = this.config.lock_entity && this.hass.states[this.config.lock_entity]?.state === 'on';

    const layoutClass = this.config.layout === 'column' ? 'layout-column' : 'layout-row';
    const lockedClass = isLocked ? 'locked' : '';

    return html`
      <link rel="stylesheet" href="/local/ha-controls/universal-select-card/universal-select-card.css?v=${VERSION}">
      <ha-card class="${layoutClass} ${lockedClass}">
        ${options.map(option => {
          const optCfg = this.config.options_config?.[option] || {};
          const isActive = stateObj.state === option;
          
          const animationClass = isActive ? (optCfg.animation || '') : '';

          let label = optCfg.label || option;
          // Compute active label dynamically if configured
          if (isActive) {
            // Fallback to active_label_entity state
            if (optCfg.active_label_entity) {
              const activeStateObj = this.hass.states[optCfg.active_label_entity];
              if (activeStateObj) {
                label = this.hass.formatEntityState ? this.hass.formatEntityState(activeStateObj) : activeStateObj.state;
              }
            }
          }

          return html`
            <!-- Renders individual option buttons with appropriate styles and event listeners -->
            <div class="btn" 
                 style="background-color: ${isActive ? (optCfg.color || 'var(--primary-color)') : 'transparent'}; 
                        color: ${isActive ? 'white' : 'var(--disabled-text-color)'};"
                 @mousedown="${(e) => this._handleDown(e, option)}"
                 @touchstart="${(e) => this._handleDown(e, option)}"
                 @mouseup="${(e) => this._handleUp(e)}"
                 @touchend="${(e) => this._handleUp(e)}"
                 @touchcancel="${(e) => this._handleCancel(e)}"
                 @mouseleave="${(e) => this._handleCancel(e)}"
                 @click="${(e) => this._handleClick(e, option)}">
              <ha-icon 
                class="${animationClass}" 
                .icon="${optCfg.icon || 'mdi:circle-outline'}">
              </ha-icon>
              ${this.config.show_label && !(isActive && optCfg.hide_label_if_active) ? html`<div class="label">${label}</div>` : ''}
              ${isActive && Array.isArray(optCfg.features) ? optCfg.features.map(feature => html`
                <feature-renderer-card 
                  .hass=${this.hass} 
                  .config=${feature} 
                  .stateObj=${stateObj}>
                </feature-renderer-card>
              `) : ''}
            </div>
          `;
        })}
      </ha-card>
    `;
  }

  /**
   * Creates and returns the configuration editor element for this card.
   * Home Assistant Lovelace visual editor links to this method.
   * 
   * @static
   * @returns {HTMLElement} The universal-select-card-editor configuration element
   */
  static getConfigElement() {
    return document.createElement("universal-select-card-editor");
  }

  /**
   * Triggers the Home Assistant API service calls to set the dropdown selection.
   * 
   * @param {string} option - The select option value to set
   * @private
   */
  _selectOption(option) {
    this.hass.callService("input_select", "select_option", {
      entity_id: this.config.entity,
      option: option
    });
  }

  /**
   * Helper utility checking if the card interaction state is locked.
   * 
   * @returns {boolean} True if card interactions are blocked
   * @private
   */
  _isLocked() {
    return this.config.lock_entity && this.hass.states[this.config.lock_entity]?.state === 'on';
  }

  /**
   * Listens to mouse/touch activation, configuring timers to detect holds.
   * 
   * @param {Event} e - Interaction event object
   * @param {string} option - Option associated with the interaction
   * @private
   */
  _handleDown(e, option) {
    if (this._isLocked()) return;
    this._isHolding = false;
    // Set a timer to trigger a long press (hold) action after 1 second
    this._longPressTimer = setTimeout(() => {
      this._isHolding = true;
      this._handleHold(option);
    }, 1000);
  }

  /**
   * Cleans up timers upon interaction release.
   * 
   * @param {Event} e - Interaction end event object
   * @private
   */
  _handleUp(e) {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  /**
   * Cleans up timers and state variables if touch drag offsets trigger cancels.
   * 
   * @param {Event} e - Cancel event object
   * @private
   */
  _handleCancel(e) {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
    this._isHolding = false;
  }

  /**
   * Invokes option changes or consumes events if a hold event was executed instead.
   * 
   * @param {Event} e - Click event object
   * @param {string} option - Option clicked
   * @private
   */
  _handleClick(e, option) {
    if (this._isLocked()) return;
    // If the click is actually the end of a hold, don't execute the standard click action
    if (this._isHolding) {
      e.stopPropagation();
      e.preventDefault();
      this._isHolding = false;
      return;
    }
    this._selectOption(option);
  }

  /**
   * Evaluates active actions configured on holds.
   * 
   * @param {string} option - Option clicked
   * @private
   */
  _handleHold(option) {
    const stateObj = this.hass.states[this.config.entity];
    if (stateObj && stateObj.state === option) {
      const optCfg = this.config.options_config?.[option];
      if (optCfg && optCfg.hold_action) {
        this._handleAction(optCfg.hold_action);
      }
    }
  }

  /**
   * Routes general Home Assistant UI Actions (e.g. call-service, navigate, url, more-info).
   * Supports standard Lovelace action protocol schemas.
   * 
   * @param {Object} actionConfig - Configuration details for the hold action
   * @private
   */
  _handleAction(actionConfig) {
    if (!actionConfig) return;
    const action = actionConfig.action;
    // Standard Home Assistant service calls
    if (action === 'call-service' || action === 'perform-action') {
      const { service, data, target, perform_action } = actionConfig;
      const svc = service || perform_action;
      const [domain, serviceName] = svc.split('.');
      this.hass.callService(domain, serviceName, data, target);
    // Navigate to another Home Assistant dashboard view
    } else if (action === 'navigate') {
      window.history.pushState(null, '', actionConfig.navigation_path);
      const event = new Event('location-changed', { bubbles: true, composed: true });
      window.dispatchEvent(event);
    // Open external URL
    } else if (action === 'url') {
      window.open(actionConfig.url_path);
    // Fire a custom DOM event
    } else if (action === 'fire-dom-event') {
      const event = new CustomEvent("ll-custom", {
        bubbles: true,
        composed: true,
        detail: actionConfig
      });
      this.dispatchEvent(event);
    // Open the More Info dialog for the controlled entity
    } else if (action === 'more-info') {
        const event = new CustomEvent("hass-more-info", {
            bubbles: true,
            composed: true,
            detail: { entityId: this.config.entity }
        });
        this.dispatchEvent(event);
    }
  }

  /**
   * Receives configuration from Home Assistant and parses it.
   * Merges default attributes and deep-copies nested options_config.
   * 
   * @param {Object} config - The raw configuration schema from Lovelace dashboard
   * @throws {Error} If entity parameter is missing in configuration schema
   */
  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    this.config = { 
      show_label: true, 
      layout: 'row',
      ...config 
    };

    // Deep clone options_config to prevent shared reference mutations
    if (this.config.options_config) {
      this.config.options_config = { ...this.config.options_config };
      Object.keys(this.config.options_config).forEach(key => {
        this.config.options_config[key] = { ...this.config.options_config[key] };
      });
    }
  }
}

customElements.define("universal-select-card", UniversalSelectCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "universal-select-card",
  name: "Universal Select Card",
  description: "Displays input_select options as a segmented control block",
  preview: true
});
