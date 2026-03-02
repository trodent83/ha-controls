const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

class CalendarGridCardEvent extends LitElement {
    static get properties() {
        return {
            event: { attribute: false },
            day: { attribute: false },
            color: { attribute: false },
            backgroundColor: { attribute: false },
            iconColor: { attribute: false },
            _expanded: { state: true }
        };
    }

    constructor() {
        super();
        this._expanded = false;
    }

    createRenderRoot() {
        return this;
    }

    render() {
        if (!this.event || !this.day) return html``;
        
        const timeStr = this.event.getTimeStr(this.day);
        const isPast = this.event.end < new Date();
        const icon = isPast ? "mdi:circle-outline" : "mdi:circle";
        const hasDescription = !!this.event.originEvent.description;

        const style = [];
        if (this.color) style.push(`color: ${this.color}`);
        if (this.backgroundColor) style.push(`background-color: ${this.backgroundColor}`);
        const iconStyle = this.iconColor ? `color: ${this.iconColor}` : "";

        return html`
            <link rel="stylesheet" href="/local/ha-controls/calendar-grid-card/calendar-grid-card-event.css?v=0.0.28">
            <div class="event-entry ${this._expanded ? 'expanded' : ''} ${isPast ? 'past' : ''}" style="${style.join(';')}" @click=${this._handleClick}>
                <div class="event-header">
                    <ha-icon class="event-icon" icon="${icon}" style="${iconStyle}"></ha-icon>
                    ${timeStr ? html`<span class="event-time">${timeStr}</span>` : ''}
                    <span class="event-title">${this.event.summary}</span>
                    ${hasDescription ? html`<ha-icon class="description-icon" icon="mdi:text-short"></ha-icon>` : ''}
                </div>
                ${this._expanded && this.event.originEvent.description ? html`<div class="event-description">${this.event.originEvent.description}</div>` : ''}
            </div>
        `;
    }

    _handleClick(e) {
        e.stopPropagation();
        this._expanded = !this._expanded;
        this.dispatchEvent(new CustomEvent('event-click', { detail: { event: this.event.originEvent } }));
    }
}
customElements.define("calendar-grid-card-event", CalendarGridCardEvent);