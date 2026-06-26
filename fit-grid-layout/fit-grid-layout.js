import { HAControlBase, html } from "../ha-control-base.js?v=0.6.7";

/**
 * FitGridLayout
 * A custom Home Assistant view layout card that renders child cards inside a CSS Grid container.
 * Automatically monitors available screen space using ResizeObserver and dynamically scales down the content
 * (maintaining layout proportions) via CSS transform scale so that it fits the screen exactly without overflowing.
 *
 * @extends HAControlBase
 */
class FitGridLayout extends HAControlBase {
  static get properties() {
    return {
      ...super.properties,
      config: {},
      cards: { type: Array }
    };
  }

  constructor() {
    super();
    this.cards = [];
    this._resizeObserver = null;
    this._calculateScaleDebounced = this._debounce(() => this._calculateScale(), 30);
  }

  firstUpdated() {
    // Watch size changes on the host element
    this._resizeObserver = new ResizeObserver(() => this._calculateScaleDebounced());
    this._resizeObserver.observe(this);

    // Watch resize changes on the window
    window.addEventListener("resize", this._calculateScaleDebounced);

    // Initial scale computation
    setTimeout(() => this._calculateScale(), 50);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    window.removeEventListener("resize", this._calculateScaleDebounced);
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has("cards") || changedProperties.has("config") || changedProperties.has("hass")) {
      // Propagate state object updates to all child card elements
      if (this.cards && Array.isArray(this.cards)) {
        this.cards.forEach(card => {
          if (card) card.hass = this.hass;
        });
      }
      this._calculateScaleDebounced();
    }
  }

  /**
   * Simple debouncing utility to prevent layout thrashing.
   */
  _debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Measures unscaled grid content size vs available host size and applies scale transformation.
   */
  _calculateScale() {
    const container = this.shadowRoot.getElementById("grid-container");
    if (!container) return;

    // 1. Get host's actual available dimensions
    const availableWidth = this.clientWidth || window.innerWidth;
    const availableHeight = this.clientHeight || (window.innerHeight - 56);

    if (availableWidth <= 0 || availableHeight <= 0) return;

    // Disable transition during measurement to get instant dimension values
    const originalTransition = container.style.transition;
    container.style.transition = "none";

    // 2. Temporarily render at scale 1.0 to measure natural dimensions
    container.style.transform = "none";
    container.style.width = `${availableWidth}px`;
    container.style.height = `${availableHeight}px`;

    // Force a reflow
    container.offsetHeight;

    // 3. Obtain scroll dimensions
    const contentWidth = container.scrollWidth;
    const contentHeight = container.scrollHeight;

    // Re-enable original transition
    container.style.transition = originalTransition;

    // 4. Compute optimal scale factor
    const scaleX = contentWidth > 0 ? (availableWidth / contentWidth) : 1.0;
    const scaleY = contentHeight > 0 ? (availableHeight / contentHeight) : 1.0;

    // Proportional scale down only (never zoom in)
    let scale = Math.min(scaleX, scaleY);
    if (scale > 1.0) scale = 1.0;
    if (scale < 0.2) scale = 0.2; // Don't scale down past 20% to keep things legible

    // 5. Apply scale transforms and size corrections
    if (scale < 1.0) {
      container.style.width = `${availableWidth / scale}px`;
      container.style.height = `${availableHeight / scale}px`;
      container.style.transform = `scale(${scale})`;
      container.style.transformOrigin = "top left";
    } else {
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.transform = "none";
    }
  }

  setConfig(config) {
    this.config = config;
  }

  render() {
    if (!this.config || !this.hass) return html``;

    const layout = this.config.layout || {};

    // Standardize grid-template-areas configuration
    let areas = "none";
    if (layout['grid-template-areas']) {
      areas = layout['grid-template-areas'].replace(/\r?\n/g, ' ').trim();
    }

    const gridStyle = `
      display: grid;
      grid-template-columns: ${layout['grid-template-columns'] || '1fr'};
      grid-template-rows: ${layout['grid-template-rows'] || 'auto'};
      grid-template-areas: ${areas};
      gap: ${layout.gap || '8px'};
      box-sizing: border-box;
      padding: ${layout.padding || '8px'};
    `;

    return html`
      ${this.renderStyle("fit-grid-layout.css")}
      <div id="grid-container" style="${gridStyle}">
        ${(this.cards || []).map((card, index) => {
          const cardConfig = (this.config.cards && this.config.cards[index]) || {};
          const viewLayout = cardConfig.view_layout || {};
          const gridArea = viewLayout.grid_area || '';
          const placeSelf = viewLayout.place_self || '';

          const style = `
            ${gridArea ? `grid-area: ${gridArea};` : ''}
            ${placeSelf ? `place-self: ${placeSelf};` : ''}
            width: 100%;
            height: 100%;
            box-sizing: border-box;
          `;
          return html`
            <div class="grid-item-wrapper" style="${style}">
              ${card}
            </div>
          `;
        })}
      </div>
    `;
  }
}

customElements.define("fit-grid-layout", FitGridLayout);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "fit-grid-layout",
  name: "Fit Grid Layout",
  description: "A custom view layout engine that automatically scales dashboard grids to fit screen dimensions exactly.",
  preview: false
});
