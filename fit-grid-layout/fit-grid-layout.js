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
  static getConfigElement() {
    return document.createElement("fit-grid-layout-editor");
  }

  static get properties() {
    return {
      ...super.properties,
      config: {},
      cards: { type: Array },
      _activePopup: { type: Boolean, state: true },
      _popupEl: { type: Object, state: true },
      _popupHeading: { type: String, state: true }
    };
  }

  constructor() {
    super();
    this.cards = [];
    this._activePopup = false;
    this._popupEl = null;
    this._popupHeading = "";
    this._resizeObserver = null;
    this._calculateScaleDebounced = this._debounce(() => this._calculateScale(), 30);
  }

  firstUpdated() {
    // Watch size changes on the host element
    this._resizeObserver = new ResizeObserver(() => this._calculateScaleDebounced());
    this._resizeObserver.observe(this);

    // Watch resize changes on the window
    window.addEventListener("resize", this._calculateScaleDebounced);

    // Listen to custom popup events and standard Lovelace actions
    this.addEventListener("show-grid-popup", (e) => this._handleShowPopup(e));
    this.addEventListener("close-grid-popup", () => this._handleClosePopup());
    this.addEventListener("ll-custom", (e) => this._handleLLCustom(e));

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
      // Dynamically apply configured layout height to the host element
      if (this.config && this.config.layout && this.config.layout.height) {
        this.style.height = this.config.layout.height;
      } else {
        this.style.height = "";
      }

      // Propagate state object updates to all child card elements
      if (this.cards && Array.isArray(this.cards)) {
        this.cards.forEach(card => {
          if (card) card.hass = this.hass;
        });
      }
      this._calculateScaleDebounced();
    }
    // Propagate state object updates to the active popup card if one is open
    if (changedProperties.has("hass") && this._popupEl) {
      this._popupEl.hass = this.hass;
    }
  }

  _handleShowPopup(e) {
    const detail = e.detail;
    if (!detail) return;
    this._showPopup(detail);
  }

  _handleLLCustom(e) {
    const detail = e.detail;
    if (!detail) return;

    if (detail.grid_popup_close) {
      e.stopPropagation();
      // If closing also triggers a service call
      const service = detail.perform_action || detail.service;
      if (service) {
        const [domain, serviceName] = service.split('.');
        this.hass.callService(domain, serviceName, detail.data, detail.target);
      }
      this._handleClosePopup();
      return;
    }

    const popupDetail = detail.grid_popup || detail.group_popup;
    if (popupDetail) {
      e.stopPropagation();
      this._showPopup(popupDetail);
    }
  }

  _showPopup(popupDetail) {
    let heading = "";
    let cardConfig = null;

    // Check if configuration is nested inside heading/body
    if (popupDetail.body) {
      heading = popupDetail.heading || "";
      cardConfig = popupDetail.body;
    } else {
      cardConfig = popupDetail;
    }

    // Support static config lookup via popup_id
    if (popupDetail.popup_id && this.config.popups && this.config.popups[popupDetail.popup_id]) {
      const staticPopup = this.config.popups[popupDetail.popup_id];
      if (staticPopup.body) {
        heading = staticPopup.heading || heading;
        cardConfig = staticPopup.body;
      } else {
        cardConfig = staticPopup;
      }
    }

    if (!cardConfig || !cardConfig.type) return;

    const { type, ...config } = cardConfig;
    const fullConfig = { type, ...config };

    let tag = type;
    if (tag.startsWith("custom:")) {
      tag = tag.slice(7);
    } else if (!tag.startsWith("hui-")) {
      tag = `hui-${tag}-card`;
    }

    const createCard = () => {
      try {
        const el = document.createElement(tag);
        el.setConfig(fullConfig);
        el.hass = this.hass;
        this._popupEl = el;
        this._popupHeading = heading;
        this._activePopup = true;
        this.requestUpdate();
      } catch (err) {
        console.error(`[FitGridLayout] Failed to create popup card of type "${tag}":`, err);
      }
    };

    if (customElements.get(tag)) {
      createCard();
    } else {
      customElements.whenDefined(tag).then(() => {
        createCard();
      }).catch((err) => {
        console.error(`[FitGridLayout] Element "${tag}" is undefined or failed to load:`, err);
      });
    }
  }

  _handleClosePopup() {
    this._activePopup = false;
    this._popupEl = null;
    this._popupHeading = "";
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

    // Prevent ResizeObserver loops by skipping if host size hasn't changed since last scale calculation
    if (this._lastWidth === availableWidth && this._lastHeight === availableHeight) {
      return;
    }
    this._lastWidth = availableWidth;
    this._lastHeight = availableHeight;

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

  _getViewLayout(card, index) {
    if (!card) return {};
    const cardConfig = card.config || card._config || (card.host && (card.host.config || card.host._config));
    if (cardConfig && cardConfig.view_layout) {
      return cardConfig.view_layout;
    }
    if (this.config && this.config.cards && this.config.cards[index]) {
      return this.config.cards[index].view_layout || {};
    }
    return {};
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
      <div id="grid-container" class="${this._activePopup ? 'popup-active' : ''}" style="${gridStyle}">
        ${(this.cards || []).map((card, index) => {
          const viewLayout = this._getViewLayout(card, index);
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

      ${this._activePopup && this._popupEl ? html`
        <div class="popup-scrim" @click="${this._handleClosePopup}"></div>
        <div class="popup-window-container">
          <div class="popup-card-wrapper">
            ${this._popupHeading ? html`
              <div class="popup-header">
                <h3>${this._popupHeading}</h3>
              </div>
            ` : html``}
            <div class="popup-body">
              ${this._popupEl}
            </div>
            <button class="popup-close-btn" @click="${this._handleClosePopup}">×</button>
          </div>
        </div>
      ` : html``}
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
