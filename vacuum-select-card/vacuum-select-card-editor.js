const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

class VacuumSelectCardEditor extends LitElement {
  static get properties() {
    return { hass: { type: Object }, _config: { type: Object } };
  }

  setConfig(config) {
    this._config = {
      columns: 4,      // Default column count
      show_toggle: true, // Forces the editor switch to 'On' initially
      rooms: {},       // Ensure rooms object exists
      ...config
    };
  }

  _schema() {
    const vacuumId = this._config?.vacuum_entity;
    const vacuum = vacuumId ? this.hass.states[vacuumId] : null;
    const currentMap = vacuum?.attributes?.selected_map;
    const roomsData = vacuum?.attributes?.rooms?.[currentMap] || [];

    const baseSchema = [
      { name: "vacuum_entity", label: "Vacuum Entity", selector: { entity: { domain: "vacuum" } } },
      { name: "output_entity", label: "Selection Helper (Output)", selector: { entity: {} } },
      { name: "currently_cleaning_entity", label: "Currently Cleaning Entity", selector: { entity: {} } },
      { name: "readonly_entity", label: "Lock Entity", selector: { entity: { domain: "binary_sensor" } } },
      { 
        name: "", 
        type: "grid", 
        schema: [
          { name: "columns", label: "Columns", selector: { number: { min: 2, max: 6, mode: "slider" } } },
          { name: "show_toggle", label: "Show Toggle All Button", selector: { boolean: {} } }
        ] 
      },
      { 
        name: "", 
        type: "grid", 
        schema: [
          { name: "selection_color", label: "Active Color", selector: { text: {} } },
          { name: "selection_foreground", label: "Active Text Color", selector: { text: {} } }
        ] 
      }
    ];

    if (roomsData.length === 0) return baseSchema;

    const roomSchema = {
      name: "rooms",
      type: "grid",
      schema: roomsData.map(room => ({
        name: room.id.toString(),
        label: `Room: ${room.name}`,
        type: "expandable",
        schema: [
          { name: "label", label: "Custom Name", selector: { text: {} } },
          { name: "icon", label: "Custom Icon", selector: { icon: {} } },
          { 
            name: "animation", 
            label: "Animation Class", 
            selector: { 
              select: { 
                options: [
                  { value: "none", label: "None (Static)" },
                  { value: "spinning", label: "Spinning" },
                  { value: "pulsing", label: "Pulsing" },
                  { value: "flash", label: "Flashing" }
                ],
                custom_value: true,
                mode: "dropdown"
              } 
            } 
          },
          { name: "disabled", label: "Disable Room", selector: { boolean: {} } }
        ]
      }))
    };

    return [...baseSchema, roomSchema];
  }

  render() {
    if (!this.hass || !this._config) return html``;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema()}
        .computeLabel=${(s) => s.label || s.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  _valueChanged(ev) {
    const event = new CustomEvent("config-changed", {
      detail: { config: ev.detail.value },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

customElements.define("vacuum-select-card-editor", VacuumSelectCardEditor);
