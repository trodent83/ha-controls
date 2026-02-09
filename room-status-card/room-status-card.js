//Nessesary Control initialization
const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

class RoomStatusCard extends LitElement {
  static get properties() {
    return { hass: {}, config: {} };
  }

  //Returns the editor for this control
  static getConfigElement() {
    return document.createElement("room-status-card-editor");
  }

  //Returns the default settings
  static getStubConfig() {
    return {
      name: "My Room",
      icon: "mdi:home",
      show_header: true
    };
  }

  //Renders the control
  render() {
    if (!this.hass || !this.config) return html``;

    const header_settings = this.config.header_settings || {};
    const show_header = header_settings.show_header !== false; // Default true
    const show_icon = header_settings.show_icon !== false;     // Default true

    const sensors = this.config.sensors;
    const thresholds = this.config.thresholds;
    const colors = this.config.colors;
    
    const get_status_color = (current_value, sensor_type) => {
      if (!thresholds || !colors) return 'var(--primary-text-color)';
      
      const limits = sensor_type === 'temp' ? thresholds.temp_limits : thresholds.hum_limits;
      if (!limits) return 'var(--primary-text-color)';

      const numeric_value = parseFloat(current_value);
      const key_prefix = sensor_type === 'temp' ? 'temperature' : 'humidity';
      
      const min_ideal = limits[`${key_prefix}_minimum_ideal`];
      const max_ideal = limits[`${key_prefix}_maximum_ideal`];
      const min_warning = limits[`${key_prefix}_minimum_warning`];
      const max_warning = limits[`${key_prefix}_maximum_warning`];

      if (numeric_value >= min_ideal && numeric_value <= max_ideal) {
        return colors.color_ideal || 'var(--success-color)';
      }
      if (numeric_value < min_warning || numeric_value > max_warning) {
        return colors.color_critical || 'var(--error-color)';
      }
      return colors.color_warning || 'var(--warning-color)';
    };

    const temperature_entity = sensors?.temperature_sensor;
    const humidity_entity = sensors?.humidity_sensor;
    
    const temperature_state = temperature_entity ? this.hass.states[temperature_entity] : null;
    const humidity_state = humidity_entity ? this.hass.states[humidity_entity] : null;

    return html`
      <link rel="stylesheet" href="/local/ha-controls/room-status-card/room-status-card.css?v=1.0.5">
      <ha-card>
        <div class="header_container">
        ${show_icon ? html`<ha-icon .icon="${this.config.icon || 'mdi:home'}"></ha-icon>` : ''}
        ${show_header ? html`<span class="room_title">${this.config.name}</span>` : ''}
        </div>
        <div class="status_badges">
          ${temperature_state ? html`
            <div class="status_badge" style="color: ${get_status_color(temperature_state.state, 'temp')}">
              ${temperature_state.state}${temperature_state.attributes.unit_of_measurement || '°C'}
            </div>
          ` : ''}
          ${humidity_state ? html`
            <div class="status_badge" style="color: ${get_status_color(humidity_state.state, 'hum')}">
              ${humidity_state.state}${humidity_state.attributes.unit_of_measurement || '%'}
            </div>
          ` : ''}
        </div>
      </ha-card>
    `;
  }

  setConfig(config) {
    this.config = config;
  }
}

customElements.define("room-status-card", RoomStatusCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "room-status-card",
  name: "Room Status Card",
  description: "A 2026 styled room status badge card",
  preview: true,
});