import { HAControlThresholdBase, html } from "../ha-control-threshold-base.js?v=0.6.1";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.0';

/**
 * RadiatorControlCard
 * A reusable Lovelace custom dashboard card designed to monitor and control radiators.
 * Combines climate target temp controllers, current temp sensor thresholds, mode selections,
 * and timer countdown visual trackers.
 * 
 * @extends HAControlThresholdBase
 */
class RadiatorControlCard extends HAControlThresholdBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Inherits properties from HAControlThresholdBase and tracks config.
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
  get translationPath() {
    return "/local/ha-controls/radiator-control-card/translations";
  }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() {
    return VERSION;
  }

  /**
   * Creates and returns the configuration editor element for this card.
   * Home Assistant Lovelace visual editor links to this method.
   * 
   * @static
   * @returns {HTMLElement} The radiator-control-card-editor configuration element
   */
  static getConfigElement() {
    return document.createElement("radiator-control-card-editor");
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
      name: "Radiator",
      climate_entity: "climate.radiator",
      sensor_entity: "sensor.temperature",
      select_entity: "input_select.radiator_mode",
      timer_entity: "timer.radiator_timer",
      temperature_thresholds: [
        { value: 22.5, color: "red" },
        { value: 18.0, color: "green" },
        { value: 0.0, color: "yellow" }
      ]
    };
  }

  /**
   * Detects state changes to start/stop dynamic active timer tracking intervals.
   * 
   * @param {Map<string, any>} changedProps - Changed properties map
   */
  updated(changedProps) {
    super.updated(changedProps);
    if (!this.hass || !this.config?.timer_entity) return;

    if (changedProps.has("hass")) {
      const stateObj = this.hass.states[this.config.timer_entity];
      if (stateObj && stateObj.state === "active") {
        this._startTimer();
      } else {
        this._stopTimer();
      }
    }
  }

  /**
   * Establishes a periodic interval loop to force dynamic renders every second for ticking active timers.
   * 
   * @private
   */
  _startTimer() {
    if (this._interval) return;
    this._interval = setInterval(() => this.requestUpdate(), 1000);
  }

  /**
   * Destroys ticking rendering interval timers when paused or inactive.
   * 
   * @private
   */
  _stopTimer() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  /**
   * LitElement lifecycle cleanups to avoid detached rendering memory leaks.
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopTimer();
  }

  /**
   * Increases or decreases the target temperature of the climate entity.
   * 
   * @param {number} amount - The degrees delta (e.g. +0.5 or -0.5)
   * @private
   */
  _adjustTemperature(amount) {
    if (!this.hass || !this.config?.climate_entity) return;
    const climateState = this.hass.states[this.config.climate_entity];
    if (!climateState) return;

    const currentTarget = parseFloat(climateState.attributes.temperature) || 21.0;
    const minTemp = parseFloat(climateState.attributes.min_temp) || 5.0;
    const maxTemp = parseFloat(climateState.attributes.max_temp) || 35.0;

    let newTemp = currentTarget + amount;
    newTemp = Math.max(minTemp, Math.min(maxTemp, newTemp));

    // Round to nearest 0.5
    newTemp = Math.round(newTemp * 2) / 2;

    this.hass.callService("climate", "set_temperature", {
      entity_id: this.config.climate_entity,
      temperature: newTemp
    });
  }

  /**
   * Triggers select_option service to update the input_select state.
   * 
   * @param {string} option - Option name
   * @private
   */
  _selectOption(option) {
    if (!this.hass || !this.config?.select_entity) return;
    this.hass.callService("input_select", "select_option", {
      entity_id: this.config.select_entity,
      option: option
    });
  }

  /**
   * Evaluates active actions configured on holds.
   * 
   * @param {string} option - Option name
   * @private
   */
  _handleHold(option) {
    if (!this.hass || !this.config) return;
    // Check if a hold action is configured for timers
    const timerStateObj = this.config.timer_entity ? this.hass.states[this.config.timer_entity] : null;
    if (timerStateObj && (option === 'Heating' || option === 'Dehumidify')) {
      if (this.config.timer_hold_action) {
        this._handleAction(this.config.timer_hold_action);
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
    
    if (action === 'call-service' || action === 'perform-action') {
      const { service, data, target, perform_action } = actionConfig;
      const svc = service || perform_action;
      const [domain, serviceName] = svc.split('.');
      this.hass.callService(domain, serviceName, data, target);
    } else if (action === 'navigate') {
      window.history.pushState(null, '', actionConfig.navigation_path);
      window.dispatchEvent(new Event('location-changed', { bubbles: true, composed: true }));
    } else if (action === 'url') {
      window.open(actionConfig.url_path);
    } else if (action === 'more-info') {
      const entityId = this.config.climate_entity;
      const event = new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId }
      });
      this.dispatchEvent(event);
    }
  }

  /**
   * Formats the remaining time of the timer entity.
   * 
   * @param {Object} timerState - State object of the timer entity
   * @private
   * @returns {string} Formatted duration string (hh:mm:ss)
   */
  _formatTimer(timerState) {
    if (!timerState) return "";
    if (timerState.state === "active" && timerState.attributes.finishes_at) {
      const left = Math.max(0, new Date(timerState.attributes.finishes_at) - Date.now());
      return new Date(left).toISOString().slice(11, 19);
    }
    return timerState.attributes.duration || "00:00:00";
  }

  /**
   * Renders the custom card's HTML template.
   * Generates header blocks, target temperature dials, mode rows, and timer status alerts.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this.config) return html``;

    const climateEntity = this.config.climate_entity;
    const climateState = climateEntity ? this.hass.states[climateEntity] : null;

    if (!climateState) {
      return this.renderError(this._localize('invalid_climate', { entity: climateEntity || 'None' }));
    }

    const sensorEntity = this.config.sensor_entity;
    const sensorState = sensorEntity ? this.hass.states[sensorEntity] : null;

    const selectEntity = this.config.select_entity;
    const selectState = selectEntity ? this.hass.states[selectEntity] : null;

    const timerEntity = this.config.timer_entity;
    const timerState = timerEntity ? this.hass.states[timerEntity] : null;

    // Check heating active state
    const isHeating = climateState.state === "heating" || 
                      climateState.state === "heat" || 
                      climateState.attributes.hvac_action === "heating";

    // Target Temperature Details
    const targetTemp = parseFloat(climateState.attributes.temperature) || 21.0;
    const formattedTarget = targetTemp.toFixed(1);

    // Current Room Temperature Threshold Styling
    let currentTempText = "--";
    let badgeColor = "var(--secondary-text-color)";
    
    if (sensorState) {
      const currentTemp = parseFloat(sensorState.state);
      if (!isNaN(currentTemp)) {
        currentTempText = `${currentTemp.toFixed(1)} °C`;
        const matchedColor = this._getMatchedProperty(currentTemp, this.config.temperature_thresholds, 'color');
        if (matchedColor) {
          badgeColor = matchedColor;
        }
      }
    } else if (climateState.attributes.current_temperature !== undefined) {
      const currentTemp = parseFloat(climateState.attributes.current_temperature);
      if (!isNaN(currentTemp)) {
        currentTempText = `${currentTemp.toFixed(1)} °C`;
        const matchedColor = this._getMatchedProperty(currentTemp, this.config.temperature_thresholds, 'color');
        if (matchedColor) {
          badgeColor = matchedColor;
        }
      }
    }

    // Modes Configuration
    const modes = [
      { name: "None", label: this._localize('none_mode'), icon: "mdi:power", color: "var(--disabled-text-color)", anim: "" },
      { name: "Heating", label: this._localize('heating_mode'), icon: "mdi:fire", color: "orange", anim: "pulse" },
      { name: "Fan", label: this._localize('fan_mode'), icon: "mdi:fan", color: "cyan", anim: "rotating" },
      { name: "Dehumidify", label: this._localize('dehumidify_mode'), icon: "mdi:water-percent", color: "blue", anim: "rotating" }
    ];

    const activeMode = selectState ? selectState.state : "None";
    const timerActive = timerState && timerState.state === "active";

    return html`
      ${this.renderStyle('radiator-control-card.css')}
      <ha-card>
        <!-- Header Info -->
        <div class="header-container">
          <div class="title-area" @click="${() => this._handleAction({ action: 'more-info' })}" style="cursor: pointer;">
            <ha-icon class="title-icon ${isHeating ? 'heating' : ''}" icon="mdi:radiator"></ha-icon>
            <span>${this.config.name || "Radiator"}</span>
          </div>
          <div class="temp-badge" style="color: ${badgeColor};">
            <ha-icon icon="mdi:thermometer"></ha-icon>
            <span>${currentTempText}</span>
          </div>
        </div>

        <!-- Target Controller -->
        <div class="target-controller">
          <button class="adjust-btn" @click="${() => this._adjustTemperature(-0.5)}">
            <ha-icon icon="mdi:minus"></ha-icon>
          </button>
          <div class="target-display">
            <span class="target-value">${formattedTarget}°</span>
            <span class="target-label">${this._localize('target_temp', { temp: formattedTarget }).split(' ')[0]}</span>
          </div>
          <button class="adjust-btn" @click="${() => this._adjustTemperature(0.5)}">
            <ha-icon icon="mdi:plus"></ha-icon>
          </button>
        </div>

        <!-- Mode Segmented Selector -->
        <div class="mode-selector">
          ${modes.map(mode => {
            const isActive = activeMode === mode.name;
            const style = isActive
              ? `background-color: ${mode.color}; color: white;`
              : ``;

            return html`
              <div class="mode-btn ${isActive ? 'active ' + mode.anim : ''}"
                   style="${style}"
                   @click="${() => this._selectOption(mode.name)}"
                   @contextmenu="${(e) => { e.preventDefault(); this._handleHold(mode.name); }}"
                   @touchstart="${() => this._holdTimer = setTimeout(() => this._handleHold(mode.name), 1000)}"
                   @touchend="${() => clearTimeout(this._holdTimer)}">
                <ha-icon .icon="${mode.icon}"></ha-icon>
                <span class="mode-label">${mode.label}</span>
              </div>
            `;
          })}
        </div>

        <!-- Timer Countdowns -->
        ${timerActive ? html`
          <div class="timer-container" @click="${(e) => {
            e.stopPropagation();
            this.hass.callService('timer', 'pause', { entity_id: timerEntity });
          }}" style="cursor: pointer;">
            <ha-icon icon="mdi:clock-outline"></ha-icon>
            <span>${this._localize('timer_label')}: ${this._formatTimer(timerState)}</span>
          </div>
        ` : ''}
      </ha-card>
    `;
  }

  /**
   * Sets the user configuration object for the card, updating fallback default settings.
   * 
   * @param {Object} config - The raw configuration schema from Lovelace dashboard
   */
  setConfig(config) {
    if (!config.climate_entity) {
      throw new Error("You must configure 'climate_entity'");
    }
    this.config = {
      name: "Radiator",
      temperature_thresholds: [],
      ...config
    };
  }
}

customElements.define("radiator-control-card", RadiatorControlCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "radiator-control-card",
  name: "Radiator Control Card",
  description: "A premium reusable climate radiator controller with built-in mode selectors and timer support.",
  preview: true
});
