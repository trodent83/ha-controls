import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

const VERSION = "1.0.0";

class TimerCardFeature extends HAControlBase {
  static get properties() {
    return {
      ...super.properties,
      config: { state: true },
      stateObj: { attribute: false } // Provided by the parent card (e.g. Tile card)
    };
  }

  static getConfigElement() {
    return document.createElement("timer-card-feature-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:timer-card-feature"
    };
  }

  setConfig(config) {
    this.config = config;
  }

  // Hook up to state changes to start/stop the GUI interval
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

  // Play or pause the timer based on its current state
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

  render() {
    if (!this.hass || !this.config) return html``;
    
    // Card features naturally inherit the stateObj from their parent card (like Tile),
    // but we support overriding it via config.entity
    const entityId = this.config.entity || this.stateObj?.entity_id;
    if (!entityId || !entityId.startsWith('timer.')) return html`<div class="error">Invalid timer entity</div>`;

    const stateObj = this.hass.states[entityId];
    if (!stateObj) return html`<div class="error">Entity not found</div>`;

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
      <link rel="stylesheet" href="/local/ha-controls/universal-select-card/timer-card-feature.css?v=${VERSION}">
      <div class="timer-label" @click="${this._toggleTimer}">${displayLabel}</div>
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
});