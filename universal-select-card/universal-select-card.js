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

  render() {
    if (!this.config || !this.config.entity || !this.hass) return html``;
    const stateObj = this.hass.states[this.config.entity];
    const options = stateObj?.attributes.options || [];
    
    // Check if the card should be disabled
    const isLocked = this.config.lock_entity && this.hass.states[this.config.lock_entity]?.state === 'on';

    return html`
      <link rel="stylesheet" href="/local/ha-controls/universal-select-card/universal-select-card.css?v=1.0.1">
      <ha-card style="${isLocked ? 'pointer-events: none; opacity: 0.6; filter: grayscale(1);' : ''}">
        ${options.map(option => {
          const optCfg = this.config.options_config?.[option] || {};
          const isActive = stateObj.state === option;
          
          const animationClass = isActive ? (optCfg.animation || '') : '';

          return html`
            <div class="btn" 
                 style="background-color: ${isActive ? (optCfg.color || 'var(--primary-color)') : 'transparent'}; 
                        color: ${isActive ? 'white' : 'var(--disabled-text-color)'};"
                 @click="${() => !isLocked && this._selectOption(option)}">
              <ha-icon 
                class="${animationClass}" 
                .icon="${optCfg.icon || 'mdi:circle-outline'}">
              </ha-icon>
              ${this.config.show_label ? html`<div class="label">${optCfg.label || option}</div>` : ''}
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

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    this.config = { 
      show_label: true, 
      ...config 
    };
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
