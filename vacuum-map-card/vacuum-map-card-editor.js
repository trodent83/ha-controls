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
      const newX = (x !== undefined && !isNaN(x)) ? x : current.x;
      const newY = (y !== undefined && !isNaN(y)) ? y : current.y;
      const newW = (w !== undefined && !isNaN(w)) ? w : current.w;
      const newH = (h !== undefined && !isNaN(h)) ? h : current.h;
      
      rooms[roomId] = {
        ...current,
        ...(newX !== undefined ? { x: newX } : {}),
        ...(newY !== undefined ? { y: newY } : {}),
        ...(newW !== undefined ? { w: newW } : {}),
        ...(newH !== undefined ? { h: newH } : {})
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

  _autoExtractLayout() {
    const vacuumId = this._config?.vacuum_entity;
    if (!vacuumId) {
      alert("Please configure a Vacuum Entity first.");
      return;
    }
    
    const parts = vacuumId.split('.');
    if (parts.length < 2) return;
    const vacuumName = parts[1];
    
    // Find all matching camera entities (e.g. current map camera and saved maps cameras)
    const cameraPrefix = `camera.${vacuumName}_map`;
    const cameraEntities = Object.keys(this.hass.states).filter(id => id.startsWith(cameraPrefix));
    
    let cameraRooms = null;
    let selectedCameraId = '';
    
    for (const camId of cameraEntities) {
      const camState = this.hass.states[camId];
      if (camState && camState.attributes.rooms && Object.keys(camState.attributes.rooms).length > 0) {
        cameraRooms = camState.attributes.rooms;
        selectedCameraId = camId;
        break;
      }
    }
    
    if (!cameraRooms) {
      alert(`Could not find any map camera entity starting with "${cameraPrefix}" containing room coordinates in Home Assistant. Please make sure map data is loaded.`);
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
    const roomCoordinates = [];
    
    for (const [id, room] of Object.entries(cameraRooms)) {
      let x0 = undefined;
      let y0 = undefined;
      let x1 = undefined;
      let y1 = undefined;
      
      // Try to parse room boundary coordinates from outline points array (highest accuracy)
      if (room.outline && Array.isArray(room.outline) && room.outline.length > 0) {
        let rx0 = Infinity, ry0 = Infinity, rx1 = -Infinity, ry1 = -Infinity;
        room.outline.forEach(p => {
          if (Array.isArray(p) && p.length >= 2) {
            rx0 = Math.min(rx0, p[0]);
            rx1 = Math.max(rx1, p[0]);
            ry0 = Math.min(ry0, p[1]);
            ry1 = Math.max(ry1, p[1]);
          }
        });
        if (rx0 !== Infinity) {
          x0 = rx0;
          x1 = rx1;
          y0 = ry0;
          y1 = ry1;
        }
      }
      
      // Fallback to direct x0, y0, x1, y1 properties if outline parsing is unavailable
      if (x0 === undefined) {
        x0 = room.x0 !== undefined ? room.x0 : room.x;
        y0 = room.y0 !== undefined ? room.y0 : room.y;
        x1 = room.x1 !== undefined ? room.x1 : room.x;
        y1 = room.y1 !== undefined ? room.y1 : room.y;
      }
      
      if (x0 === undefined || y0 === undefined || x1 === undefined || y1 === undefined ||
          isNaN(x0) || isNaN(y0) || isNaN(x1) || isNaN(y1)) {
        continue;
      }
      
      minX = Math.min(minX, x0, x1);
      maxX = Math.max(maxX, x0, x1);
      minY = Math.min(minY, y0, y1);
      maxY = Math.max(maxY, y0, y1);
      
      roomCoordinates.push({
        id,
        x0,
        y0,
        x1,
        y1,
        label: room.name,
        icon: room.icon
      });
    }
    
    if (roomCoordinates.length === 0 || minX === Infinity || maxX === -Infinity || minY === Infinity || maxY === -Infinity ||
        isNaN(minX) || isNaN(maxX) || isNaN(minY) || isNaN(maxY)) {
      alert("No valid room outline coordinates found on the camera entity.");
      return;
    }
    
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    
    const rooms = { ...(this._config.rooms || {}) };
    
    roomCoordinates.forEach(room => {
      const wVal = ((room.x1 - room.x0) / width) * 100;
      const hVal = ((room.y1 - room.y0) / height) * 100;
      const xVal = ((room.x0 - minX) / width) * 100;
      const yVal = ((maxY - room.y1) / height) * 100;
      
      const current = rooms[room.id] || {};
      
      let w = Math.round(wVal);
      let h = Math.round(hVal);
      let x = Math.round(xVal);
      let y = Math.round(yVal);
      
      // Fallback defaults to prevent NaN issues if calculation goes out of bounds
      if (isNaN(w) || w <= 0) w = 15;
      if (isNaN(h) || h <= 0) h = 15;
      if (isNaN(x) || x < 0) x = 10;
      if (isNaN(y) || y < 0) y = 10;
      
      w = Math.max(5, Math.min(100, w));
      h = Math.max(5, Math.min(100, h));
      x = Math.max(0, Math.min(100 - w, x));
      y = Math.max(0, Math.min(100 - h, y));
      
      rooms[room.id] = {
        ...current,
        x,
        y,
        w,
        h
      };
    });
    
    this._config = {
      ...this._config,
      rooms
    };
    
    this._fireConfigChanged();
    alert(`Successfully extracted coordinates for ${roomCoordinates.length} rooms from camera "${selectedCameraId}"!`);
  }

  _flipLayoutHorizontal() {
    if (!this._config?.rooms) return;
    const rooms = { ...this._config.rooms };
    let changed = false;
    for (const [id, r] of Object.entries(rooms)) {
      if (r && r.x !== undefined && r.w !== undefined) {
        const x = parseFloat(r.x);
        const w = parseFloat(r.w);
        if (!isNaN(x) && !isNaN(w)) {
          rooms[id] = {
            ...r,
            x: Math.max(0, Math.min(100 - w, Math.round(100 - x - w)))
          };
          changed = true;
        }
      }
    }
    if (changed) {
      this._config = { ...this._config, rooms };
      this._fireConfigChanged();
    }
  }

  _flipLayoutVertical() {
    if (!this._config?.rooms) return;
    const rooms = { ...this._config.rooms };
    let changed = false;
    for (const [id, r] of Object.entries(rooms)) {
      if (r && r.y !== undefined && r.h !== undefined) {
        const y = parseFloat(r.y);
        const h = parseFloat(r.h);
        if (!isNaN(y) && !isNaN(h)) {
          rooms[id] = {
            ...r,
            y: Math.max(0, Math.min(100 - h, Math.round(100 - y - h)))
          };
          changed = true;
        }
      }
    }
    if (changed) {
      this._config = { ...this._config, rooms };
      this._fireConfigChanged();
    }
  }

  _rotateLayout90() {
    if (!this._config?.rooms) return;
    const rooms = { ...this._config.rooms };
    let changed = false;
    for (const [id, r] of Object.entries(rooms)) {
      if (r && r.x !== undefined && r.y !== undefined && r.w !== undefined && r.h !== undefined) {
        const x = parseFloat(r.x);
        const y = parseFloat(r.y);
        const w = parseFloat(r.w);
        const h = parseFloat(r.h);
        if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(h)) {
          const newW = h;
          const newH = w;
          const newX = Math.max(0, Math.min(100 - newW, Math.round(100 - y - h)));
          const newY = Math.max(0, Math.min(100 - newH, Math.round(x)));
          rooms[id] = {
            ...r,
            x: newX,
            y: newY,
            w: newW,
            h: newH
          };
          changed = true;
        }
      }
    }
    if (changed) {
      this._config = { ...this._config, rooms };
      this._fireConfigChanged();
    }
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
    
    let val = value;
    if (prop === 'x' || prop === 'y' || prop === 'w' || prop === 'h') {
      if (isNaN(val)) return; // Skip updating during empty/incomplete input typing
      val = Math.max(0, Math.min(100, val));
    }
    
    const rooms = { ...(this._config.rooms || {}) };
    const current = rooms[id] || {};
    
    rooms[id] = {
      ...current,
      [prop]: val
    };
    
    if (rooms[id].x === undefined) rooms[id].x = 10;
    if (rooms[id].y === undefined) rooms[id].y = 10;
    if (rooms[id].w === undefined) rooms[id].w = 15;
    if (rooms[id].h === undefined) rooms[id].h = 15;
    
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

    const vacuumId = this._config?.vacuum_entity;
    const vacuum = vacuumId ? this.hass.states[vacuumId] : null;
    const currentMap = vacuum?.attributes?.selected_map;
    const allRooms = vacuum?.attributes?.rooms?.[currentMap] || [];

    const combinedRoomsMap = new Map();

    // 1. Add all rooms from vacuum state attributes
    allRooms.forEach(room => {
      const roomIdStr = room.id.toString();
      combinedRoomsMap.set(roomIdStr, {
        id: roomIdStr,
        name: room.name,
        icon: room.icon || 'mdi:door',
        x: 10,
        y: 10,
        w: 15,
        h: 15
      });
    });

    // 2. Merge/override with config rooms (and add manually configured custom rooms)
    if (this._config.rooms && typeof this._config.rooms === 'object') {
      for (const [id, r] of Object.entries(this._config.rooms)) {
        const roomIdStr = id.toString();
        const existing = combinedRoomsMap.get(roomIdStr) || {};
        combinedRoomsMap.set(roomIdStr, {
          ...existing,
          ...r,
          id: roomIdStr
        });
      }
    }

    const rooms = Array.from(combinedRoomsMap.values());

    let vacuumName = '';
    if (vacuumId && vacuumId.includes('.')) {
      vacuumName = vacuumId.split('.')[1];
    }

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
              <ha-input
                label="Room ID (number)"
                type="number"
                .value=${this._newRoomId || ''}
                @input=${(e) => { this._newRoomId = e.target.value; }}
              ></ha-input>
              <ha-input
                label="Room Name"
                .value=${this._newRoomLabel || ''}
                @input=${(e) => { this._newRoomLabel = e.target.value; }}
              ></ha-input>
            </div>
            <ha-button @click=${this._addCustomRoom} outlined style="align-self: flex-end;">
              <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
              Add Room
            </ha-button>
          </div>

          <!-- Configured/Discovered Rooms List -->
          <div class="editor-section-title" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <span>Rooms Layout & Settings (${rooms.length})</span>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <ha-button @click=${this._autoExtractLayout} outlined style="--mdc-theme-primary: var(--primary-color);">
                <ha-icon icon="mdi:auto-upload" slot="icon"></ha-icon>
                Auto-Extract
              </ha-button>
              <ha-button @click=${this._flipLayoutHorizontal} outlined title="Flip Horizontally">
                <ha-icon icon="mdi:flip-horizontal" slot="icon"></ha-icon>
                Flip H
              </ha-button>
              <ha-button @click=${this._flipLayoutVertical} outlined title="Flip Vertically">
                <ha-icon icon="mdi:flip-vertical" slot="icon"></ha-icon>
                Flip V
              </ha-button>
              <ha-button @click=${this._rotateLayout90} outlined title="Rotate 90 Degrees Clockwise">
                <ha-icon icon="mdi:rotate-right" slot="icon"></ha-icon>
                Rotate 90°
              </ha-button>
            </div>
          </div>
          <div class="rooms-list">
            ${rooms.map((room) => {
              const id = room.id;
              const isExpanded = this._expandedRoomId === id;

              // Resolve HA Name Entity and current value
              const nameEntityId = vacuumName ? `select.${vacuumName}_room_${id}_name` : '';
              const nameStateObj = nameEntityId ? this.hass.states[nameEntityId] : null;
              const haName = nameStateObj && nameStateObj.state !== 'unknown' && nameStateObj.state !== 'unavailable' ? nameStateObj.state : '';
              const defaultName = room.name || `Room ${id}`;
              const displayName = room.label || haName || defaultName;

              return html`
                <div class="room-card">
                  <div class="room-card-header" @click=${() => this._toggleExpandRoom(id)}>
                    <div class="room-card-header-title">
                      <ha-icon .icon=${room.icon || 'mdi:door'}></ha-icon>
                      <span>${displayName} (ID: ${id})</span>
                    </div>
                    <div class="room-card-header-actions">
                      <ha-icon .icon=${isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}></ha-icon>
                    </div>
                  </div>
                  
                  ${isExpanded ? html`
                    <div class="room-card-body">
                      <!-- HA Renaming select (if select entity exists) -->
                      ${nameStateObj ? html`
                        <div class="input-row" style="margin-bottom: 12px;">
                          ${nameStateObj.attributes.options && nameStateObj.attributes.options.length > 0 ? html`
                            <ha-select
                              label="Home Assistant Room Name (select.*_name)"
                              .value=${nameStateObj.state}
                              @closed=${(e) => {
                                e.stopPropagation();
                                const target = e.target;
                                if (target.value !== undefined && target.value !== nameStateObj.state) {
                                  this.hass.callService('select', 'select_option', {
                                    entity_id: nameEntityId,
                                    option: target.value
                                  });
                                }
                              }}
                              fixedMenuPosition
                              naturalMenuWidth
                              style="width: 100%;"
                            >
                              ${nameStateObj.attributes.options.map(opt => html`
                                <ha-list-item .value=${opt}>${opt}</ha-list-item>
                              `)}
                            </ha-select>
                          ` : html`
                            <ha-input
                              label="Home Assistant Room Name (select.*_name)"
                              .value=${nameStateObj.state || ''}
                              @change=${(e) => {
                                this.hass.callService('select', 'select_option', {
                                  entity_id: nameEntityId,
                                  option: e.target.value
                                });
                              }}
                              style="width: 100%;"
                            ></ha-input>
                          `}
                        </div>
                      ` : ''}

                      <div class="input-row">
                        <ha-input
                          label="Display Name Override (Local)"
                          .value=${room.label || ''}
                          @change=${(e) => this._updateRoomProp(id, 'label', e.target.value)}
                        ></ha-input>
                        
                        <ha-icon-picker
                          label="Icon Override"
                          .value=${room.icon || ''}
                          .hass=${this.hass}
                          @value-changed=${(e) => this._updateRoomProp(id, 'icon', e.detail.value)}
                        ></ha-icon-picker>
                      </div>
                      
                      <div class="input-row">
                        <ha-input
                          label="Color (Hex / CSS)"
                          .value=${room.color || ''}
                          @change=${(e) => this._updateRoomProp(id, 'color', e.target.value)}
                        ></ha-input>
                        <ha-input
                          label="Active Animation"
                          .value=${room.animation || 'none'}
                          @change=${(e) => this._updateRoomProp(id, 'animation', e.target.value)}
                        ></ha-input>
                      </div>

                      <div class="coordinates-grid">
                        <ha-input
                          label="X (%)"
                          type="number"
                          .value=${(room.x ?? 0).toString()}
                          @input=${(e) => this._updateRoomProp(id, 'x', parseFloat(e.target.value))}
                        ></ha-input>
                        <ha-input
                          label="Y (%)"
                          type="number"
                          .value=${(room.y ?? 0).toString()}
                          @input=${(e) => this._updateRoomProp(id, 'y', parseFloat(e.target.value))}
                        ></ha-input>
                        <ha-input
                          label="W (%)"
                          type="number"
                          .value=${(room.w ?? 15).toString()}
                          @input=${(e) => this._updateRoomProp(id, 'w', parseFloat(e.target.value))}
                        ></ha-input>
                        <ha-input
                          label="H (%)"
                          type="number"
                          .value=${(room.h ?? 15).toString()}
                          @input=${(e) => this._updateRoomProp(id, 'h', parseFloat(e.target.value))}
                        ></ha-input>
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
                          Delete Room Config
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
