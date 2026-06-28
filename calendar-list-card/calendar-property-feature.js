import { HAControlBase, html } from "../ha-control-base.js?v=0.6.8";

/**
 * Cache-busting version parameter for dynamic asset loading.
 * @type {string}
 */
const VERSION = "1.0.0";

/**
 * CalendarPropertyFeature
 * A custom Lovelace card feature specifically designed for the Calendar List Card.
 * Renders a specific property (location, description, time, attendees, calendar source) of a calendar event.
 * 
 * @extends HAControlBase
 */
class CalendarPropertyFeature extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return {
      hass: { attribute: false },
      config: { state: true },
      stateObj: { attribute: false },
      event: { attribute: false },
      color: { state: true }
    };
  }

  /**
   * Resolves the directory path hosting the translation localizations.
   * Uses the calendar-list-card translations directory.
   * 
   * @type {string}
   */
  get translationPath() { return "/local/ha-controls/calendar-list-card/translations"; }

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
   * @returns {HTMLElement} The calendar-property-feature-editor configuration element
   */
  static getConfigElement() {
    return document.createElement("calendar-property-feature-editor");
  }

  /**
   * Returns default stub configuration details for this custom feature card.
   * 
   * @static
   * @returns {Object} Stub configuration details
   */
  static getStubConfig() {
    return {
      type: "custom:calendar-property-feature",
      property: "location",
      show_icon: true,
      icon: "",
      icon_color: "",
      color: "",
      font_size: "12px",
      font_weight: "normal",
      text_align: "left",
      prefix: "",
      suffix: ""
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
   * Returns default icon for a given property type.
   * 
   * @param {string} property - The property key
   * @returns {string} Default mdi icon string
   * @private
   */
  _getDefaultIcon(property) {
    switch (property) {
      case "location": return "mdi:map-marker";
      case "description": return "mdi:text";
      case "time": return "mdi:clock-outline";
      case "summary": return "mdi:calendar-star";
      case "attendees": return "mdi:account-multiple";
      case "calendar_name": return "mdi:calendar";
      case "date": return "mdi:calendar-range";
      default: return "mdi:information-outline";
    }
  }

  /**
   * Resolves the property value to render, checking if real event data is present.
   * Falls back to mock strings if in preview/editor mode.
   * 
   * @returns {string} Value to display
   * @private
   */
  _resolvePropertyValue() {
    const prop = this.config?.property || "location";
    const locale = this.hass?.locale || { language: "en" };

    if (!this.event) {
      // Mock data fallbacks for card preview in the dashboard editor
      switch (prop) {
        case "location": return "123 Main St, New York";
        case "description": return "This is a sample event description.";
        case "time": return "10:00 AM - 11:30 AM";
        case "summary": return "Meeting with Team";
        case "attendees": return "John Doe, Jane Smith";
        case "calendar_name": return "Personal Calendar";
        case "date": return "Saturday, June 20, 2026";
        default: return "";
      }
    }

    const event = this.event;
    const origin = event.originEvent || {};

    switch (prop) {
      case "summary":
        return event.summary || "";
      
      case "location":
        return origin.location || "";
      
      case "description":
        return origin.description || "";
      
      case "calendar_name": {
        const entityId = event.entity_id;
        const state = this.hass.states[entityId];
        return state?.attributes?.friendly_name || entityId || "";
      }

      case "attendees": {
        const attendees = origin.attendees;
        if (!attendees || !Array.isArray(attendees)) return "";
        return attendees.map(a => a.displayName || a.email || "").filter(Boolean).join(", ");
      }

      case "date": {
        return event.start ? event.start.toLocaleDateString(locale.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "";
      }

      case "time": {
        if (event.isAllDay) {
          return this._localize("all_day") || "All day";
        }
        if (!event.start || !event.end) return "";
        
        const startStr = event.start.toLocaleTimeString(locale.language, { hour: '2-digit', minute: '2-digit' });
        const endStr = event.end.toLocaleTimeString(locale.language, { hour: '2-digit', minute: '2-digit' });
        
        // If it ends on a different day, display that day too
        if (event.start.toDateString() !== event.end.toDateString()) {
          const endDateStr = event.end.toLocaleDateString(locale.language, { month: 'short', day: 'numeric' });
          return `${startStr} - ${endDateStr}, ${endStr}`;
        }
        return `${startStr} - ${endStr}`;
      }

      default:
        return "";
    }
  }

  /**
   * Renders the calendar property visual block.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this.config) return html``;

    const displayValue = this._resolvePropertyValue();
    // Do not render anything if the value is empty
    if (!displayValue) return html``;

    const prop = this.config.property || "location";
    const showIcon = this.config.show_icon !== false;
    const iconName = this.config.icon || this._getDefaultIcon(prop);

    const featureColor = this.config.color || this.color || 'var(--secondary-text-color)';
    const iconColor = this.config.icon_color || featureColor;

    const style = `
      color: ${featureColor};
      font-size: ${this.config.font_size || 'inherit'};
      font-weight: ${this.config.font_weight || 'normal'};
      text-align: ${this.config.text_align || 'left'};
    `;

    const iconStyle = `color: ${iconColor};`;
    const prefix = this.config.prefix || '';
    const suffix = this.config.suffix || '';

    return html`
      ${this.renderStyle('calendar-property-feature.css')}
      <div class="calendar-property-container" style="${style}">
        ${showIcon && iconName ? html`<ha-icon icon="${iconName}" class="property-icon" style="${iconStyle}"></ha-icon>` : ''}
        <span class="property-value">${prefix}${displayValue}${suffix}</span>
      </div>
    `;
  }
}

if (!customElements.get("calendar-property-feature")) {
  customElements.define("calendar-property-feature", CalendarPropertyFeature);
}

window.customCardFeatures = window.customCardFeatures || [];
window.customCardFeatures.push({
  type: "custom:calendar-property-feature",
  name: "Calendar Property Display",
  configurable: true,
  tags: ["calendar-list-card"],
});
