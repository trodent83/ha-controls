const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

class CalendarGridCardEvent extends LitElement {
    static get properties() {
        return {
            event: { attribute: false },
            day: { attribute: false },
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

        return html`
            <div class="event-entry ${this._expanded ? 'expanded' : ''}" @click=${this._handleClick}>
                <div class="event-header">
                    ${timeStr ? html`<span class="event-time">${timeStr}</span>` : ''}
                    <span class="event-title">${this.event.summary}</span>
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