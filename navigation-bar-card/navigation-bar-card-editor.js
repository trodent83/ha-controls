import { HAControlBase, html } from "../ha-control-base.js?v=0.6.8";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.0';

/**
 * NavigationBarCardEditor
 * Visual configuration editor for NavigationBarCard.
 * Manages general dashboard navigation items, item filters, and sequential priority threshold styling.
 * 
 * @extends HAControlBase
 */
class NavigationBarCardEditor extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
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
  get translationPath() { return "/local/ha-controls/navigation-bar-card/translations"; }

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
    this._config = {
      items: [],
      ...config
    };

    const knownKeys = [
      "items"
    ];
    this._unrecognizedKeys = this._validateConfigKeys(config, knownKeys);
  }

  /**
   * Invoked when top-level card configuration parameters are changed.
   * 
   * @private
   */
  _fireConfigChanged() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Invoked when general item attributes are edited.
   * 
   * @param {CustomEvent} ev - Form value-changed event details
   * @param {number} index - Index sequence of item being edited
   * @private
   */
  _itemChanged(ev, index) {
    const items = [...(this._config.items || [])];
    items[index] = { ...items[index], ...ev.detail.value };
    this._config = { ...this._config, items };
    this._fireConfigChanged();
  }

  /**
   * Appends a blank default navigation item object configuration.
   * 
   * @private
   */
  _addItem() {
    const items = [
      ...(this._config.items || []),
      { content: "New Tab", icon: "mdi:circle-outline", navigation_path: "" }
    ];
    this._config = { ...this._config, items };
    this._fireConfigChanged();
  }

  /**
   * Deletes a navigation item object configuration by index.
   * 
   * @param {number} index - Index of target item to remove
   * @private
   */
  _removeItem(index) {
    const items = [...(this._config.items || [])];
    items.splice(index, 1);
    this._config = { ...this._config, items };
    this._fireConfigChanged();
  }

  /**
   * Adjusts the display sequence of navigation items.
   * 
   * @param {number} index - Index of item to move
   * @param {number} direction - Direction delta (-1 to move up, 1 to move down)
   * @private
   */
  _moveItem(index, direction) {
    const items = [...(this._config.items || [])];
    if (index + direction < 0 || index + direction >= items.length) return;
    
    const temp = items[index];
    items[index] = items[index + direction];
    items[index + direction] = temp;
    
    this._config = { ...this._config, items };
    this._fireConfigChanged();
  }

  /**
   * Appends a default blank threshold configuration object to an item.
   * 
   * @param {number} itemIdx - Index of navigation item
   * @private
   */
  _addThreshold(itemIdx) {
    const items = [...(this._config.items || [])];
    const thresholds = [...(items[itemIdx].thresholds || [])];
    thresholds.push({ value: "", color: "", icon: "", animation: "" });
    items[itemIdx] = { ...items[itemIdx], thresholds };
    this._config = { ...this._config, items };
    this._fireConfigChanged();
  }

  /**
   * Modifies fields inside an individual threshold rule block.
   * 
   * @param {number} itemIdx - Index of navigation item
   * @param {number} threshIdx - Index sequence of threshold rule
   * @param {Object} value - Updated threshold properties dictionary
   * @private
   */
  _updateThreshold(itemIdx, threshIdx, value) {
    const items = [...(this._config.items || [])];
    const thresholds = [...(items[itemIdx].thresholds || [])];
    thresholds[threshIdx] = { ...thresholds[threshIdx], ...value };
    items[itemIdx] = { ...items[itemIdx], thresholds };
    this._config = { ...this._config, items };
    this._fireConfigChanged();
  }

  /**
   * Deletes a threshold rule block from an item.
   * 
   * @param {number} itemIdx - Index of navigation item
   * @param {number} threshIdx - Index sequence of threshold rule to remove
   * @private
   */
  _removeThreshold(itemIdx, threshIdx) {
    const items = [...(this._config.items || [])];
    const thresholds = [...(items[itemIdx].thresholds || [])];
    thresholds.splice(threshIdx, 1);
    items[itemIdx] = { ...items[itemIdx], thresholds };
    this._config = { ...this._config, items };
    this._fireConfigChanged();
  }

  /**
   * Appends a blank filter pattern row to an item.
   * 
   * @param {number} itemIdx - Index of navigation item
   * @private
   */
  _addFilter(itemIdx) {
    const items = [...(this._config.items || [])];
    const filters = [...(items[itemIdx].filters || [])];
    filters.push({ pattern: "", case_sensitive: true });
    items[itemIdx] = { ...items[itemIdx], filters };
    this._config = { ...this._config, items };
    this._fireConfigChanged();
  }

  /**
   * Updates properties of a filter pattern.
   * 
   * @param {CustomEvent|Event} ev - Input event
   * @param {number} itemIdx - Index of navigation item
   * @param {number} filterIdx - Index of filter pattern
   * @param {string} prop - Property to update ('pattern' or 'case_sensitive')
   * @private
   */
  _filterChanged(ev, itemIdx, filterIdx, prop) {
    const items = [...(this._config.items || [])];
    const filters = [...(items[itemIdx].filters || [])];
    const val = prop === 'case_sensitive' ? ev.target.checked : ev.target.value;
    filters[filterIdx] = { ...filters[filterIdx], [prop]: val };
    items[itemIdx] = { ...items[itemIdx], filters };
    this._config = { ...this._config, items };
    this._fireConfigChanged();
  }

  /**
   * Deletes a filter pattern from an item.
   * 
   * @param {number} itemIdx - Index of navigation item
   * @param {number} filterIdx - Index of filter pattern to remove
   * @private
   */
  _removeFilter(itemIdx, filterIdx) {
    const items = [...(this._config.items || [])];
    const filters = [...(items[itemIdx].filters || [])];
    filters.splice(filterIdx, 1);
    items[itemIdx] = { ...items[itemIdx], filters };
    this._config = { ...this._config, items };
    this._fireConfigChanged();
  }

  /**
   * Cleans the active configuration of any unrecognized properties.
   * 
   * @private
   */
  _cleanConfig() {
    if (!this._config) return;
    const cleaned = {
      type: this._config.type
    };
    
    if (this._config.items && Array.isArray(this._config.items)) {
      cleaned.items = this._config.items.map(item => {
        const i = {};
        if (item.content !== undefined) i.content = item.content;
        if (item.icon !== undefined) i.icon = item.icon;
        if (item.navigation_path !== undefined) i.navigation_path = item.navigation_path;
        if (item.entity !== undefined) i.entity = item.entity;
        if (item.show_counter !== undefined) i.show_counter = item.show_counter;
        if (item.color !== undefined) i.color = item.color;
        if (item.max_days !== undefined) i.max_days = item.max_days;
        if (item.show_completed !== undefined) i.show_completed = item.show_completed;
        if (item.show_no_due_date !== undefined) i.show_no_due_date = item.show_no_due_date;
        
        if (item.filters && Array.isArray(item.filters)) {
          i.filters = item.filters.map(f => {
            const fi = {};
            if (f.pattern !== undefined) fi.pattern = f.pattern;
            if (f.case_sensitive !== undefined) fi.case_sensitive = f.case_sensitive;
            return fi;
          });
        }
        
        if (item.thresholds && Array.isArray(item.thresholds)) {
          i.thresholds = item.thresholds.map(t => {
            const th = {};
            if (t.value !== undefined) th.value = t.value;
            if (t.entity !== undefined) th.entity = t.entity;
            if (t.color !== undefined) th.color = t.color;
            if (t.icon !== undefined) th.icon = t.icon;
            if (t.animation !== undefined) th.animation = t.animation;
            return th;
          });
        }
        return i;
      });
    }
    
    this._config = cleaned;
    this._fireConfigChanged();
  }

  /**
   * Resets the active configuration back to standard stub values.
   * 
   * @private
   */
  _resetConfig() {
    this._config = {
      type: this._config?.type || "custom:navigation-bar-card",
      items: [
        {
          content: "Home",
          icon: "mdi:home",
          navigation_path: "/eg-dashboard/0"
        },
        {
          content: "Tasks",
          icon: "mdi:calendar",
          navigation_path: "/eg-dashboard/1"
        },
        {
          content: "Overview",
          icon: "mdi:thermometer",
          navigation_path: "/eg-dashboard/2"
        }
      ]
    };
    this._fireConfigChanged();
  }

  /**
   * Renders the editor configuration interface layout.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this._config) return html``;

    const items = this._config.items || [];

    return html`
      ${this.renderStyle('navigation-bar-card-editor.css')}
      ${this.renderConfigValidationWarning()}
      
      <div class="items-section">
        <h3>${this._localize('navigation_items') || 'Navigation Items'}</h3>
        
        ${items.map((item, idx) => {
          const itemSchema = [
            {
              name: "",
              type: "grid",
              schema: [
                { name: "content", label: this._localize('label') || 'Label Text', selector: { text: {} } },
                { name: "icon", label: this._localize('icon') || 'Icon', selector: { icon: {} } }
              ]
            },
            { name: "navigation_path", label: this._localize('navigation_path') || 'Navigation Path', selector: { text: {} } },
            {
              name: "",
              type: "grid",
              schema: [
                { name: "entity", label: this._localize('entity') || 'Watch Entity', selector: { entity: {} } },
                { name: "color", label: this._localize('color') || 'Default Color', selector: { text: {} } }
              ]
            },
            {
              name: "",
              type: "grid",
              schema: [
                { name: "show_counter", label: this._localize('show_counter_badge') || 'Show Counter Badge', selector: { boolean: {} } },
                { name: "show_completed", label: this._localize('show_completed') || 'Show Completed Tasks', selector: { boolean: {} } }
              ]
            },
            {
              name: "",
              type: "grid",
              schema: [
                { name: "max_days", label: this._localize('max_days') || 'Max Days (Offset Limit)', selector: { number: { min: 1, max: 30, mode: "box" } } },
                { name: "show_no_due_date", label: this._localize('show_no_due_date') || 'Show Tasks Without Due Date', selector: { boolean: {} } }
              ]
            }
          ];

          return html`
            <ha-expansion-panel outlined style="margin-bottom: 12px; display: block;">
              <div slot="header" class="item-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span>${item.content || `Item ${idx + 1}`}</span>
                <div @click=${(e) => e.stopPropagation()}>
                  <ha-icon-button
                    @click=${() => this._moveItem(idx, -1)}
                    .disabled=${idx === 0}
                  ><ha-icon icon="mdi:arrow-up"></ha-icon></ha-icon-button>
                  <ha-icon-button
                    @click=${() => this._moveItem(idx, 1)}
                    .disabled=${idx === items.length - 1}
                  ><ha-icon icon="mdi:arrow-down"></ha-icon></ha-icon-button>
                  <ha-icon-button
                    class="remove-btn-compact"
                    @click=${() => this._removeItem(idx)}
                  ><ha-icon icon="mdi:delete"></ha-icon></ha-icon-button>
                </div>
              </div>
              
              <div class="item-content" style="padding: 16px;">
                <ha-form
                  .hass=${this.hass}
                  .data=${item}
                  .schema=${itemSchema}
                  .computeLabel=${(schema) => schema.label || schema.name}
                  @value-changed=${(e) => this._itemChanged(e, idx)}
                ></ha-form>

                <!-- Filters section inside item -->
                <div class="filters-section" style="margin-top: 16px; border-top: 1px dashed var(--divider-color); padding-top: 16px;">
                  <h4 style="margin-bottom: 8px;">${this._localize('filters') || 'Regex Filters (Exclude)'}</h4>
                  
                  ${(item.filters || []).map((filter, filterIdx) => html`
                    <div class="filter-row" style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
                      <ha-input
                        style="flex: 2;"
                        label="${this._localize('filter_regex') || 'Filter (Regex)'}"
                        .value="${filter.pattern || ''}"
                        @input="${(e) => this._filterChanged(e, idx, filterIdx, 'pattern')}"
                      ></ha-input>
                      <ha-formfield label="${this._localize('case_sensitive') || 'Case Sensitive'}" style="flex: 1; display: inline-flex; align-items: center;">
                        <ha-switch
                          .checked="${filter.case_sensitive !== false}"
                          @change="${(e) => this._filterChanged(e, idx, filterIdx, 'case_sensitive')}"
                        ></ha-switch>
                      </ha-formfield>
                      <ha-icon-button
                        @click="${() => this._removeFilter(idx, filterIdx)}"
                      ><ha-icon icon="mdi:delete-outline"></ha-icon></ha-icon-button>
                    </div>
                  `)}

                  <ha-button @click=${() => this._addFilter(idx)} style="margin-top: 8px;">
                    <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
                    ${this._localize('add_filter') || 'Add Filter'}
                  </ha-button>
                </div>

                <!-- Thresholds section inside item -->
                <div class="thresholds-section" style="margin-top: 16px; border-top: 1px dashed var(--divider-color); padding-top: 16px;">
                  <h4 style="margin-bottom: 8px;">${this._localize('priority_thresholds') || 'Priority Thresholds'}</h4>
                  
                  ${(item.thresholds || []).map((thresh, tIdx) => {
                    const thresholdSchema = [
                      {
                        name: "",
                        type: "grid",
                        schema: [
                          { name: "value", label: this._localize('value') || 'Value to Match', selector: { text: {} } },
                          { name: "entity", label: this._localize('entity_override') || 'Entity Override', selector: { entity: {} } }
                        ]
                      },
                      {
                        name: "",
                        type: "grid",
                        schema: [
                          { name: "color", label: this._localize('color') || 'Color Override', selector: { text: {} } },
                          { name: "icon", label: this._localize('icon') || 'Icon Override', selector: { icon: {} } }
                        ]
                      },
                      {
                        name: "animation",
                        label: this._localize('animation') || 'Animation Override',
                        selector: {
                          select: {
                            options: [
                              { value: "", label: this._localize('none') || 'None' },
                              { value: "blink", label: this._localize('blink') || 'Blink' },
                              { value: "pulse", label: this._localize('pulse') || 'Pulse' }
                            ]
                          }
                        }
                      }
                    ];

                    return html`
                      <div class="threshold-block">
                        <div class="threshold-header">
                          <span style="font-weight: 500;">Rule ${tIdx + 1} ${thresh.value ? `(${thresh.value})` : ""}</span>
                          <ha-icon-button
                            class="remove-btn-compact"
                            @click=${() => this._removeThreshold(idx, tIdx)}
                          ><ha-icon icon="mdi:close"></ha-icon></ha-icon-button>
                        </div>
                        <ha-form
                          .hass=${this.hass}
                          .data=${thresh}
                          .schema=${thresholdSchema}
                          .computeLabel=${(schema) => schema.label || schema.name}
                          @value-changed=${(e) => this._updateThreshold(idx, tIdx, e.detail.value)}
                        ></ha-form>
                      </div>
                    `;
                  })}

                  <ha-button @click=${() => this._addThreshold(idx)} style="margin-top: 8px;">
                    <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
                    ${this._localize('add_threshold_rule') || 'Add Threshold Rule'}
                  </ha-button>
                </div>
              </div>
            </ha-expansion-panel>
          `;
        })}
        
        <ha-button raised @click=${this._addItem} style="margin-top: 8px;">
          <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
          ${this._localize('add_item') || 'Add Item'}
        </ha-button>
      </div>

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
}

customElements.define("navigation-bar-card-editor", NavigationBarCardEditor);
