import { HAControlBase, html } from "../ha-control-base.js?v=0.6.2";

/**
 * Cache-busting version parameter for dynamic asset loading.
 * @type {string}
 */
const VERSION = "1.0.0";

/**
 * ImageCardFeature
 * A custom Lovelace card feature that renders static pictures, entity pictures,
 * or camera snapshot streams.
 * 
 * @extends HAControlBase
 */
class ImageCardFeature extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return {
      ...super.properties,
      config: { state: true },
      stateObj: { attribute: false }
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
  get translationVersion() { return VERSION; }

  /**
   * Creates and returns the configuration editor element for this card feature.
   * 
   * @static
   * @returns {HTMLElement} The image-card-feature-editor configuration element
   */
  static getConfigElement() {
    return document.createElement("image-card-feature-editor");
  }

  /**
   * Returns default stub configuration details for this custom feature card.
   * 
   * @static
   * @returns {Object} Stub configuration details
   */
  static getStubConfig() {
    return {
      type: "custom:image-card-feature",
      image_url: "",
      use_entity_picture: true,
      clip_shape: "circle",
      image_fit: "cover",
      width: "40px",
      height: "40px"
    };
  }

  /**
   * Configures visual parameters on startup.
   * 
   * @param {Object} config - Raw feature config
   */
  setConfig(config) {
    this.config = config;
  }

  /**
   * Renders the image card feature.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.hass || !this.config) return html``;

    // Use explicit overridden entity or fallback to parent card stateObj
    const entityId = this.config.entity || this.stateObj?.entity_id;
    const stateObj = entityId ? this.hass.states[entityId] : null;

    let imageUrl = "";

    // If explicit image URL is configured, use it first
    if (this.config.image_url) {
      imageUrl = this.config.image_url;
    } else if (stateObj) {
      const isCamera = entityId.startsWith("camera.");
      if (isCamera) {
        // Camera snapshot url
        const token = stateObj.attributes.access_token;
        imageUrl = `/api/camera_proxy/${entityId}?token=${token}`;
      } else if (this.config.use_entity_picture !== false && stateObj.attributes.entity_picture) {
        imageUrl = stateObj.attributes.entity_picture;
      }
    }

    if (!imageUrl) {
      return html`<div class="error">${this._localize('no_image_source')}</div>`;
    }

    const shape = this.config.clip_shape || "circle";
    const fit = this.config.image_fit || "cover";
    const width = this.config.width || "40px";
    const height = this.config.height || "40px";

    const style = `
      width: ${width};
      height: ${height};
      object-fit: ${fit};
      border-radius: ${shape === "circle" ? "50%" : "var(--ha-card-border-radius, 4px)"};
    `;

    return html`
      ${this.renderStyle('image-card-feature.css')}
      <div class="image-feature-container" style="width: ${width}; height: ${height};">
        <img src="${imageUrl}" style="${style}" alt="feature image" />
      </div>
    `;
  }
}

customElements.define("image-card-feature", ImageCardFeature);

window.customCardFeatures = window.customCardFeatures || [];
window.customCardFeatures.push({
  type: "custom:image-card-feature",
  name: "Image Display",
  configurable: true,
  tags: ["multi-state-card", "multi-property-card", "room-status-card"],
});
