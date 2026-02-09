const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

class VacuumSelectCard extends LitElement {
  static get properties() {
    return { hass: {}, config: {} };
  }

  // Link to the visual editor
  static getConfigElement() { 
    return document.createElement("vacuum-select-card-editor"); 
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

    if (!vacuum || !output) return html`<ha-alert alert-type="error">Missing entities</ha-alert>`;

    const currentMap = vacuum.attributes.selected_map;
    const allRooms = vacuum.attributes.rooms?.[currentMap] || [];
    const rooms = allRooms.filter(room => !this.config.rooms?.[room.id]?.disabled);

    const isReadonly = this.config.readonly === true || 
                      (this.config.readonly_entity && this.hass.states[this.config.readonly_entity]?.state === 'on');
    
    const cleanSequence = (vacuum.attributes.cleaning_sequence || "").toString().split(",").map(id => id.trim());

    let selectedRooms = [];
    try { selectedRooms = JSON.parse(output.state || "[]"); } catch (e) { selectedRooms = []; }

    const allVisibleSelected = rooms.length > 0 && rooms.every(r => selectedRooms.includes(r.id));

    return html`
      <link rel="stylesheet" href="/local/custom/vacuum-select-card/vacuum-select-card.css?v=0.1.6">
      <div class="container ${isReadonly ? 'readonly' : ''}" 
          style="--grid-columns: ${this.config.columns || 4}; 
                  --selection-color: ${this.config.selection_color || 'var(--primary-color)'}; 
                  --selection-foreground: ${this.config.selection_foreground || 'white'};">
        
        <div class="room-grid">
          ${rooms.map(room => {
            const isSelected = selectedRooms.includes(room.id);
            const customConfig = this.config.rooms?.[room.id] || {};
            
            const roomIdInt = Math.floor(parseFloat(room.id));
            const isActiveCleaning = currentRoomBeingCleaned !== null && currentRoomBeingCleaned === roomIdInt;
            
            let animationClass = '';
            if (isActiveCleaning) {
                const selectedAnim = customConfig.animation || this.config.default_animation || 'spinning';
                animationClass = selectedAnim === 'none' ? '' : selectedAnim;
            }
            
            return html`
              <div class="room-button ${isSelected ? 'active' : ''}" 
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
              <span class="tile-name">${allVisibleSelected ? 'Deselect All' : 'Select All'}</span>
              <span class="tile-state">${selectedRooms.length} rooms selected</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  _toggleAll(rooms, selectedRooms, cleanSequence) {
    // Check if ALL visible rooms are currently in the selection
    const allVisibleSelected = rooms.length > 0 && rooms.every(r => selectedRooms.includes(r.id));
    
    let newSelection = [];
    
    // Logic: If not all are selected -> select all. If literally all are selected -> clear.
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
