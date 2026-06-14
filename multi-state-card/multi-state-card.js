import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.12';

class MultiPropertyCard extends HAControlBase {
  static get properties() {
    return { ...super.properties, config: {} };
  }

  get translationPath() { return "/local/ha-controls/multi-state-card/translations"; }
  get translationVersion() { return VERSION; }

  static getConfigElement() {
    return document.createElement("multi-state-card-editor");
  }

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

  _getFallbackIcon(domain, deviceClass) {
    const defaults = {
      battery: 'mdi:battery', temperature: 'mdi:thermometer', humidity: 'mdi:water-percent',
      light: 'mdi:lightbulb', switch: 'mdi:flash', binary_sensor: 'mdi:checkbox-marked-circle-outline'
    };
    return defaults[deviceClass] || defaults[domain] || 'mdi:circle-outline';
  }

  render() {
    if (!this.config?.entities || !this.hass) return html`<ha-alert alert-type="error">${this._localize('no_entities')}</ha-alert>`;

    const layoutClass = this.config.layout === 'column' ? 'layout-column' : 'layout-row';

    return html`
      <link rel="stylesheet" href="/local/ha-controls/multi-state-card/multi-state-card.css?v=${VERSION}">
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

  _runAction(item, actionType) {
    const actionConfig = actionType === 'hold' ? item.hold_action : item.tap_action;
    if (!actionConfig || actionConfig.action === "none") return;
    this.dispatchEvent(new CustomEvent("hass-action", {
      detail: { config: item, action: actionType },
      bubbles: true, composed: true,
    }));
  }

  setConfig(config) { 
    this.config = 
    { 
      show_icon: true,
      show_unavailable: false, // Hier auf false setzen
      ...config }; 
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
