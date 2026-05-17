import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.1';

class VacuumSelectCard extends HAControlBase {
  static get properties() {
    return { ...super.properties, config: {} };
  }

  get translationPath() { return "/local/ha-controls/vacuum-select-card/translations"; }
  get translationVersion() { return VERSION; }

  // Link to the visual editor
  static getConfigElement() { 
    return document.createElement("vacuum-select-card-editor"); 
  }

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

  render() {
    const vacuum = this.hass.states[this.config.vacuum_entity];
    const output = this.hass.states[this.config.output_entity];
    
    // Fetch the entity tracking the active room
    const cleaningStatusEntity = this.config.currently_cleaning_entity ? this.hass.states[this.config.currently_cleaning_entity] : null;
    
    // Convert state like "4.0" to integer 4
    const currentRoomBeingCleaned = cleaningStatusEntity && cleaningStatusEntity.state !== 'unknown' && cleaningStatusEntity.state !== 'unavailable'
      ? Math.floor(parseFloat(cleaningStatusEntity.state))
      : null;

    if (!vacuum || !output) return html`<ha-alert alert-type="error">${this._localize('missing_entities')}</ha-alert>`;

    const currentMap = vacuum.attributes.selected_map;
    const allRooms = vacuum.attributes.rooms?.[currentMap] || [];
    const rooms = allRooms.filter(room => !this.config.rooms?.[room.id]?.disabled);

    const isReadonly = this.config.readonly_entity && this.hass.states[this.config.readonly_entity]?.state === 'on';
    
    const cleanSequence = (vacuum.attributes.cleaning_sequence || "").toString().split(",").map(id => id.trim());

    let selectedRooms = [];
    try { selectedRooms = JSON.parse(output.state || "[]"); } catch (e) { selectedRooms = []; }

    const allVisibleSelected = rooms.length > 0 && rooms.every(r => selectedRooms.includes(r.id));

    const isMarkingEnabled = this.config.mark_active_room && this.hass.states[this.config.mark_active_room]?.state === 'on';

    return html`
      <link rel="stylesheet" href="/local/ha-controls/vacuum-select-card/vacuum-select-card.css?v=${VERSION}">
      <div class="container ${isReadonly ? 'readonly' : ''}" 
          style="--grid-columns: ${this.config.columns || 4}; 
                  --selection-color: ${this.config.selection_color || 'var(--primary-color)'}; 
                  --selection-foreground: ${this.config.selection_foreground || 'white'};">
        
        <div class="room-grid">
          ${rooms.map(room => {
            const isSelected = selectedRooms.includes(room.id);
            const customConfig = this.config.rooms?.[room.id] || {};
            
            const roomIdInt = Math.floor(parseFloat(room.id));
            const showActiveCleaning = isMarkingEnabled && currentRoomBeingCleaned !== null && currentRoomBeingCleaned === roomIdInt;
            
            let animationClass = '';
            let animationStyle = '';
            if (showActiveCleaning) {
                const markingAnimation = this.config.mark_animation || 'none';
                animationClass = markingAnimation.toLowerCase() === 'none' ? '' : markingAnimation;
                const bgColor = this.config.mark_animation_background;
                const fgColor = this.config.mark_animation_foreground;
                if (bgColor || fgColor) {
                    animationStyle = `${bgColor ? `background-color: ${bgColor} !important;` : ''} ${fgColor ? `color: ${fgColor} !important;` : ''}`;
                }
            }
            
            return html`
              <div class="room-button ${isSelected ? 'active' : ''}" 
                   style="${animationStyle}"
                   @click="${() => !isReadonly && this._toggleRoom(room.id, selectedRooms, cleanSequence)}">
                <ha-icon 
                  class="${animationClass}" 
                  .icon="${customConfig.icon || room.icon || 'mdi:door'}">
                </ha-icon>
                <div class="name">${customConfig.label || room.name}</div>
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
   * Toggles room selection and updates the output entity
   * Sorts the selection according to the vacuum's active_segments order
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

  setConfig(config) { 
    this.config = config; 
  }
}

// Register custom element
customElements.define("vacuum-select-card", VacuumSelectCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "vacuum-select-card",
  name: "Vacuum Select Card",
  description: "Creates a display grid for all the selectable rooms",
  preview: true
});
