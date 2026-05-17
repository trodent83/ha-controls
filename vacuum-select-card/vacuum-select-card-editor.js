import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.1';

class VacuumSelectCardEditor extends HAControlBase {
  static get properties() {
    return { ...super.properties, _config: { type: Object } };
  }

  get translationPath() { return "/local/ha-controls/vacuum-select-card/translations"; }
  get translationVersion() { return VERSION; }

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
      { name: "vacuum_entity", label: this._localize('vacuum_entity'), selector: { entity: { domain: "vacuum" } } },
      { name: "output_entity", label: this._localize('selection_helper'), selector: { entity: {} } },
      { name: "currently_cleaning_entity", label: this._localize('currently_cleaning'), selector: { entity: {} } },
      { name: "readonly_entity", label: this._localize('lock_entity'), selector: { entity: { domain: "binary_sensor" } } },
      { name: "mark_active_room", label: this._localize('display_active_room'), selector: { entity: { domain: "binary_sensor" } } },
      { 
        name: "mark_animation", 
        label: this._localize('animation_selected_room'), 
        selector: { 
          select: { 
            options: [
              { value: "none", label: this._localize('none_static') },
              { value: "spinning", label: this._localize('spinning') },
              { value: "pulsing", label: this._localize('pulsing') },
              { value: "flash", label: this._localize('flashing') },
              { value: "bouncing", label: this._localize('bouncing') },
              { value: "shaking", label: this._localize('shaking') },
              { value: "floating", label: this._localize('floating') },
              { value: "spin-slow", label: this._localize('slow_spin') }
            ],
            mode: "list"
          } 
        } 
      },
      { 
        name: "", 
        type: "grid", 
        schema: [
          { name: "mark_animation_background", label: this._localize('animation_bg_color'), selector: { text: {} } },
          { name: "mark_animation_foreground", label: this._localize('animation_fg_color'), selector: { text: {} } }
        ] 
      },
      { 
        name: "", 
        type: "grid", 
        schema: [
          { name: "columns", label: this._localize('columns'), selector: { number: { min: 2, max: 6, mode: "slider" } } },
          { name: "show_toggle", label: this._localize('show_toggle_all'), selector: { boolean: {} } }
        ] 
      },
      { 
        name: "", 
        type: "grid", 
        schema: [
          { name: "selection_color", label: this._localize('active_color'), selector: { text: {} } },
          { name: "selection_foreground", label: this._localize('active_text_color'), selector: { text: {} } }
        ] 
      }
    ];

    if (roomsData.length === 0) return baseSchema;

    const roomSchema = {
      name: "rooms",
      type: "grid",
      schema: roomsData.map(room => ({
        name: room.id.toString(),
        label: this._localize('room', { name: room.name }),
        type: "expandable",
        schema: [
          { name: "label", label: this._localize('custom_name'), selector: { text: {} } },
          { name: "icon", label: this._localize('custom_icon'), selector: { icon: {} } },
          { 
            name: "animation", 
            label: this._localize('animation_class'), 
            selector: { 
              select: { 
                options: [
                    { value: "none", label: this._localize('none_static') },
                    { value: "spinning", label: this._localize('spinning') },
                    { value: "pulsing", label: this._localize('pulsing') },
                    { value: "flash", label: this._localize('flashing') },
                    { value: "bounce", label: this._localize('bouncing') },
                    { value: "shake", label: this._localize('shaking') },
                    { value: "float", label: this._localize('floating') },
                    { value: "spin-slow", label: this._localize('slow_spin') }
                  ],
                mode: "list"
              } 
            } 
          },
          { name: "disabled", label: this._localize('disable_room'), selector: { boolean: {} } }
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
