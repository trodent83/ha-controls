import { HAControlBase, html } from "../ha-control-base.js?v=0.6.8";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.0';

/**
 * VacuumMapCard
 * A custom Home Assistant Lovelace card that displays selectable rooms as positionable, sizable
 * rectangles in a 2D space map for vacuuming operations.
 * Integrates with Home Assistant vacuum and input select/text helpers to sequence cleaning zones.
 * 
 * @extends HAControlBase
 */
class VacuumMapCard extends HAControlBase {
  /**
   * Defines the reactive properties tracked by LitElement.
   * Inherits properties from HAControlBase and adds the local configuration object.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return { ...super.properties, config: {} };
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
   * Creates and returns the configuration editor element for this card.
   * Home Assistant Lovelace visual editor links to this method.
   * 
   * @static
   * @returns {HTMLElement} The vacuum-map-card-editor configuration element
   */
  static getConfigElement() { 
    return document.createElement("vacuum-map-card-editor"); 
  }

  _getRoomName(roomId, defaultName) {
    const vacuumId = this.config.vacuum_entity;
    if (vacuumId) {
      const parts = vacuumId.split('.');
      if (parts.length > 1) {
        const nameEntityId = `select.${parts[1]}_room_${roomId}_name`;
        const stateObj = this.hass.states[nameEntityId];
        if (stateObj && stateObj.state && stateObj.state !== 'unknown' && stateObj.state !== 'unavailable') {
          return stateObj.state;
        }
      }
    }
    return defaultName;
  }

  render() {
    const vacuum = this.hass.states[this.config.vacuum_entity];
    const output = this.hass.states[this.config.output_entity];
    
    // Fetch the entity tracking the active room
    const cleaningStatusEntity = this.config.currently_cleaning_entity ? this.hass.states[this.config.currently_cleaning_entity] : null;
    
    // Convert state like "4.0" to integer 4
    const currentRoomBeingCleaned = cleaningStatusEntity && cleaningStatusEntity.state !== 'unknown' && cleaningStatusEntity.state !== 'unavailable'
      ? Math.floor(parseFloat(cleaningStatusEntity.state))
      : null;

    if (!vacuum || !output) return this.renderError(this._localize('missing_entities'));

    const isReadonly = this.config.readonly_entity && this.hass.states[this.config.readonly_entity]?.state === 'on';
    const isEditMode = this.config.edit_mode === true &&
      (this.closest('hui-card-preview') !== null || this.closest('dialog-edit-card') !== null);
    
    const cleanSequence = (vacuum.attributes.cleaning_sequence || "").toString().split(",").map(id => id.trim());

    // Merge configuration rooms and state attribute rooms
    const configRooms = [];
    if (this.config.rooms && typeof this.config.rooms === 'object') {
      for (const [id, r] of Object.entries(this.config.rooms)) {
        if (!r.disabled) {
          configRooms.push({
            id: isNaN(id) ? id : parseFloat(id),
            name: r.label || this._getRoomName(id, `Room ${id}`),
            icon: r.icon || 'mdi:door',
            ...r
          });
        }
      }
    }

    const currentMap = vacuum.attributes.selected_map;
    const allRooms = vacuum.attributes.rooms?.[currentMap] || [];
    
    const combinedRoomsMap = new Map();
    
    // Config rooms have priority
    configRooms.forEach(room => {
      combinedRoomsMap.set(room.id.toString(), room);
    });
    
    // Add any missing vacuum state rooms
    allRooms.forEach(room => {
      const roomIdStr = room.id.toString();
      if (!this.config.rooms?.[room.id]?.disabled && !combinedRoomsMap.has(roomIdStr)) {
        combinedRoomsMap.set(roomIdStr, {
          id: room.id,
          name: this._getRoomName(room.id, room.name),
          icon: room.icon || 'mdi:door'
        });
      }
    });
    
    let rooms = Array.from(combinedRoomsMap.values());

    const sortBySequence = this.config.sort_by_sequence !== false;
    if (sortBySequence && cleanSequence.length > 0 && cleanSequence[0] !== "") {
      rooms = [...rooms].sort((a, b) => {
        const idxA = cleanSequence.indexOf(a.id.toString());
        const idxB = cleanSequence.indexOf(b.id.toString());
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      });
    }

    let selectedRooms = [];
    try { selectedRooms = JSON.parse(output.state || "[]"); } catch (e) { selectedRooms = []; }

    const allVisibleSelected = rooms.length > 0 && rooms.every(r => selectedRooms.includes(r.id));

    const isMarkingEnabled = this.config.mark_active_room && this.hass.states[this.config.mark_active_room]?.state === 'on';

    const mapHeight = this.config.map_height ? `${this.config.map_height}px` : '350px';
    const selectionColor = this.config.selection_color || 'var(--primary-color)';
    const selectionForeground = this.config.selection_foreground || 'white';
    const cleaningBlinkColor = this.config.mark_animation_background || '#4CAF50';

    const containerClass = `container ${isReadonly ? 'readonly' : ''} ${isEditMode ? 'edit-mode' : ''}`;

    return html`
      ${this.renderStyle('vacuum-map-card.css')}
      <div class="${containerClass}" 
          style="--map-height: ${mapHeight}; 
                  --selection-color: ${selectionColor}; 
                  --selection-foreground: ${selectionForeground};
                  --cleaning-blink-color: ${cleaningBlinkColor};">
        
        <div class="map-container">
          ${rooms.map(room => {
            const isSelected = selectedRooms.includes(room.id);
            const customConfig = this.config.rooms?.[room.id] || {};
            
            const x = customConfig.x !== undefined ? customConfig.x : 0;
            const y = customConfig.y !== undefined ? customConfig.y : 0;
            const w = customConfig.w !== undefined ? customConfig.w : 15;
            const h = customConfig.h !== undefined ? customConfig.h : 15;
            const color = customConfig.color || '';
            const roomColorStyle = color ? `--room-color: ${color};` : '';
            const posStyle = `left: ${x}%; top: ${y}%; width: ${w}%; height: ${h}%; ${roomColorStyle}`;

            const roomIdInt = Math.floor(parseFloat(room.id));
            const showActiveCleaning = isMarkingEnabled && currentRoomBeingCleaned !== null && currentRoomBeingCleaned === roomIdInt;
            
            let activeCleaningClass = '';
            let animationClass = '';
            if (showActiveCleaning) {
                activeCleaningClass = 'cleaning';
                const markingAnimation = customConfig.animation || this.config.mark_animation || 'none';
                animationClass = markingAnimation.toLowerCase() === 'none' ? '' : markingAnimation;
            }
            
            const extraShapes = Array.isArray(customConfig.shapes) ? customConfig.shapes : [];
            
            return html`
              <div class="room-block ${isSelected ? 'selected' : ''} ${activeCleaningClass}" 
                   data-room-id="${room.id}"
                   style="${posStyle}"
                   @mousedown="${(e) => this._handleMouseDown(e, room.id)}"
                   @touchstart="${(e) => this._handleMouseDown(e, room.id)}"
                   @click="${(e) => this._handleRoomClick(e, room.id, selectedRooms, cleanSequence, isReadonly, isEditMode)}">
                <ha-icon 
                  class="${animationClass}" 
                  style="${this.config.show_names === false ? 'margin-bottom: 0px;' : ''}"
                  .icon="${customConfig.icon || room.icon || 'mdi:door'}">
                </ha-icon>
                ${this.config.show_names !== false ? html`<div class="name">${customConfig.label || room.name}</div>` : ''}
                
                ${isEditMode ? html`
                  <div class="delete-handle" @click="${(e) => this._handleDeleteClick(e, room.id)}">
                    <ha-icon .icon=${'mdi:close'}></ha-icon>
                  </div>
                ` : ''}
              </div>
              
              ${extraShapes.map((shape, idx) => {
                const sx = shape.x !== undefined ? shape.x : 0;
                const sy = shape.y !== undefined ? shape.y : 0;
                const sw = shape.w !== undefined ? shape.w : 15;
                const sh = shape.h !== undefined ? shape.h : 15;
                const shapePosStyle = `left: ${sx}%; top: ${sy}%; width: ${sw}%; height: ${sh}%; ${roomColorStyle}`;
                
                return html`
                  <div class="room-block extra-shape ${isSelected ? 'selected' : ''} ${activeCleaningClass}"
                       data-room-id="${room.id}"
                       style="${shapePosStyle}"
                       @mousedown="${(e) => this._handleMouseDown(e, room.id)}"
                       @touchstart="${(e) => this._handleMouseDown(e, room.id)}"
                       @click="${(e) => this._handleRoomClick(e, room.id, selectedRooms, cleanSequence, isReadonly, isEditMode)}">
                  </div>
                `;
              })}
            `;
          })}
        </div>

        <!-- Toggle All Button - Defaults to Visible -->
        ${this.config.show_toggle !== false ? html`
          <div class="tile-button"
               @click="${() => !isReadonly && !isEditMode && this._toggleAll(rooms, selectedRooms, cleanSequence)}">
            <div class="tile-icon-container">
               <ha-icon .icon="${allVisibleSelected ? 'mdi:toggle-switch' : 'mdi:toggle-switch-off-outline'}"></ha-icon>
            </div>
            <div class="tile-info">
               <span class="tile-name">${allVisibleSelected ? this._localize('deselect_all') : this._localize('select_all')}</span>
               <span class="tile-state">${this._localize('rooms_selected', { count: selectedRooms.length })}</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  _handleRoomClick(e, roomId, selectedRooms, cleanSequence, isReadonly, isEditMode) {
    if (isReadonly || isEditMode) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    this._toggleRoom(roomId, selectedRooms, cleanSequence);
  }

  _handleDeleteClick(e, roomId) {
    e.stopPropagation();
    e.preventDefault();
    const event = new CustomEvent("room-layout-changed", {
      detail: {
        roomId: roomId,
        deleted: true
      },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  _handleMouseDown(e, roomId) {
    if (!this.config.edit_mode) return;
    if (e.target.closest('.resize-handle') || e.target.closest('.delete-handle')) return;
    
    e.stopPropagation();
    
    const blockEl = e.target.closest('.room-block');
    if (!blockEl) return;
    const mapContainer = this.shadowRoot.querySelector('.map-container');
    const rect = mapContainer.getBoundingClientRect();
    
    const startClientX = e.touches ? e.touches[0].clientX : e.clientX;
    const startClientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const customConfig = this.config.rooms?.[roomId] || {};
    const rawX = parseFloat(customConfig.x);
    const rawY = parseFloat(customConfig.y);
    const rawW = parseFloat(customConfig.w);
    const rawH = parseFloat(customConfig.h);
    
    const startX = !isNaN(rawX) ? rawX : 0;
    const startY = !isNaN(rawY) ? rawY : 0;
    const w = !isNaN(rawW) ? rawW : 15;
    const h = !isNaN(rawH) ? rawH : 15;
    
    let finalX = startX;
    let finalY = startY;
    
    const handleMouseMove = (ev) => {
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
      
      const deltaX = clientX - startClientX;
      const deltaY = clientY - startClientY;
      
      const pctDeltaX = (deltaX / rect.width) * 100;
      const pctDeltaY = (deltaY / rect.height) * 100;
      
      finalX = Math.round(startX + pctDeltaX);
      finalY = Math.round(startY + pctDeltaY);
      
      finalX = Math.max(0, Math.min(100 - w, finalX));
      finalY = Math.max(0, Math.min(100 - h, finalY));
      
      const deltaXShift = finalX - startX;
      const deltaYShift = finalY - startY;

      const mainEl = mapContainer.querySelector(`.room-block[data-room-id="${roomId}"]:not(.extra-shape)`);
      if (mainEl) {
        mainEl.style.left = `${finalX}%`;
        mainEl.style.top = `${finalY}%`;
      }

      const extraEls = mapContainer.querySelectorAll(`.room-block.extra-shape[data-room-id="${roomId}"]`);
      const shapes = Array.isArray(customConfig.shapes) ? customConfig.shapes : [];
      extraEls.forEach((el, idx) => {
        const shape = shapes[idx];
        if (shape) {
          const sx = shape.x !== undefined ? shape.x : 0;
          const sy = shape.y !== undefined ? shape.y : 0;
          el.style.left = `${Math.round(sx + deltaXShift)}%`;
          el.style.top = `${Math.round(sy + deltaYShift)}%`;
        }
      });
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      
      const event = new CustomEvent("room-layout-changed", {
        detail: {
          roomId: roomId,
          x: finalX,
          y: finalY,
          w: w,
          h: h
        },
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(event);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: true });
    window.addEventListener('touchend', handleMouseUp);
  }



  /**
   * Toggles the selection state of all visible rooms.
   * If not all are selected, it selects all of them and sorts the selection matching the vacuum's cleaning sequence attributes.
   * If all are selected, it deselects them completely.
   * 
   * @param {Array<Object>} rooms - List of visible room configurations from attributes
   * @param {Array<string|number>} selectedRooms - List of currently selected room IDs
   * @param {Array<string>} cleanSequence - Vacuum's pre-configured cleaning sequence priority list
   * @protected
   */
  _toggleAll(rooms, selectedRooms, cleanSequence) {
    if (this.config.edit_mode) return;
    const allVisibleSelected = rooms.length > 0 && rooms.every(r => selectedRooms.includes(r.id));
    
    let newSelection = [];
    
    if (!allVisibleSelected) {
      newSelection = rooms.map(r => r.id);
      newSelection.sort((a, b) => {
        const indexA = cleanSequence.indexOf(a.toString());
        const indexB = cleanSequence.indexOf(b.toString());
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
      });
    }

    const entityId = this.config.output_entity;
    const [domain] = entityId.split(".");
    const service = domain === "input_text" ? "set_value" : "select_option";
    const dataField = domain === "input_text" ? "value" : "option";

    this.hass.callService(domain, service, {
      entity_id: entityId,
      [dataField]: JSON.stringify(newSelection)
    });
  }

  /**
   * Toggles a single room selection and updates the output entity.
   * Sorts the selection according to the vacuum's active_segments order.
   * 
   * @param {string|number} roomId - Identifier of the clicked room to toggle
   * @param {Array<string|number>} selectedRooms - List of currently selected room IDs
   * @param {Array<string>} cleanSequence - Vacuum's pre-configured cleaning sequence priority list
   * @protected
   */
  _toggleRoom(roomId, selectedRooms, cleanSequence) {
    let newSelection = selectedRooms.includes(roomId)
      ? selectedRooms.filter(id => id !== roomId)
      : [...selectedRooms, roomId];

    // Sort selection according to the custom active_segments sequence
    newSelection.sort((a, b) => {
      const indexA = cleanSequence.indexOf(a.toString());
      const indexB = cleanSequence.indexOf(b.toString());
      // If an ID is not in the sequence, put it at the end
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });

    const entityId = this.config.output_entity;
    const [domain] = entityId.split(".");
    
    // Select service based on entity domain
    const service = domain === "input_text" ? "set_value" : "select_option";
    const dataField = domain === "input_text" ? "value" : "option";

    this.hass.callService(domain, service, {
      entity_id: entityId,
      [dataField]: JSON.stringify(newSelection)
    });
  }

  /**
   * Returns default stub configuration details for this custom card.
   * Used when users click to add this card to their dashboards.
   * 
   * @static
   * @returns {Object} Stub configuration details
   */
  static getStubConfig() {
    return {
      vacuum_entity: "vacuum.robot",
      output_entity: "input_text.vacuum_rooms",
      currently_cleaning_entity: "sensor.vacuum_active_room",
      map_height: 350,
      show_toggle: true,
      show_names: true,
      sort_by_sequence: true
    };
  }

  /**
   * Sets the user configuration object for the card, validating required parameters.
   * Throws validation errors if essential fields like vacuum_entity or output_entity are omitted.
   * 
   * @param {Object} config - The raw configuration schema from Lovelace dashboard
   * @throws {Error} If vacuum_entity or output_entity is missing in dashboard config
   */
  setConfig(config) {
    if (!config.vacuum_entity) {
      throw new Error("You must configure vacuum_entity");
    }
    if (!config.output_entity) {
      throw new Error("You must configure output_entity");
    }
    this.config = {
      map_height: 350,
      show_toggle: true,
      sort_by_sequence: true,
      show_names: true,
      ...config
    };
  }
}

// Register custom element
customElements.define("vacuum-map-card", VacuumMapCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "vacuum-map-card",
  name: "Vacuum Map Card",
  description: "Creates an interactive 2D layout map for selectable rooms",
  preview: true
});
