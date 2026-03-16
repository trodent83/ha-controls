import { HAControlBase, html } from "../ha-control-base.js?v=0.5.1";

const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.4';

class UniversalSelectCard extends HAControlBase {
  static get properties() {
    return { 
      ...super.properties,
      // Holds the parsed user configuration for this card
      config: {} 
    };
  }

  // Path to the translations folder for this custom card
  get translationPath() { return "/local/ha-controls/universal-select-card/translations"; }
  get translationVersion() { return VERSION; }

  // Define the layout size of the card (used by Home Assistant's layout engine)
  getCardSize() {
    return 1;
  }

  // Optimizes rendering by checking if we actually need to update the DOM
  shouldUpdate(changedProps) {
    // Always update if the configuration changes
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

  // Main render function for generating the card's HTML layout
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
              ${this.config.show_label ? html`<div class="label">${label}</div>` : ''}
              ${isActive && Array.isArray(optCfg.features) ? optCfg.features.map(feature => html`
                <universal-feature-renderer 
                  .hass=${this.hass} 
                  .config=${feature} 
                  .stateObj=${stateObj}>
                </universal-feature-renderer>
              `) : ''}
            </div>
          `;
        })}
      </ha-card>
    `;
  }

  // Provides the custom editor element used in the Home Assistant Lovelace UI editor
  static getConfigElement() {
    return document.createElement("universal-select-card-editor");
  }

  // Calls the Home Assistant service to select an option for the input_select entity
  _selectOption(option) {
    this.hass.callService("input_select", "select_option", {
      entity_id: this.config.entity,
      option: option
    });
  }

  // Checks if the card is currently locked by the lock_entity
  _isLocked() {
    return this.config.lock_entity && this.hass.states[this.config.lock_entity]?.state === 'on';
  }

  // Handles the start of a touch/mouse press
  _handleDown(e, option) {
    if (this._isLocked()) return;
    this._isHolding = false;
    // Set a timer to trigger a long press (hold) action after 1 second
    this._longPressTimer = setTimeout(() => {
      this._isHolding = true;
      this._handleHold(option);
    }, 1000);
  }

  // Clears the hold timer if the interaction ends prematurely
  _handleUp(e) {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  // Clears the hold timer if the interaction is canceled (e.g., finger scrolls away)
  _handleCancel(e) {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
    this._isHolding = false;
  }

  // Handles click/tap to select the option
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

  // Triggers the customized hold action when an option is long-pressed
  _handleHold(option) {
    const stateObj = this.hass.states[this.config.entity];
    if (stateObj && stateObj.state === option) {
      const optCfg = this.config.options_config?.[option];
      if (optCfg && optCfg.hold_action) {
        this._handleAction(optCfg.hold_action);
      }
    }
  }

  // Routes custom actions (e.g., call-service, navigate, url, more-info)
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

  // Receives configuration from Home Assistant and parses it
  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    this.config = { 
      show_label: true, 
      layout: 'row',
      ...config 
    };

    // Deep clone and compile custom JS scripts into executable functions
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
