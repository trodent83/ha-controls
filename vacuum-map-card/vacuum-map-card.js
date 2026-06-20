import { HAControlBase, html } from "../ha-control-base.js?v=0.6.0";

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

  /**
   * Controls when the element should re-render to optimize dashboard performance.
   * Re-renders on config updates or only when entities listed in the config state object change.
   * 
   * @param {Map<string, any>} changedProps - Map of properties that changed in this cycle
   * @returns {boolean} True if the card should re-render, false otherwise
   */
  shouldUpdate(changedProps) {
    if (changedProps.has('config')) {
      return true;
    }

    if (changedProps.has('hass')) {
      const oldHass = changedProps.get('hass');
      if (!oldHass || !this.hass || !this.config) return true;

      if (oldHass.states[this.config.vacuum_entity] !== this.hass.states[this.config.vacuum_entity]) return true;
      if (oldHass.states[this.config.output_entity] !== this.hass.states[this.config.output_entity]) return true;
      
      if (this.config.currently_cleaning_entity && 
          oldHass.states[this.config.currently_cleaning_entity] !== this.hass.states[this.config.currently_cleaning_entity]) return true;
          
      if (this.config.readonly_entity && 
          oldHass.states[this.config.readonly_entity] !== this.hass.states[this.config.readonly_entity]) return true;

      if (this.config.mark_active_room && 
          oldHass.states[this.config.mark_active_room] !== this.hass.states[this.config.mark_active_room]) return true;

      return false;
    }
    return true;
  }

  /**
   * Renders the custom card's HTML template.
   * Displays the 2D layout map showing positionable room rectangles, selection state, and blinking cleaning highlights.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
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

    const currentMap = vacuum.attributes.selected_map;
    const allRooms = vacuum.attributes.rooms?.[currentMap] || [];
    let rooms = allRooms.filter(room => !this.config.rooms?.[room.id]?.disabled);

    const isReadonly = this.config.readonly_entity && this.hass.states[this.config.readonly_entity]?.state === 'on';
    
    const cleanSequence = (vacuum.attributes.cleaning_sequence || "").toString().split(",").map(id => id.trim());

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

    return html`
      ${this.renderStyle('vacuum-map-card.css')}
      <div class="container ${isReadonly ? 'readonly' : ''}" 
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
                const markingAnimation = this.config.mark_animation || 'none';
                animationClass = markingAnimation.toLowerCase() === 'none' ? '' : markingAnimation;
            }
            
            return html`
              <div class="room-block ${isSelected ? 'selected' : ''} ${activeCleaningClass}" 
                   style="${posStyle}"
                   @click="${() => !isReadonly && this._toggleRoom(room.id, selectedRooms, cleanSequence)}">
                <ha-icon 
                  class="${animationClass}" 
                  style="${this.config.show_names === false ? 'margin-bottom: 0px;' : ''}"
                  .icon="${customConfig.icon || room.icon || 'mdi:door'}">
                </ha-icon>
                ${this.config.show_names !== false ? html`<div class="name">${customConfig.label || room.name}</div>` : ''}
              </div>
            `;
          })}
        </div>

        <!-- Toggle All Button - Defaults to Visible -->
        ${this.config.show_toggle !== false ? html`
          <div class="tile-button"
               @click="${() => !isReadonly && this._toggleAll(rooms, selectedRooms, cleanSequence)}">
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
