/**
 * ROOM STATUS CARD EDITOR (2026 Edition)
 * Comprehensive UI configuration for sensors, thresholds, and theme colors.
 */

const LitElement = Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

// Define the comprehensive form schema
const SCHEMA = [
  { 
    name: "", 
    type: "grid", 
    schema: [
      { name: "name", label: "Room Name", selector: { text: {} } },
      { name: "icon", label: "Icon", selector: { icon: {} } },
    ]
  },
  {
    name: "sensors",
    type: "grid",
    column_min_width: "200px",
    schema: [
      { name: "temperature_sensor", label: "Temperature Entity", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
      { name: "humidity_sensor", label: "Humidity Entity", selector: { entity: { domain: "sensor", device_class: "humidity" } } },
    ],
  },
 {
    name: "header_settings",
    label: "Header Settings",
    type: "grid",
    schema: [
      { name: "show_header", label: "Display Room Name", selector: { boolean: {} } },
      { name: "show_icon", label: "Display Icon", selector: { boolean: {} } },
    ]
  },  
  // SECTION: Threshold Logic
  {
    name: "thresholds",
    label: "Status Thresholds",
    type: "expandable",
    schema: [
      {
        name: "temp_limits",
        type: "grid",
        label: "Temperature Settings",
        column_min_width: "100%", // Forces one item per line
        label: "Temperature Limits (°C)",
        schema: [
          { name: "temperature_minimum_ideal", label: "Minimum Ideal", selector: { number: { mode: "box", step: 0.5 } } },
          { name: "temperature_maximum_ideal", label: "Maximum Ideal", selector: { number: { mode: "box", step: 0.5 } } },
          { name: "temperature_minimum_warning", label: "Minimum Warning", selector: { number: { mode: "box", step: 0.5 } } },
          { name: "temperature_maximum_warning", label: "Maximum Warning", selector: { number: { mode: "box", step: 0.5 } } },
        ]
      },
      {
        name: "hum_limits",
        type: "grid",
        label: "Humidity Settings",
        column_min_width: "100%", // Forces one item per line
        label: "Humidity Limits (%)",
        schema: [
          { name: "humidity_minimum_ideal", label: "Minimum Ideal %", selector: { number: { mode: "box", min: 0, max: 100, step: 1 } } },
          { name: "humidity_maximum_ideal", label: "Maximum Ideal %", selector: { number: { mode: "box", min: 0, max: 100, step: 1 } } },
          { name: "humidity_minimum_warning", label: "Minimum Warning %", selector: { number: { mode: "box", min: 0, max: 100, step: 1 } } },
          { name: "humidity_maximum_warning", label: "Maximum Warning %", selector: { number: { mode: "box", min: 0, max: 100, step: 1 } } },
        ]
      }
    ]
  },

  // SECTION: Custom Colors
  {
    name: "colors",
    label: "Status Colors",
    type: "expandable",
    schema: [
      { name: "color_ideal", label: "Ideal Color", selector: { ui_color: {} } },
      { name: "color_warning", label: "Warning Color", selector: { ui_color: {} } },
      { name: "color_critical", label: "Critical Color", selector: { ui_color: {} } },
    ]
  }
];

class RoomStatusCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
    };
  }

  setConfig(config) {
    this._config = {
      ...config,
      header_settings: {
        show_header: config.header_settings?.show_header !== false,
        show_icon: config.header_settings?.show_icon !== false,
      }
    };
  }
  _valueChanged(ev) {
    const config = ev.detail.value;
    
    // Ensure nested objects exist to prevent card logic errors
    if (!config.thresholds) config.thresholds = {};
    if (!config.colors) config.colors = {};

    const event = new CustomEvent("config-changed", {
      detail: { config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  render() {
    if (!this.hass || !this._config) return html``;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${(schema) => schema.label}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

customElements.define("room-status-card-editor", RoomStatusCardEditor);
