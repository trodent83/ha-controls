import { HAControlBase, html } from "../ha-control-base.js?v=0.6.2";

/**
 * ImageCardFeatureEditor
 * Visual configuration editor UI for the ImageCardFeature custom card feature.
 * 
 * @extends HAControlBase
 */
class ImageCardFeatureEditor extends HAControlBase {
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
  get translationPath() { return "/local/ha-controls/feature-renderer-card/translations"; }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() { return "1.0.0"; }

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
      { name: "entity", label: this._localize('entity_override'), selector: { entity: {} } },
      { name: "image_url", label: this._localize('image_url'), selector: { text: {} } },
      { name: "use_entity_picture", label: this._localize('use_entity_picture'), selector: { boolean: {} } },
      {
        name: "",
        type: "grid",
        schema: [
          { name: "width", label: this._localize('width'), selector: { text: {} } },
          { name: "height", label: this._localize('height'), selector: { text: {} } }
        ]
      },
      {
        name: "",
        type: "grid",
        schema: [
          {
            name: "clip_shape",
            label: this._localize('clip_shape'),
            selector: {
              select: {
                options: [
                  { value: "circle", label: this._localize('circle') },
                  { value: "square", label: this._localize('square') }
                ],
                mode: "dropdown"
              }
            }
          },
          {
            name: "image_fit",
            label: this._localize('image_fit'),
            selector: {
              select: {
                options: [
                  { value: "contain", label: this._localize('contain') },
                  { value: "cover", label: this._localize('cover') },
                  { value: "fill", label: this._localize('fill') }
                ],
                mode: "dropdown"
              }
            }
          }
        ]
      }
    ];

    const data = {
      use_entity_picture: true,
      clip_shape: "circle",
      image_fit: "cover",
      width: "40px",
      height: "40px",
      ...this._config
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${(s) => s.label || s.name}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

customElements.define("image-card-feature-editor", ImageCardFeatureEditor);
