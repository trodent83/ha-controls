const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

class UniversalSelectCard extends LitElement {
  static get properties() {
    return { 
      hass: {}, 
      config: {} 
    };
  }

  getCardSize() {
    return 1;
  }

  shouldUpdate(changedProps) {
    if (changedProps.has('config')) {
      return true;
    }

    if (changedProps.has('hass')) {
      const oldHass = changedProps.get('hass');
      if (!oldHass || !this.hass || !this.config) return true;

      if (oldHass.states[this.config.entity] !== this.hass.states[this.config.entity]) {
        return true;
      }

      if (this.config.lock_entity && 
          oldHass.states[this.config.lock_entity] !== this.hass.states[this.config.lock_entity]) {
        return true;
      }

      const stateObj = this.hass.states[this.config.entity];
      if (stateObj) {
        const option = stateObj.state;
        const optCfg = this.config.options_config?.[option];
        
        if (optCfg?._scriptFn) {
          try {
            const newLabel = optCfg._scriptFn(this.hass, option);
            if (newLabel !== this._lastScriptLabel) {
              return true;
            }
            return false;
          } catch (e) {
            return true;
          }
        }
        
        if (optCfg?.active_label_entity && 
            oldHass.states[optCfg.active_label_entity] !== this.hass.states[optCfg.active_label_entity]) {
          return true;
        }
      }
      return false;
    }
    return true;
  }

  render() {
    if (!this.config || !this.config.entity || !this.hass) return html``;
    const stateObj = this.hass.states[this.config.entity];
    let options = stateObj?.attributes.options || [];
    
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
    
    // Check if the card should be disabled
    const isLocked = this.config.lock_entity && this.hass.states[this.config.lock_entity]?.state === 'on';

    const layoutClass = this.config.layout === 'column' ? 'layout-column' : 'layout-row';
    const lockedClass = isLocked ? 'locked' : '';

    return html`
      <link rel="stylesheet" href="/local/ha-controls/universal-select-card/universal-select-card.css?v=1.0.2">
      <ha-card class="${layoutClass} ${lockedClass}">
        ${options.map(option => {
          const optCfg = this.config.options_config?.[option] || {};
          const isActive = stateObj.state === option;
          
          const animationClass = isActive ? (optCfg.animation || '') : '';

          let label = optCfg.label || option;
          if (isActive) {
            if (optCfg._scriptFn) {
              try {
                label = optCfg._scriptFn(this.hass, option);
                this._lastScriptLabel = label;
              } catch (e) {
                label = "Error";
                console.error("Script error:", e);
              }
            } else if (optCfg.active_label_entity) {
              const activeStateObj = this.hass.states[optCfg.active_label_entity];
              if (activeStateObj) {
                label = this.hass.formatEntityState ? this.hass.formatEntityState(activeStateObj) : activeStateObj.state;
              }
            }
          }

          return html`
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
            </div>
          `;
        })}
      </ha-card>
    `;
  }

  static getConfigElement() {
    return document.createElement("universal-select-card-editor");
  }

  _selectOption(option) {
    this.hass.callService("input_select", "select_option", {
      entity_id: this.config.entity,
      option: option
    });
  }

  _isLocked() {
    return this.config.lock_entity && this.hass.states[this.config.lock_entity]?.state === 'on';
  }

  _handleDown(e, option) {
    if (this._isLocked()) return;
    this._isHolding = false;
    this._longPressTimer = setTimeout(() => {
      this._isHolding = true;
      this._handleHold(option);
    }, 1000);
  }

  _handleUp(e) {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  _handleCancel(e) {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
    this._isHolding = false;
  }

  _handleClick(e, option) {
    if (this._isLocked()) return;
    if (this._isHolding) {
      e.stopPropagation();
      e.preventDefault();
      this._isHolding = false;
      return;
    }
    this._selectOption(option);
  }

  _handleHold(option) {
    const stateObj = this.hass.states[this.config.entity];
    if (stateObj && stateObj.state === option) {
      const optCfg = this.config.options_config?.[option];
      if (optCfg && optCfg.hold_action) {
        this._handleAction(optCfg.hold_action);
      }
    }
  }

  _handleAction(actionConfig) {
    if (!actionConfig) return;
    const action = actionConfig.action;
    if (action === 'call-service' || action === 'perform-action') {
      const { service, data, target, perform_action } = actionConfig;
      const svc = service || perform_action;
      const [domain, serviceName] = svc.split('.');
      this.hass.callService(domain, serviceName, data, target);
    } else if (action === 'navigate') {
      window.history.pushState(null, '', actionConfig.navigation_path);
      const event = new Event('location-changed', { bubbles: true, composed: true });
      window.dispatchEvent(event);
    } else if (action === 'url') {
      window.open(actionConfig.url_path);
    } else if (action === 'fire-dom-event') {
      const event = new CustomEvent("ll-custom", {
        bubbles: true,
        composed: true,
        detail: actionConfig
      });
      this.dispatchEvent(event);
    } else if (action === 'more-info') {
        const event = new CustomEvent("hass-more-info", {
            bubbles: true,
            composed: true,
            detail: { entityId: this.config.entity }
        });
        this.dispatchEvent(event);
    }
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (!this.config || !this.hass || !this.config.entity) return;
    
    const stateObj = this.hass.states[this.config.entity];
    if (!stateObj) return;

    const optCfg = this.config.options_config?.[stateObj.state];
    if (optCfg && optCfg._scriptFn) {
      this._startTimer();
    } else {
      this._stopTimer();
    }
  }

  _startTimer() {
    if (this._interval) return;
    this._interval = setInterval(() => this.requestUpdate(), 1000);
  }

  _stopTimer() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopTimer();
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    this.config = { 
      show_label: true, 
      layout: 'row',
      ...config 
    };

    if (this.config.options_config) {
      this.config.options_config = { ...this.config.options_config };
      Object.keys(this.config.options_config).forEach(key => {
        this.config.options_config[key] = { ...this.config.options_config[key] };
        const optCfg = this.config.options_config[key];
        if (optCfg.active_label_script) {
          try {
            optCfg._scriptFn = new Function('hass', 'option', optCfg.active_label_script);
          } catch (e) {
            console.error("Error compiling script:", e);
          }
        }
      });
    }
  }

  // Hilfsmethode für das Lovelace-Vorschau-Fenster
  getCardSize() {
    return 1;
  }
}

// Registrierung der Card in Home Assistant
customElements.define("universal-select-card", UniversalSelectCard);

// Hinzufügen zum Custom-Card-Picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "universal-select-card",
  name: "Universal Select Card",
  description: "Displays input_select options as a segmented control block",
  preview: true
});
