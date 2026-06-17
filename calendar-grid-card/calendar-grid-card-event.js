import { HAControlBase, html } from "../ha-control-base.js?v=0.6.0";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '0.4.21';

/**
 * CalendarGridCardEvent
 * Renders an individual calendar event line entry within day cells inside the calendar grid layout.
 * Supports past/active highlights, custom colors overrides, toggleable event descriptions panels,
 * and icon pulse/spin animations.
 * Renders without shadow DOM to align layouts cleanly inside parent containers.
 * 
 * @extends HAControlBase
 */
class CalendarGridCardEvent extends HAControlBase {
    /**
     * Defines reactive properties tracked by LitElement.
     * Tracks event models, colors config, and active details panel visibility.
     * 
     * @static
     * @returns {Object} LitElement properties definition
     */
    static get properties() {
        return {
            ...super.properties,
            event: { attribute: false },
            day: { attribute: false },
            color: { attribute: false },
            backgroundColor: { attribute: false },
            iconColor: { attribute: false },
            activeColor: { attribute: false },
            activeBackgroundColor: { attribute: false },
            activeIconAnimation: { attribute: false }
        };
    }

    /**
     * Instantiates a CalendarGridCardEvent custom element.
     */
    constructor() {
        super();
    }

    /**
     * Returns this element directly as the render container, bypasses default Shadow DOM mounting.
     * 
     * @returns {HTMLElement} The root node to append rendered templates to
     */
    createRenderRoot() {
        return this;
    }

    /**
     * Resolves the directory path hosting the translation localizations.
     * 
     * @type {string}
     */
    get translationPath() { return "/local/ha-controls/calendar-grid-card/translations"; }

    /**
     * Version parameter for translation cache-busting.
     * 
     * @type {string}
     */
    get translationVersion() { return VERSION; }

    /**
     * Renders the custom card event HTML template.
     * 
     * @protected
     * @returns {import('lit-html').TemplateResult} The rendered template output
     */
    render() {
        if (!this.event || !this.day) return html``;
        
        const lang = this.hass ? this.hass.language : undefined;
        const timeStr = this.event.getTimeStr(this.day, lang);
        const now = new Date();
        const isPast = this.event.end < now;
        const isActive = this.event.start <= now && this.event.end >= now;
        const icon = isPast ? "mdi:circle-outline" : "mdi:circle";
        const hasDescription = !!this.event.originEvent.description;

        const style = [];
        if (isActive && this.activeColor) {
            style.push(`color: ${this.activeColor}`);
        } else if (this.color) {
            style.push(`color: ${this.color}`);
        }
        if (isActive && this.activeBackgroundColor) {
            style.push(`background-color: ${this.activeBackgroundColor}`);
        } else if (this.backgroundColor) {
            style.push(`background-color: ${this.backgroundColor}`);
        }
        const iconStyle = this.iconColor ? `color: ${this.iconColor}` : "color: var(--primary-color)";
        const animationClass = (isActive && this.activeIconAnimation) ? this.activeIconAnimation : '';

        return html`
            ${this.renderStyle('calendar-grid-card-event.css')}
            <div class="event-entry ${isPast ? 'past' : ''}" style="${style.join(';')}" @click=${this._handleClick}>
                <div class="event-header">
                    <ha-icon class="event-icon ${animationClass}" icon="${icon}" style="${iconStyle}"></ha-icon>
                    ${timeStr ? html`<span class="event-time">${timeStr}</span>` : ''}
                    <span class="event-title">${this.event.summary}</span>
                    ${hasDescription ? html`<ha-icon class="description-icon" icon="mdi:text-short"></ha-icon>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Handles clicks on the event entry and dispatches custom event-click event.
     * 
     * @param {Event} e - Click event details
     * @private
     */
    _handleClick(e) {
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent('event-click', { detail: { event: this.event } }));
    }
}
customElements.define("calendar-grid-card-event", CalendarGridCardEvent);