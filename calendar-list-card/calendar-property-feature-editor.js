import { HAControlBase, html } from "../ha-control-base.js?v=0.6.0";

/**
 * Cache-busting version parameter for dynamic asset loading.
 * @type {string}
 */
const VERSION = "1.0.0";

/**
 * CalendarPropertyFeatureEditor
 * Visual configuration editor UI for the CalendarPropertyFeature custom card feature.
 * 
 * @extends HAControlBase
 */
class CalendarPropertyFeatureEditor extends HAControlBase {
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
   * Uses the calendar-list-card translations directory.
   * 
   * @type {string}
   */
  get translationPath() { return "/local/ha-controls/calendar-list-card/translations"; }

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
   * Handles configuration values change event inside editor forms, dispatching update events.
   * 
   * @param {CustomEvent} ev - Form value-changed event
   * @private
   */
  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const value = ev.detail.value;
    this._config = { ...this._config, ...value };
    this._fireConfigChanged();
  }

  _fireConfigChanged() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Renders the editor configuration interface layout.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this._config) return html``;

    const schema = [
      {
        name: "property",
        label: this._localize('property') || "Property",
        selector: {
          select: {
            options: [
              { value: "location", label: this._localize('location') || "Location" },
              { value: "description", label: this._localize('description') || "Description" },
              { value: "time", label: this._localize('time') || "Time" },
              { value: "summary", label: this._localize('summary') || "Summary" },
              { value: "attendees", label: this._localize('attendees') || "Attendees" },
              { value: "calendar_name", label: this._localize('calendar_name') || "Calendar Name" },
              { value: "date", label: this._localize('date') || "Date" }
            ],
            mode: "dropdown"
          }
        }
      },
      {
        name: "show_icon",
        label: this._localize('show_icon') || "Show Icon",
        selector: { boolean: {} }
      },
      {
        name: "icon",
        label: this._localize('icon') || "Icon Override",
        selector: { icon: {} }
      },
      {
        name: "",
        type: "grid",
        schema: [
          { name: "prefix", label: this._localize('prefix') || "Prefix", selector: { text: {} } },
          { name: "suffix", label: this._localize('suffix') || "Suffix", selector: { text: {} } }
        ]
      },
      {
        name: "",
        type: "grid",
        schema: [
          { name: "color", label: this._localize('color') || "Text Color", selector: { text: {} } },
          { name: "icon_color", label: this._localize('icon_color') || "Icon Color", selector: { text: {} } }
        ]
      },
      {
        name: "",
        type: "grid",
        schema: [
          { name: "font_size", label: this._localize('font_size') || "Font Size", selector: { text: {} } },
          {
            name: "font_weight",
            label: this._localize('font_weight') || "Font Weight",
            selector: {
              select: {
                options: [
                  { value: "normal", label: this._localize('normal') || "Normal" },
                  { value: "bold", label: this._localize('bold') || "Bold" },
                  { value: "light", label: this._localize('light') || "Light" }
                ],
                mode: "dropdown"
              }
            }
          }
        ]
      },
      {
        name: "text_align",
        label: this._localize('text_align') || "Text Align",
        selector: {
          select: {
            options: [
              { value: "left", label: this._localize('left') || "Left" },
              { value: "center", label: this._localize('center') || "Center" },
              { value: "right", label: this._localize('right') || "Right" }
            ],
            mode: "dropdown"
          }
        }
      }
    ];

    return html`
      ${this.renderStyle('calendar-property-feature-editor.css')}
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${(s) => s.label || s.name}
        @value-changed=${(e) => this._valueChanged(e)}
      ></ha-form>
    `;
  }
}

customElements.define("calendar-property-feature-editor", CalendarPropertyFeatureEditor);
