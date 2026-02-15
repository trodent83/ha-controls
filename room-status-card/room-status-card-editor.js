/**
 * ROOM STATUS CARD EDITOR (2026 Edition)
 * Comprehensive UI configuration for sensors, thresholds, and theme colors.
 */

const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

// Define the comprehensive form schema
const GLOBAL_SCHEMA = [
  { 
    name: "", 
    type: "grid", 
    schema: [
      { name: "name", label: "Room Name", selector: { text: {} } },
      { name: "icon", label: "Icon", selector: { icon: {} } },
    ]
  },
  {
    name: "header_settings",
    label: "Header Settings",
    type: "grid",
    schema: [
      { name: "show_header", label: "Display Room Name", selector: { boolean: {} } },
      { name: "show_icon", label: "Display Icon", selector: { boolean: {} } },
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
    this._config = config;
  }

  _valueChanged(ev) {
    const config = ev.detail.value;
    this._config = { ...this._config, ...config };
    this._fireConfigChanged();
  }

  _badgeChanged(ev, index) {
    const badges = [...(this._config.badges || [])];
    badges[index] = { ...badges[index], ...ev.detail.value };
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  _addBadge() {
    const badges = [...(this._config.badges || []), { entity: "", icon: "", show_icon: true, show_state: true, thresholds: [] }];
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  _removeBadge(index) {
    const badges = [...(this._config.badges || [])];
    badges.splice(index, 1);
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  _moveBadge(index, direction) {
    const badges = [...(this._config.badges || [])];
    if (index + direction < 0 || index + direction >= badges.length) return;
    
    const temp = badges[index];
    badges[index] = badges[index + direction];
    badges[index + direction] = temp;
    
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  _addThreshold(badgeIndex) {
    const badges = [...(this._config.badges || [])];
    const thresholds = [...(badges[badgeIndex].thresholds || [])];
    thresholds.push({ value: "", color: "", animation: "" });
    badges[badgeIndex] = { ...badges[badgeIndex], thresholds };
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  _updateThreshold(badgeIndex, threshIdx, key, value) {
    const badges = [...(this._config.badges || [])];
    const thresholds = [...badges[badgeIndex].thresholds];
    thresholds[threshIdx] = { ...thresholds[threshIdx], [key]: value };
    badges[badgeIndex] = { ...badges[badgeIndex], thresholds };
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  _removeThreshold(badgeIndex, threshIdx) {
    const badges = [...(this._config.badges || [])];
    const thresholds = [...badges[badgeIndex].thresholds];
    thresholds.splice(threshIdx, 1);
    badges[badgeIndex] = { ...badges[badgeIndex], thresholds };
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  _fireConfigChanged() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    if (!this.hass || !this._config) return html``;

    const badges = this._config.badges || [];

    return html`
      <link rel="stylesheet" href="/local/ha-controls/room-status-card/room-status-card-editor.css?v=1.0.0">
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${GLOBAL_SCHEMA}
        .computeLabel=${(schema) => schema.label}
        @value-changed=${this._valueChanged}
      ></ha-form>

      <div class="badges-section">
        <h3>Badges</h3>
        ${badges.map((badge, idx) => {
          const entityId = badge.entity;
          const badgeSchema = [
            { name: "entity", selector: { entity: {} } },
            { name: "icon", selector: { icon: {} } },
            { name: "color", label: "Default Color", selector: { text: {} } },
            { name: "show_icon", label: "Show Icon", selector: { boolean: {} } },
            { name: "show_state", label: "Show Value", selector: { boolean: {} } }
          ];
          
          const badgeData = { show_icon: true, show_state: true, ...badge };

          return html`
            <ha-expansion-panel outlined>
              <div slot="header" class="badge-header">
                <span>${entityId || `Badge ${idx + 1}`}</span>
                <div @click=${(e) => e.stopPropagation()}>
                  <ha-icon-button
                    @click=${() => this._moveBadge(idx, -1)}
                    .disabled=${idx === 0}
                  ><ha-icon icon="mdi:arrow-up"></ha-icon></ha-icon-button>
                  <ha-icon-button
                    @click=${() => this._moveBadge(idx, 1)}
                    .disabled=${idx === badges.length - 1}
                  ><ha-icon icon="mdi:arrow-down"></ha-icon></ha-icon-button>
                  <ha-icon-button
                    class="remove-btn-compact"
                    @click=${() => this._removeBadge(idx)}
                  ><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
                </div>
              </div>
              
              <div class="badge-content">
                <ha-form
                  .hass=${this.hass}
                  .data=${badgeData}
                  .schema=${badgeSchema}
                  @value-changed=${(e) => this._badgeChanged(e, idx)}
                ></ha-form>

                <h4>Thresholds / Rules</h4>
                ${(badge.thresholds || []).map((thresh, tIdx) => html`
                  <div class="threshold-block">
                    <div class="threshold-row">
                      <ha-textfield
                        class="flex-grow"
                        label="Value >="
                        .value=${thresh.value || ""}
                        @input=${(e) => this._updateThreshold(idx, tIdx, 'value', e.target.value)}
                      ></ha-textfield>
                      <ha-textfield
                        class="flex-grow"
                        label="Color"
                        .value=${thresh.color || ""}
                        @input=${(e) => this._updateThreshold(idx, tIdx, 'color', e.target.value)}
                      ></ha-textfield>
                      <ha-icon-button
                        class="remove-btn-compact"
                        @click=${() => this._removeThreshold(idx, tIdx)}
                      ><ha-icon icon="mdi:close"></ha-icon></ha-icon-button>
                    </div>
                    <div class="threshold-row">
                      <ha-select
                        label="Animation"
                        .value=${thresh.animation || ""}
                        @closed=${(e) => {
                          e.stopPropagation();
                          const target = e.target;
                          if (target.value !== undefined && target.value !== thresh.animation) {
                            this._updateThreshold(idx, tIdx, 'animation', target.value);
                          }
                        }}
                        fixedMenuPosition
                        naturalMenuWidth
                        class="flex-grow"
                      >
                        <mwc-list-item value="">None</mwc-list-item>
                        <mwc-list-item value="blink">Blink</mwc-list-item>
                        <mwc-list-item value="pulse">Pulse</mwc-list-item>
                      </ha-select>
                    </div>
                  </div>
                `)}
                <ha-button @click=${() => this._addThreshold(idx)}>
                  <ha-icon icon="mdi:plus" slot="icon"></ha-icon> Add Rule
                </ha-button>
              </div>
            </ha-expansion-panel>
          `;
        })}
        
        <ha-button raised @click=${this._addBadge}>
          <ha-icon icon="mdi:plus" slot="icon"></ha-icon> Add Badge
        </ha-button>
      </div>
    `;
  }
}

customElements.define("room-status-card-editor", RoomStatusCardEditor);
