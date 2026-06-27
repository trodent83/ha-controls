import { HAControlBase, html } from "../ha-control-base.js?v=0.6.8";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.0';

/**
 * VacuumMapCardEditor
 * Visual configuration editor for VacuumMapCard.
 * Leverages Home Assistant's custom `<ha-form>` to generate a rich UI configuration form.
 * 
 * @extends HAControlBase
 */
class VacuumMapCardEditor extends HAControlBase {
  /**
   * Defines the reactive properties tracked by LitElement.
   * Inherits properties from HAControlBase, tracks the editor config copy and active tab selection state.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return { 
      ...super.properties, 
      _config: { type: Object },
      _activeTab: { type: String },
      _expandedRoomId: { type: String },
      _newRoomId: { type: String },
      _newRoomLabel: { type: String }
    };
  }

  /**
   * Initializes the VacuumMapCardEditor component instance,
   * setting default active tab to 'general'.
   */
  constructor() {
    super();
    this._activeTab = 'general';
    this._expandedRoomId = null;
    this._newRoomId = '';
    this._newRoomLabel = '';
  }

  /**
   * Resolves the directory path hosting the translation localizations.
   * 
   * @type {string}
   */
  get translationPath() { return "/local/ha-controls/vacuum-map-card/translations"; }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() { return VERSION; }

  /**
   * Receives the configuration object from Home Assistant Lovelace dashboard,
   * setting default parameters for the editor form controls.
   * 
   * @param {Object} config - The raw configuration schema from Lovelace dashboard
   */
  setConfig(config) {
    this._config = {
      map_height: 350,   // Default map height
      show_toggle: true, // Forces the editor switch to 'On' initially
      sort_by_sequence: true, // Sort rooms by sequence by default
      show_names: true, // Default to true
      rooms: {},       // Ensure rooms object exists
      ...config
    };

    const knownKeys = [
      "vacuum_entity",
      "output_entity",
      "currently_cleaning_entity",
      "readonly_entity",
      "mark_active_room",
      "mark_animation",
      "mark_animation_background",
      "mark_animation_foreground",
      "map_height",
      "show_toggle",
      "show_names",
      "sort_by_sequence",
      "selection_color",
      "selection_foreground",
      "rooms"
    ];
    this._unrecognizedKeys = this._validateConfigKeys(config, knownKeys);
  }

  /**
   * Dynamically constructs the visual form schema for general settings.
   * 
   * @private
   * @returns {Array<Object>} Array of form fields definition objects for ha-form
   */
  _baseSchema() {
    return [
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
        name: "map_height", 
        label: this._localize('map_height'), 
        selector: { number: { min: 150, max: 600, step: 10, mode: "slider" } } 
      },
      { 
        name: "", 
        type: "grid", 
        schema: [
          { name: "show_toggle", label: this._localize('show_toggle_all'), selector: { boolean: {} } },
          { name: "show_names", label: this._localize('show_names'), selector: { boolean: {} } },
          { name: "sort_by_sequence", label: this._localize('sort_by_sequence'), selector: { boolean: {} } }
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
  }

  /**
   * Dynamically constructs the visual form schema for rooms settings.
   * Includes coordinates (x, y), sizes (w, h), and color fields.
   * 
   * @private
   * @returns {Array<Object>} Array of form fields definition objects for ha-form
   */
  _roomsSchema() {
    const vacuumId = this._config?.vacuum_entity;
    const vacuum = vacuumId ? this.hass.states[vacuumId] : null;
    const currentMap = vacuum?.attributes?.selected_map;
    const roomsData = vacuum?.attributes?.rooms?.[currentMap] || [];

    if (roomsData.length === 0) return [];

    return [
      {
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
              name: "", 
              type: "grid", 
              schema: [
                { name: "x", label: this._localize('coord_x'), selector: { number: { min: 0, max: 100, mode: "box" } } },
                { name: "y", label: this._localize('coord_y'), selector: { number: { min: 0, max: 100, mode: "box" } } }
              ] 
            },
            { 
              name: "", 
              type: "grid", 
              schema: [
                { name: "w", label: this._localize('width'), selector: { number: { min: 1, max: 100, mode: "box" } } },
                { name: "h", label: this._localize('height'), selector: { number: { min: 1, max: 100, mode: "box" } } }
              ] 
            },
            { name: "color", label: this._localize('color'), selector: { text: {} } },
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
      }
    ];
  }

  /**
   * Fires the config-changed event to propagate edits up to Lovelace.
   * 
   * @private
   */
  _fireConfigChanged() {
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  /**
   * Cleans the active configuration of any unrecognized properties.
   * Keeps only vacuum select card schema fields.
   * 
   * @private
   */
  _cleanConfig() {
    if (!this._config) return;
    const cleaned = {
      type: this._config.type
    };
    const addIfDiff = (key, defaultVal) => {
      const val = this._config[key];
      if (val !== undefined && val !== null && String(val) !== String(defaultVal)) {
        cleaned[key] = val;
      }
    };
    if (this._config.vacuum_entity !== undefined) cleaned.vacuum_entity = this._config.vacuum_entity;
    if (this._config.output_entity !== undefined) cleaned.output_entity = this._config.output_entity;
    if (this._config.currently_cleaning_entity !== undefined) cleaned.currently_cleaning_entity = this._config.currently_cleaning_entity;
    if (this._config.readonly_entity !== undefined) cleaned.readonly_entity = this._config.readonly_entity;
    if (this._config.mark_active_room !== undefined) cleaned.mark_active_room = this._config.mark_active_room;
    if (this._config.mark_animation !== undefined) cleaned.mark_animation = this._config.mark_animation;
    if (this._config.mark_animation_background !== undefined) cleaned.mark_animation_background = this._config.mark_animation_background;
    if (this._config.mark_animation_foreground !== undefined) cleaned.mark_animation_foreground = this._config.mark_animation_foreground;
    addIfDiff("map_height", 350);
    addIfDiff("show_toggle", true);
    addIfDiff("show_names", true);
    addIfDiff("sort_by_sequence", true);
    if (this._config.selection_color !== undefined) cleaned.selection_color = this._config.selection_color;
    if (this._config.selection_foreground !== undefined) cleaned.selection_foreground = this._config.selection_foreground;
    
    if (this._config.rooms && typeof this._config.rooms === 'object') {
      cleaned.rooms = {};
      for (const [roomId, roomConf] of Object.entries(this._config.rooms)) {
        const r = {};
        if (roomConf.label !== undefined) r.label = roomConf.label;
        if (roomConf.icon !== undefined) r.icon = roomConf.icon;
        if (roomConf.x !== undefined) r.x = roomConf.x;
        if (roomConf.y !== undefined) r.y = roomConf.y;
        if (roomConf.w !== undefined) r.w = roomConf.w;
        if (roomConf.h !== undefined) r.h = roomConf.h;
        if (roomConf.color !== undefined) r.color = roomConf.color;
        if (roomConf.animation !== undefined) r.animation = roomConf.animation;
        if (roomConf.disabled !== undefined) r.disabled = roomConf.disabled;
        
        if (Object.keys(r).length > 0) {
          cleaned.rooms[roomId] = r;
        }
      }
    }
    
    this._config = cleaned;
    this._fireConfigChanged();
  }

  connectedCallback() {
    super.connectedCallback();
    this._handleRoomLayoutChangedBound = this._handleRoomLayoutChanged.bind(this);
    window.addEventListener('room-layout-changed', this._handleRoomLayoutChangedBound);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._handleRoomLayoutChangedBound) {
      window.removeEventListener('room-layout-changed', this._handleRoomLayoutChangedBound);
    }
  }

  _handleRoomLayoutChanged(ev) {
    const { roomId, x, y, w, h, deleted } = ev.detail;
    if (!this._config) return;
    
    const rooms = { ...(this._config.rooms || {}) };
    
    if (deleted) {
      delete rooms[roomId];
    } else {
      const current = rooms[roomId] || {};
      rooms[roomId] = {
        ...current,
        ...(x !== undefined ? { x } : {}),
        ...(y !== undefined ? { y } : {}),
        ...(w !== undefined ? { w } : {}),
        ...(h !== undefined ? { h } : {})
      };
    }
    
    this._config = {
      ...this._config,
      rooms
    };
    
    this._fireConfigChanged();
  }

  _toggleEditMode(e) {
    this._config = {
      ...this._config,
      edit_mode: e.target.checked
    };
    this._fireConfigChanged();
  }

  _addCustomRoom() {
    const id = this._newRoomId?.trim();
    const label = this._newRoomLabel?.trim();
    
    if (!id || isNaN(id)) {
      alert("Please enter a valid numeric Room ID.");
      return;
    }
    
    const roomId = parseFloat(id);
    const rooms = { ...(this._config.rooms || {}) };
    
    if (rooms[roomId]) {
      alert(`Room ID ${roomId} is already configured.`);
      return;
    }
    
    rooms[roomId] = {
      label: label || `Room ${roomId}`,
      icon: "mdi:door",
      x: 10,
      y: 10,
      w: 15,
      h: 15,
      color: "#666666"
    };
    
    this._config = {
      ...this._config,
      rooms
    };
    
    this._newRoomId = '';
    this._newRoomLabel = '';
    this._expandedRoomId = roomId.toString();
    this._fireConfigChanged();
  }

  _toggleExpandRoom(id) {
    this._expandedRoomId = this._expandedRoomId === id ? null : id;
  }

  _updateRoomProp(id, prop, value) {
    if (!this._config) return;
    const rooms = { ...(this._config.rooms || {}) };
    const current = rooms[id] || {};
    
    let val = value;
    if (prop === 'x' || prop === 'y' || prop === 'w' || prop === 'h') {
      if (isNaN(val)) val = 0;
      val = Math.max(0, Math.min(100, val));
    }
    
    rooms[id] = {
      ...current,
      [prop]: val
    };
    
    this._config = {
      ...this._config,
      rooms
    };
    this._fireConfigChanged();
  }

  _deleteRoom(e, id) {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to delete Room ${id}?`)) return;
    
    const rooms = { ...(this._config.rooms || {}) };
    delete rooms[id];
    
    this._config = {
      ...this._config,
      rooms
    };
    
    if (this._expandedRoomId === id) {
      this._expandedRoomId = null;
    }
    this._fireConfigChanged();
  }

  /**
   * Resets the active configuration back to standard stub values.
   * 
   * @private
   */
  _resetConfig() {
    this._config = {
      type: this._config?.type || "custom:vacuum-map-card",
      vacuum_entity: "",
      rooms: {}
    };
    this._fireConfigChanged();
  }

  /**
   * Renders the editor configuration form.
   * Renders a blank screen if hass or _config are not yet loaded.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this._config) return html``;

    return html`
      ${this.renderStyle('vacuum-map-card-editor.css')}
      ${this.renderConfigValidationWarning()}
      
      <div class="ha-tabs">
        <div 
          class="ha-tab ${this._activeTab === 'general' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'general'; }}
        >
          ${this._localize('general') || 'General'}
        </div>
        <div 
          class="ha-tab ${this._activeTab === 'rooms' ? 'active' : ''}" 
          @click=${() => { this._activeTab = 'rooms'; }}
        >
          ${this._localize('rooms') || 'Rooms'}
        </div>
      </div>

      ${this._activeTab === 'general' ? html`
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${this._baseSchema()}
          .computeLabel=${(s) => s.label || s.name}
          @value-changed=${this._valueChanged}
        ></ha-form>
      ` : html`
        <div class="rooms-editor-container">
          <!-- Toggle Edit/Placement Mode -->
          <div class="input-row" style="margin-bottom: 8px;">
            <ha-formfield label="Interactive Placement Mode (Drag & Resize on Map)">
              <ha-switch
                .checked=${this._config.edit_mode === true}
                @change=${(e) => this._toggleEditMode(e)}
              ></ha-switch>
            </ha-formfield>
          </div>

          <!-- Add Room Form -->
          <div class="add-room-card">
            <div class="editor-section-title" style="margin-top: 0px;">Add New Custom Room</div>
            <div class="input-row">
              <ha-textfield
                label="Room ID (number)"
                type="number"
                .value=${this._newRoomId || ''}
                @input=${(e) => { this._newRoomId = e.target.value; }}
              ></ha-textfield>
              <ha-textfield
                label="Room Name"
                .value=${this._newRoomLabel || ''}
                @input=${(e) => { this._newRoomLabel = e.target.value; }}
              ></ha-textfield>
            </div>
            <ha-button @click=${this._addCustomRoom} outlined style="align-self: flex-end;">
              <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
              Add Room
            </ha-button>
          </div>

          <!-- Configured Rooms List -->
          <div class="editor-section-title">Configured Rooms (${Object.keys(this._config.rooms || {}).length})</div>
          <div class="rooms-list">
            ${Object.entries(this._config.rooms || {}).map(([id, room]) => {
              const isExpanded = this._expandedRoomId === id;
              return html`
                <div class="room-card">
                  <div class="room-card-header" @click=${() => this._toggleExpandRoom(id)}>
                    <div class="room-card-header-title">
                      <ha-icon .icon=${room.icon || 'mdi:door'}></ha-icon>
                      <span>${room.label || `Room ${id}`} (ID: ${id})</span>
                    </div>
                    <div class="room-card-header-actions">
                      <ha-icon .icon=${isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}></ha-icon>
                    </div>
                  </div>
                  
                  ${isExpanded ? html`
                    <div class="room-card-body">
                      <div class="input-row">
                        <ha-textfield
                          label="Label / Name"
                          .value=${room.label || ''}
                          @change=${(e) => this._updateRoomProp(id, 'label', e.target.value)}
                        ></ha-textfield>
                        <ha-textfield
                          label="Icon"
                          .value=${room.icon || ''}
                          @change=${(e) => this._updateRoomProp(id, 'icon', e.target.value)}
                        ></ha-textfield>
                      </div>
                      
                      <div class="input-row">
                        <ha-textfield
                          label="Color (Hex / CSS)"
                          .value=${room.color || ''}
                          @change=${(e) => this._updateRoomProp(id, 'color', e.target.value)}
                        ></ha-textfield>
                        <ha-textfield
                          label="Active Animation"
                          .value=${room.animation || 'none'}
                          @change=${(e) => this._updateRoomProp(id, 'animation', e.target.value)}
                        ></ha-textfield>
                      </div>

                      <div class="coordinates-grid">
                        <ha-textfield
                          label="X (%)"
                          type="number"
                          .value=${room.x !== undefined ? room.x : 0}
                          @change=${(e) => this._updateRoomProp(id, 'x', parseFloat(e.target.value))}
                        ></ha-textfield>
                        <ha-textfield
                          label="Y (%)"
                          type="number"
                          .value=${room.y !== undefined ? room.y : 0}
                          @change=${(e) => this._updateRoomProp(id, 'y', parseFloat(e.target.value))}
                        ></ha-textfield>
                        <ha-textfield
                          label="W (%)"
                          type="number"
                          .value=${room.w !== undefined ? room.w : 15}
                          @change=${(e) => this._updateRoomProp(id, 'w', parseFloat(e.target.value))}
                        ></ha-textfield>
                        <ha-textfield
                          label="H (%)"
                          type="number"
                          .value=${room.h !== undefined ? room.h : 15}
                          @change=${(e) => this._updateRoomProp(id, 'h', parseFloat(e.target.value))}
                        ></ha-textfield>
                      </div>

                      <div class="input-row" style="justify-content: space-between; margin-top: 8px;">
                        <ha-formfield label="Disable Room">
                          <ha-switch
                            .checked=${room.disabled === true}
                            @change=${(e) => this._updateRoomProp(id, 'disabled', e.target.checked)}
                          ></ha-switch>
                        </ha-formfield>
                        
                        <ha-button @click=${(e) => this._deleteRoom(e, id)} class="danger-button" outlined>
                          <ha-icon icon="mdi:trash-can-outline" slot="icon"></ha-icon>
                          Delete Room
                        </ha-button>
                      </div>
                    </div>
                  ` : ''}
                </div>
              `;
            })}
          </div>
        </div>
      `}

      <div class="editor-actions">
        <ha-button @click=${this._cleanConfig} outlined>
          <ha-icon icon="mdi:broom" slot="icon"></ha-icon>
          ${this._localize('clean') || 'Clean'}
        </ha-button>
        <ha-button @click=${this._resetConfig} outlined class="warning">
          <ha-icon icon="mdi:restore" slot="icon"></ha-icon>
          ${this._localize('reset') || 'Reset'}
        </ha-button>
      </div>
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

customElements.define("vacuum-map-card-editor", VacuumMapCardEditor);
