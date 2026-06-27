import { HAControlBase, html } from "../ha-control-base.js?v=0.6.8";

/**
 * Cache-busting version parameter for dynamic asset loading.
 * @type {string}
 */
const VERSION = "1.0.0";

/**
 * TimerCardFeature
 * A custom Lovelace card feature (for use in Tile cards or other features compatible templates)
 * that displays and manages a Home Assistant timer entity, updating its count dynamically.
 * 
 * @extends HAControlBase
 */
class TimerCardFeature extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Tracks config object and parent stateObj context.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return {
      ...super.properties,
      config: { state: true },
      stateObj: { attribute: false } // Provided by the parent card (e.g. Tile card)
    };
  }

  /**
   * Resolves the directory path hosting the translation localizations.
   * 
   * @type {string}
   */
  get translationPath() { return "/local/ha-controls/feature-renderer-card/translations"; }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() { return VERSION; }

  /**
   * Creates and returns the configuration editor element for this card feature.
   * 
   * @static
   * @returns {HTMLElement} The timer-card-feature-editor configuration element
   */
  static getConfigElement() {
    return document.createElement("timer-card-feature-editor");
  }

  /**
   * Returns default stub configuration details for this custom feature card.
   * 
   * @static
   * @returns {Object} Stub configuration details
   */
  static getStubConfig() {
    return {
      type: "custom:timer-card-feature"
    };
  }

  /**
   * Configures visual parameters on startup.
   * 
   * @param {Object} config - Raw feature config
   */
  setConfig(config) {
    this.config = config;
  }

  /**
   * Detects state changes to start/stop dynamic active timer tracking intervals.
   * 
   * @param {Map<string, any>} changedProps - Changed properties map
   */
  updated(changedProps) {
    super.updated(changedProps);
    if (!this.hass) return;

    const entityId = this.config?.entity || this.stateObj?.entity_id;
    if (!entityId) return;

    if (changedProps.has("hass") || changedProps.has("stateObj")) {
      const stateObj = this.hass.states[entityId];
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
   * Interactive click click toggles, initiating or pausing the timer entity.
   * 
   * @param {Event} e - Click event details
   * @private
   */
  _toggleTimer(e) {
    e.stopPropagation();
    const entityId = this.config?.entity || this.stateObj?.entity_id;
    if (!entityId || !this.hass) return;

    const stateObj = this.hass.states[entityId];
    if (!stateObj) return;

    if (stateObj.state === 'active') {
      this.hass.callService('timer', 'pause', { entity_id: entityId });
    } else if (stateObj.state === 'paused' || stateObj.state === 'idle') {
      this.hass.callService('timer', 'start', { entity_id: entityId });
    }
  }

  /**
   * Renders the timer visual display block layout.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this.config) return html``;

    // Card features naturally inherit the stateObj from their parent card (like Tile),
    // but we support overriding it via config.entity
    const entityId = this.config.entity || this.stateObj?.entity_id;
    if (!entityId || !entityId.startsWith('timer.')) return html`<div class="error">${this._localize('invalid_timer')}</div>`;

    const stateObj = this.hass.states[entityId];
    if (!stateObj) return html`<div class="error">${this._localize('entity_not_found')}</div>`;

    let displayLabel = stateObj.state;

    // Calculate the remaining time dynamically if active
    if (stateObj.state === "active" && stateObj.attributes.finishes_at) {
      const left = Math.max(0, new Date(stateObj.attributes.finishes_at) - Date.now());
      displayLabel = new Date(left).toISOString().slice(11, 19);
    } else if (stateObj.state === "idle" && stateObj.attributes.duration) {
      displayLabel = stateObj.attributes.duration;
    } else {
      // Fallback to localized formatting for 'paused', 'idle', etc.
      displayLabel = this.hass.formatEntityState
        ? this.hass.formatEntityState(stateObj)
        : stateObj.state;
    }

    return html`
      ${this.renderStyle('timer-card-feature.css')}
      <div class="label" @click="${this._toggleTimer}">${displayLabel}</div>
    `;
  }
}

customElements.define("timer-card-feature", TimerCardFeature);

window.customCardFeatures = window.customCardFeatures || [];
window.customCardFeatures.push({
  type: "custom:timer-card-feature",
  name: "Timer Display",
  supported: (domain) => domain === "timer",
  configurable: true,
  tags: ["multi-state-card", "multi-property-card", "room-status-card"],
});