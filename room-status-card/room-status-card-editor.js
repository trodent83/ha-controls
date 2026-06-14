import { HAControlBase, html } from "../ha-control-base.js?v=0.5.3";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.20';

/**
 * RoomStatusCardEditor
 * Visual configuration editor UI for RoomStatusCard.
 * Manages general headers, badges list, and customized state thresholds per badge.
 * 
 * @extends HAControlBase
 */
class RoomStatusCardEditor extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Tracks editor config copy.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return {
      ...super.properties,
      _config: { type: Object }
    };
  }

  /**
   * Resolves the directory path hosting the translation localizations.
   * 
   * @type {string}
   */
  get translationPath() { return "/local/ha-controls/room-status-card/translations"; }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() { return VERSION; }

  /**
   * Receives configuration details from Lovelace dashboard interface.
   * 
   * @param {Object} config - Config parameters
   */
  setConfig(config) {
    this._config = config;
  }

  /**
   * Invoked when top-level card configuration parameters are changed.
   * 
   * @param {CustomEvent} ev - Form value-changed event details
   * @private
   */
  _valueChanged(ev) {
    const config = ev.detail.value;
    this._config = { ...this._config, ...config };
    this._fireConfigChanged();
  }

  /**
   * Invoked when general badge attributes (e.g. icon, colors, state toggle) are edited.
   * 
   * @param {CustomEvent} ev - Form value-changed event details
   * @param {number} index - Index sequence of badge being edited
   * @private
   */
  _badgeChanged(ev, index) {
    const badges = [...(this._config.badges || [])];
    badges[index] = { ...badges[index], ...ev.detail.value };
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  /**
   * Appends a blank default badge object configuration to the badges array list.
   * 
   * @private
   */
  _addBadge() {
    const badges = [...(this._config.badges || []), { entity: "", icon: "", show_icon: true, show_state: true, thresholds: [] }];
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  /**
   * Deletes a badge object configuration by index.
   * 
   * @param {number} index - Index of target badge to remove
   * @private
   */
  _removeBadge(index) {
    const badges = [...(this._config.badges || [])];
    badges.splice(index, 1);
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  /**
   * Adjusts the display sequence of badges.
   * 
   * @param {number} index - Index of badge to move
   * @param {number} direction - Direction delta (-1 to move up, 1 to move down)
   * @private
   */
  _moveBadge(index, direction) {
    const badges = [...(this._config.badges || [])];
    if (index + direction < 0 || index + direction >= badges.length) return;
    
    const temp = badges[index];
    badges[index] = badges[index + direction];
    badges[index + direction] = temp;
    
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  /**
   * Appends a default blank threshold configuration object to a badge threshold rules array.
   * 
   * @param {number} badgeIndex - Index of target badge
   * @private
   */
  _addThreshold(badgeIndex) {
    const badges = [...(this._config.badges || [])];
    const thresholds = [...(badges[badgeIndex].thresholds || [])];
    thresholds.push({ value: "", color: "", animation: "" });
    badges[badgeIndex] = { ...badges[badgeIndex], thresholds };
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  /**
   * Modifies an attribute field value inside an individual threshold rule block.
   * 
   * @param {number} badgeIndex - Index of target badge
   * @param {number} threshIdx - Index sequence of threshold rule
   * @param {string} key - Threshold attribute name (e.g. 'value', 'color', 'animation')
   * @param {any} value - Assigned replacement value
   * @private
   */
  _updateThreshold(badgeIndex, threshIdx, key, value) {
    const badges = [...(this._config.badges || [])];
    const thresholds = [...badges[badgeIndex].thresholds];
    thresholds[threshIdx] = { ...thresholds[threshIdx], [key]: value };
    badges[badgeIndex] = { ...badges[badgeIndex], thresholds };
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  /**
   * Deletes a threshold rule block from a badge.
   * 
   * @param {number} badgeIndex - Index of target badge
   * @param {number} threshIdx - Index sequence of threshold rule to remove
   * @private
   */
  _removeThreshold(badgeIndex, threshIdx) {
    const badges = [...(this._config.badges || [])];
    const thresholds = [...badges[badgeIndex].thresholds];
    thresholds.splice(threshIdx, 1);
    badges[badgeIndex] = { ...badges[badgeIndex], thresholds };
    this._config = { ...this._config, badges };
    this._fireConfigChanged();
  }

  /**
   * Dispatches the updated config state back to the Lovelace dashboard configuration framework.
   * 
   * @private
   */
  _fireConfigChanged() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Constructs the top-level card settings form schema fields dictionary.
   * 
   * @private
   * @returns {Array<Object>} Form fields schema definition for ha-form
   */
  _schema() {
    return [
      { 
        name: "", 
        type: "grid", 
        schema: [
          { name: "name", label: this._localize('room_name'), selector: { text: {} } },
          { name: "icon", label: this._localize('icon'), selector: { icon: {} } },
        ]
      },
      {
        name: "header_settings",
        label: this._localize('header_settings'),
        type: "grid",
        schema: [
          { name: "show_header", label: this._localize('display_room_name'), selector: { boolean: {} } },
          { name: "show_icon", label: this._localize('display_icon'), selector: { boolean: {} } },
        ]
      }
    ];
  }

  /**
   * Renders the editor configuration interface layout.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this._config) return html``;

    const badges = this._config.badges || [];

    return html`
      <link rel="stylesheet" href="/local/ha-controls/room-status-card/room-status-card-editor.css?v=${VERSION}">
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema()}
        .computeLabel=${(schema) => schema.label || schema.name}
        @value-changed=${this._valueChanged}
      ></ha-form>

      <div class="badges-section">
        <h3>${this._localize('badges')}</h3>
        ${badges.map((badge, idx) => {
          const entityId = badge.entity;
          const stateObj = entityId && this.hass ? this.hass.states[entityId] : null;
          const friendlyName = stateObj?.attributes?.friendly_name || entityId;
          const badgeSchema = [
            { name: "entity", selector: { entity: {} } },
            { name: "icon", selector: { icon: {} } },
            { name: "color", label: this._localize('default_color'), selector: { text: {} } },
            { name: "show_icon", label: this._localize('show_icon'), selector: { boolean: {} } },
            { name: "show_state", label: this._localize('show_value'), selector: { boolean: {} } }
          ];
          
          const badgeData = { show_icon: true, show_state: true, ...badge };

          return html`
            <ha-expansion-panel outlined>
              <div slot="header" class="badge-header">
                <span>${friendlyName || this._localize('badge_num', { num: idx + 1 })}</span>
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
                  .computeLabel=${(schema) => schema.label || schema.name}
                  @value-changed=${(e) => this._badgeChanged(e, idx)}
                ></ha-form>

                <h4>${this._localize('thresholds_rules')}</h4>
                ${(badge.thresholds || []).map((thresh, tIdx) => html`
                  <div class="threshold-block">
                    <div class="threshold-row">
                      <ha-textfield
                        class="flex-grow"
                        label="${this._localize('value_ge')}"
                        .value=${thresh.value || ""}
                        @input=${(e) => this._updateThreshold(idx, tIdx, 'value', e.target.value)}
                      ></ha-textfield>
                      <ha-textfield
                        class="flex-grow"
                        label="${this._localize('color')}"
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
                        label="${this._localize('animation')}"
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
                        <mwc-list-item value="">${this._localize('none')}</mwc-list-item>
                        <mwc-list-item value="blink">${this._localize('blink')}</mwc-list-item>
                        <mwc-list-item value="pulse">${this._localize('pulse')}</mwc-list-item>
                      </ha-select>
                    </div>
                  </div>
                `)}
                <ha-button @click=${() => this._addThreshold(idx)}>
                  <ha-icon icon="mdi:plus" slot="icon"></ha-icon> ${this._localize('add_rule')}
                </ha-button>
              </div>
            </ha-expansion-panel>
          `;
        })}
        
        <ha-button raised @click=${this._addBadge}>
          <ha-icon icon="mdi:plus" slot="icon"></ha-icon> ${this._localize('add_badge')}
        </ha-button>
      </div>
    `;
  }
}

customElements.define("room-status-card-editor", RoomStatusCardEditor);
