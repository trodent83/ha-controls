import { HAControlBase, html } from "../ha-control-base.js?v=0.6.8";

const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.1.14';

/**
 * FitGridLayout
 * A custom Home Assistant view layout card that renders child cards inside a CSS Grid container.
 * Automatically monitors available screen space using ResizeObserver and MutationObserver,
 * and dynamically scales down the content (maintaining layout proportions) via CSS transform scale
 * so that it fits the screen exactly without overflowing or requiring vertical scrolling.
 *
 * @extends HAControlBase
 */
class FitGridLayout extends HAControlBase {
  static getConfigElement() {
    return document.createElement("fit-grid-layout-editor");
  }

  get translationPath() {
    return "/local/ha-controls/fit-grid-layout/translations";
  }

  get translationVersion() {
    return VERSION;
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
    this._mutationObserver = null;
    this._lastWidth = null;
    this._lastHeight = null;
    this._lastContentWidth = null;
    this._lastContentHeight = null;
    this._lastScale = null;
    this._calculateScaleDebounced = this._debounce(() => this._calculateScale(), 30);

    // Document visibility change listener to clear cached dimensions and recalculate on wakeup
    this._handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        this._lastWidth = null;
        this._lastHeight = null;
        this._lastContentWidth = null;
        this._lastContentHeight = null;
        this._lastScale = null;
        this._schedulePostUpdateCalculations();
      }
    };
  }

  firstUpdated() {
    // Watch size changes on observed elements
    this._resizeObserver = new ResizeObserver(() => this._calculateScaleDebounced());
    this._observeElements();
    this._setupMutationObserver();

    // Watch resize changes on the window
    window.addEventListener("resize", this._calculateScaleDebounced);

    // Listen to screen visibility shifts (e.g. tablet screen sleep/wakeup)
    document.addEventListener("visibilitychange", this._handleVisibilityChange);

    // Listen to custom popup events and standard Lovelace actions
    this.addEventListener("show-grid-popup", (e) => this._handleShowPopup(e));
    this.addEventListener("close-grid-popup", () => this._handleClosePopup());
    this.addEventListener("ll-custom", (e) => this._handleLLCustom(e));

    // Listen for size/content mutation events capturing across the DOM tree
    const eventTypes = [
      "iron-resize",
      "card-resized",
      "ll-rebuild",
      "location-changed",
      "hass-api-called",
      "load",
      "transitionend",
      "animationend"
    ];
    eventTypes.forEach(evt => {
      this.addEventListener(evt, () => this._calculateScaleDebounced(), { capture: true, passive: true });
    });

    // Staggered initial scale computations to catch async card loads
    this._schedulePostUpdateCalculations();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    if (this._mutationObserver) {
      this._mutationObserver.disconnect();
    }
    window.removeEventListener("resize", this._calculateScaleDebounced);
    document.removeEventListener("visibilitychange", this._handleVisibilityChange);
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
      this._observeElements();
      this._setupMutationObserver();
      this._schedulePostUpdateCalculations();
    }
    // Propagate state object updates to the active popup card if one is open
    if (changedProperties.has("hass") && this._popupEl) {
      this._popupEl.hass = this.hass;
    }
  }

  /**
   * Schedules multiple post-update recalculations to catch async network responses,
   * card renders, and font/image loading.
   */
  _schedulePostUpdateCalculations() {
    this._calculateScaleDebounced();
    [50, 150, 400, 800, 1500, 3000].forEach(delay => {
      setTimeout(() => {
        if (this.isConnected) {
          this._observeElements();
          this._setupMutationObserver();
          this._calculateScaleDebounced();
        }
      }, delay);
    });
  }

  /**
   * Attaches ResizeObserver to host, container, item wrappers, child cards, and shadow DOM children.
   */
  _observeElements() {
    if (!this._resizeObserver) return;

    this._resizeObserver.observe(this);
    const container = this.shadowRoot?.getElementById("grid-container");
    if (container) {
      this._resizeObserver.observe(container);
    }

    const wrappers = this.shadowRoot?.querySelectorAll(".grid-item-wrapper") || [];
    wrappers.forEach(wrapper => {
      this._resizeObserver.observe(wrapper);
      const card = wrapper.firstElementChild;
      if (card) {
        this._resizeObserver.observe(card);
        if (card.shadowRoot) {
          Array.from(card.shadowRoot.children).forEach(child => {
            try {
              this._resizeObserver.observe(child);
            } catch (e) {}
          });
        }
      }
    });
  }

  /**
   * Attaches MutationObserver to observe DOM structural changes in container and card shadow DOMs.
   */
  _setupMutationObserver() {
    if (!this._mutationObserver) {
      this._mutationObserver = new MutationObserver(() => {
        this._observeElements();
        this._calculateScaleDebounced();
      });
    } else {
      this._mutationObserver.disconnect();
    }

    const container = this.shadowRoot?.getElementById("grid-container");
    if (container) {
      try {
        this._mutationObserver.observe(container, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true
        });
      } catch (e) {}
    }

    const wrappers = this.shadowRoot?.querySelectorAll(".grid-item-wrapper") || [];
    wrappers.forEach(wrapper => {
      const card = wrapper.firstElementChild;
      if (card && card.shadowRoot) {
        try {
          this._mutationObserver.observe(card.shadowRoot, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
          });
        } catch (e) {}
      }
    });
  }

  get _debugEnabled() {
    return window.haControlsDebug || window.location?.search?.includes('ha_debug') || this.config?.debug;
  }

  _handleShowPopup(e) {
    const detail = e.detail;
    if (!detail) return;
    this._showPopup(detail);
  }

  _handleLLCustom(e) {
    const detail = e.detail;
    if (this._debugEnabled) {
      console.log("[FitGridLayout] RECEIVED ll-custom event! detail:", JSON.stringify(detail));
    }
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

  async _showPopup(popupDetail) {
    if (this._debugEnabled) {
      console.log("[FitGridLayout] _showPopup triggered! popupDetail:", JSON.stringify(popupDetail));
    }
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

    if (this._debugEnabled) {
      console.log("[FitGridLayout] Resolved popup cardConfig:", JSON.stringify(cardConfig), "heading:", heading);
    }

    if (!cardConfig || !cardConfig.type) {
      console.warn("[FitGridLayout] Missing cardConfig or cardConfig.type in popup!");
      return;
    }

    try {
      let el;
      if (window.loadCardHelpers) {
        if (this._debugEnabled) {
          console.log("[FitGridLayout] Creating card element via window.loadCardHelpers");
        }
        const helpers = await window.loadCardHelpers();
        el = helpers.createCardElement(cardConfig);
      } else {
        if (this._debugEnabled) {
          console.log("[FitGridLayout] loadCardHelpers unavailable, falling back to manual creation");
        }
        let tag = cardConfig.type;
        if (tag.startsWith("custom:")) {
          tag = tag.slice(7);
        } else if (!tag.startsWith("hui-")) {
          tag = `hui-${tag}-card`;
        }
        el = document.createElement(tag);
        el.setConfig(cardConfig);
      }
      
      el.hass = this.hass;
      this._popupEl = el;
      this._popupHeading = heading;
      this._activePopup = true;
      this.requestUpdate();
    } catch (err) {
      console.error(`[FitGridLayout] Failed to create popup card:`, err);
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
    const container = this.shadowRoot?.getElementById("grid-container");
    if (!container) return;

    // 1. Get host's actual available dimensions
    const availableWidth = this.clientWidth || window.innerWidth;
    
    // Determine exact remaining viewport height below card top
    const rect = this.getBoundingClientRect();
    const headerHeight = parseInt(getComputedStyle(this).getPropertyValue('--header-height')) || 56;
    const topOffset = rect.top > 0 ? rect.top : headerHeight;
    const viewportRemaining = Math.max(100, window.innerHeight - topOffset);

    // Available height capped strictly at viewport remaining space to prevent vertical scrolling
    const availableHeight = this.clientHeight > 0
      ? Math.min(this.clientHeight, viewportRemaining)
      : viewportRemaining;

    if (availableWidth <= 0 || availableHeight <= 0) return;

    this.style.setProperty('--fit-available-width', `${availableWidth}px`);
    this.style.setProperty('--fit-available-height', `${availableHeight}px`);
    document.documentElement.style.setProperty('--fit-available-width', `${availableWidth}px`);
    document.documentElement.style.setProperty('--fit-available-height', `${availableHeight}px`);

    // Disable transition and force hidden overflow during measurement
    const originalTransition = container.style.transition;
    const originalOverflow = container.style.overflow;
    container.style.transition = "none";
    container.style.overflow = "hidden";

    // 2. Temporarily render at scale 1.0 with auto height to measure natural dimensions
    container.style.transform = "none";
    container.style.width = `${availableWidth}px`;
    container.style.height = "auto";

    // Force a reflow
    container.offsetHeight;

    // 3. Obtain unscaled natural content dimensions
    let contentWidth = container.scrollWidth;
    let contentHeight = Math.max(container.scrollHeight, container.offsetHeight);

    // Calculate maximum bottom coordinate of all child card wrappers to account for shadow DOM content overflow
    const containerPaddingBottom = parseInt(getComputedStyle(container).paddingBottom) || 8;
    let maxChildBottom = 0;
    const wrappers = container.querySelectorAll(".grid-item-wrapper");

    wrappers.forEach(w => {
      const wTop = w.offsetTop;
      const wHeight = Math.max(w.offsetHeight || 0, w.scrollHeight || 0);
      let maxCardHeight = wHeight;

      const card = w.firstElementChild;
      if (card) {
        const cHeight = Math.max(card.offsetHeight || 0, card.scrollHeight || 0);
        maxCardHeight = Math.max(maxCardHeight, cHeight);

        if (card.shadowRoot) {
          Array.from(card.shadowRoot.children).forEach(sChild => {
            const sHeight = Math.max(sChild.offsetHeight || 0, sChild.scrollHeight || 0);
            maxCardHeight = Math.max(maxCardHeight, sHeight);
          });
        }
      }

      const itemBottom = wTop + maxCardHeight;
      if (itemBottom > maxChildBottom) {
        maxChildBottom = itemBottom;
      }
    });

    if (maxChildBottom > 0) {
      contentHeight = Math.max(contentHeight, maxChildBottom + containerPaddingBottom);
    }

    // 4. Compute optimal scale factor
    const scaleX = contentWidth > 0 ? (availableWidth / contentWidth) : 1.0;
    const scaleY = contentHeight > 0 ? (availableHeight / contentHeight) : 1.0;

    // Proportional scale down only (never zoom in)
    let scale = Math.min(scaleX, scaleY);
    if (scale > 1.0) scale = 1.0;
    if (scale < 0.2) scale = 0.2; // Don't scale down past 20% to keep things legible

    const roundedScale = Math.round(scale * 1000) / 1000;

    // Prevent ResizeObserver loops by skipping if host size and content size haven't changed
    if (
      this._lastWidth === availableWidth &&
      this._lastHeight === availableHeight &&
      this._lastContentWidth === contentWidth &&
      this._lastContentHeight === contentHeight &&
      this._lastScale === roundedScale
    ) {
      container.style.transition = originalTransition;
      container.style.overflow = originalOverflow;
      return;
    }

    this._lastWidth = availableWidth;
    this._lastHeight = availableHeight;
    this._lastContentWidth = contentWidth;
    this._lastContentHeight = contentHeight;
    this._lastScale = roundedScale;

    this.style.setProperty('--fit-layout-scale', `${roundedScale}`);
    document.documentElement.style.setProperty('--fit-layout-scale', `${roundedScale}`);

    const popupMaxWidth = `${Math.min(920, availableWidth * 0.92 / roundedScale)}px`;
    const popupMaxHeight = `${Math.min(800, availableHeight * 0.92 / roundedScale)}px`;
    const overlayWidth = `${100 / roundedScale}vw`;
    const overlayHeight = `${100 / roundedScale}vh`;

    this.style.setProperty('--fit-popup-max-width', popupMaxWidth);
    this.style.setProperty('--fit-popup-max-height', popupMaxHeight);
    this.style.setProperty('--fit-popup-overlay-width', overlayWidth);
    this.style.setProperty('--fit-popup-overlay-height', overlayHeight);

    document.documentElement.style.setProperty('--fit-popup-max-width', popupMaxWidth);
    document.documentElement.style.setProperty('--fit-popup-max-height', popupMaxHeight);
    document.documentElement.style.setProperty('--fit-popup-overlay-width', overlayWidth);
    document.documentElement.style.setProperty('--fit-popup-overlay-height', overlayHeight);

    // 5. Apply scale transforms and size corrections
    if (roundedScale < 1.0) {
      container.style.width = `${availableWidth / roundedScale}px`;
      container.style.height = `${availableHeight / roundedScale}px`;
      container.style.transform = `scale(${roundedScale})`;
      container.style.transformOrigin = "top left";
    } else {
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.transform = "none";
    }

    // Re-enable original transition and overflow
    container.style.transition = originalTransition;
    container.style.overflow = originalOverflow;
  }

  _isConfigMatch(c1, c2) {
    if (!c1 || !c2) return false;
    if (c1.type !== c2.type) return false;
    if (c1.entity !== c2.entity) return false;
    if (c1.name !== c2.name) return false;
    if (c1.title !== c2.title) return false;
    
    // For grid cards, compare child card types to ensure correct match
    if (c1.cards && c2.cards) {
      if (c1.cards.length !== c2.cards.length) return false;
      for (let i = 0; i < c1.cards.length; i++) {
        const type1 = c1.cards[i] ? c1.cards[i].type : undefined;
        const type2 = c2.cards[i] ? c2.cards[i].type : undefined;
        if (type1 !== type2) return false;
      }
    }
    
    return true;
  }

  _getViewLayout(card, index) {
    if (!card) return {};
    
    const cardConfig = card.config || card._config || (card.host && (card.host.config || card.host._config));
    
    if (cardConfig) {
      if (cardConfig.view_layout) {
        return cardConfig.view_layout;
      }
      
      // Match card structurally against original configs to resolve correct view_layout
      if (this.config && this.config.cards) {
        const matched = this.config.cards.find(c => this._isConfigMatch(c, cardConfig));
        if (matched && matched.view_layout) {
          return matched.view_layout;
        }
      }
    }
    
    // Fallback to index matching
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
          const gridArea = viewLayout['grid-area'] || viewLayout.grid_area || viewLayout.gridArea || '';
          const placeSelf = viewLayout['place-self'] || viewLayout.place_self || viewLayout.placeSelf || '';
          const alignSelf = viewLayout['align-self'] || viewLayout.align_self || viewLayout.alignSelf || '';
          const justifySelf = viewLayout['justify-self'] || viewLayout.justify_self || viewLayout.justifySelf || '';

          const style = `
            ${gridArea ? `grid-area: ${gridArea};` : ''}
            ${placeSelf ? `place-self: ${placeSelf};` : ''}
            ${alignSelf ? `align-self: ${alignSelf};` : ''}
            ${justifySelf ? `justify-self: ${justifySelf};` : ''}
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
