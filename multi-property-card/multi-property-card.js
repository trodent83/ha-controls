import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.12';

class MultiPropertyCard extends HAControlBase {
  static get properties() {
    return { ...super.properties, config: {} };
  }

  get translationPath() { return "/local/ha-controls/multi-property-card/translations"; }
  get translationVersion() { return VERSION; }

  static getConfigElement() {
    return document.createElement("multi-property-card-editor");
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
      show_label: true,
      show_value: true,
      show_icon: true,
      layout: "row",
      entities: [
        {
          entity: "sun.sun",
          name: "Sun Status",
          thresholds: [
            { value: "above_horizon", color: "orange", animation: "blink" }
          ]
        }
      ]
    };
  }

  _getMatchedProperty(stateValue, thresholds, propertyName) {
    if (!thresholds || !Array.isArray(thresholds) || stateValue === undefined || stateValue === null) return null;
    const stringState = String(stateValue).toLowerCase();

    const exactMatch = thresholds.find(t => String(t.value).toLowerCase() === stringState);
    if (exactMatch && exactMatch[propertyName] !== undefined) return exactMatch[propertyName];

    const numericValue = parseFloat(stateValue);
    if (!isNaN(numericValue)) {
      const numericThresholds = thresholds
        .filter(t => !isNaN(parseFloat(t.value)) && t[propertyName] !== undefined)
        .sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
      
      const match = numericThresholds.find(t => numericValue >= parseFloat(t.value));
      if (match) return match[propertyName];
    }
    return null;
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
      <link rel="stylesheet" href="/local/ha-controls/multi-property-card/multi-property-card.css?v=${VERSION}">
      <ha-card>
        <div class="content-container ${layoutClass}">
      ${this.config.entities
        .filter(entConf => {
          const entityId = typeof entConf === 'string' ? entConf : entConf?.entity;
          
          if (!entityId) {
            if (typeof entConf === 'object' && entConf.condition) {
              try {
                const hass = this.hass;
                return eval(entConf.condition);
              } catch (e) {
                return false;
              }
            }
            return true;
          }

          const stateObj = this.hass?.states[entityId];
          if (!stateObj) return false;

          if (typeof entConf === 'object' && entConf.condition) {
            try {
              const hass = this.hass;
              const entity = stateObj;
              const state = stateObj.state;
              const attributes = stateObj.attributes;
              return eval(entConf.condition);
            } catch (e) {
              console.error("Error evaluating condition for", entityId, e);
              return false;
            }
          }

          const attr = typeof entConf === 'object' ? entConf.attribute : null;
          const val = attr ? stateObj.attributes[attr] : stateObj.state;

          // Diese Prüfung ist extrem gründlich:
          const isUnavailable = 
            val === undefined || 
            val === null || 
            String(val).toLowerCase() === 'unavailable' || 
            String(val).toLowerCase() === 'unknown' ||
            String(val).toLowerCase() === 'none'; // Manche Attribute geben 'none' zurück

          // Falls du show_unavailable in der Config auf true hast, wird der Filter ignoriert
          if (this.config.show_unavailable === true) return true;

          return !isUnavailable;
        })
        .map(entConf => {
          const entityId = typeof entConf === 'string' ? entConf : entConf.entity;
          const stateObj = entityId ? this.hass.states[entityId] : null;
          
          // 3. SECURE SPLIT: Ensure entityId is valid before splitting
          const domain = (entityId && entityId.includes('.')) ? entityId.split('.')[0] : 'unknown';
          
          let state;
          if (stateObj) {
            state = entConf.attribute ? stateObj?.attributes[entConf.attribute] : stateObj?.state;
          } else if (typeof entConf === 'object' && entConf.value !== undefined) {
            state = entConf.value;
          }
          const isUnavailable = entityId ? (!stateObj || state === 'unavailable' || state === 'unknown' || state === undefined || state === null) : false;
          const deviceClass = stateObj?.attributes?.device_class;

          const matchColor = this._getMatchedProperty(state, entConf.thresholds, 'color');
          const matchAnim = this._getMatchedProperty(state, entConf.thresholds, 'animation');
          const finalColor = isUnavailable ? 'var(--disabled-text-color)' : (matchColor !== null ? (matchColor || 'var(--primary-text-color)') : (entConf.color || 'var(--primary-text-color)'));
          const finalAnim = matchAnim !== null ? matchAnim : (entConf.animation || '');

          const icon = entConf.icon || stateObj?.attributes?.icon || this._getFallbackIcon(domain, deviceClass);
          const unit = entConf.unit !== undefined ? entConf.unit : stateObj?.attributes?.unit_of_measurement || '';

          let labelStyle = "";
          if (entConf.label_font_size) {
            const size = entConf.label_font_size;
            labelStyle += `font-size: ${isNaN(size) ? size : size + 'px'};`;
          }
          if (entConf.label_bold) labelStyle += `font-weight: bold;`;

          const showValue = entConf.show_value !== undefined ? entConf.show_value : this.config.show_value;
          const showLabel = entConf.show_label !== undefined ? entConf.show_label : this.config.show_label;
          const showIcon = entConf.show_icon !== undefined ? entConf.show_icon : this.config.show_icon;

          return html`
            <div class="btn ${isUnavailable ? 'is-unavailable' : ''}" 
                style="color: ${finalColor};" 
                @click="${() => this._runAction(entConf, 'tap')}"
                @contextmenu="${(e) => { e.preventDefault(); this._runAction(entConf, 'hold'); }}">
              
              ${showIcon !== false ? html`<ha-icon .icon="${icon}" class="${finalAnim}"></ha-icon>` : ''}

              <div class="info-container">
                ${showLabel ? html`
                  <div class="label" style="${labelStyle}">
                    ${entConf.name || stateObj?.attributes?.friendly_name || entityId || ''}
                  </div>
                ` : ''}
                ${showValue ? html`
                  <div class="value-container">
                      <span class="value-text">${state ?? (entityId ? this._localize('not_available') : '')}</span>
                      ${unit ? html`<span class="unit-text">${unit}</span>` : ''}
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
    if (!config.entities) {
      throw new Error("Please define entities");
    }
    this.config = {
      show_label: true,
      show_value: true,
      show_icon: true,
      show_unavailable: false,
      ...config
    };
  }
}

customElements.define("multi-property-card", MultiPropertyCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "multi-property-card",
  name: "Multi Property Card",
  description: "Displays multiple entities with their information and possible custom actions.",
  preview: true
});
