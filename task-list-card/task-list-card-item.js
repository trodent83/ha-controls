import { HAControlBase, html } from "../ha-control-base.js?v=0.6.9";
import { parseHtml } from "../utilities/html-parser.js?v=1.0.0";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.35';

/**
 * TaskListCardItem
 * Renders an individual task item detail line, including description block,
 * sources tracking badges, completion toggling checkboxes, and separator boundaries.
 * 
 * @extends HAControlBase
 */
class TaskListCardItem extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * Tracks task object, separators display toggles, and readonly states.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return {
      ...super.properties,
      config: { attribute: false },
      task: { attribute: false },
      hasSeparator: { type: Boolean },
      readonly: { type: Boolean }
    };
  }

  /**
   * Forces a render update on this individual task element.
   */
  updateTask() {
    this.requestUpdate();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  /**
   * Starts long-press hold timer when pointer goes down on a task item.
   * 
   * @param {PointerEvent} e
   * @private
   */
  _handleDown(e) {
    if (this.readonly) return;
    this._isHolding = false;
    this._startX = e.clientX;
    this._startY = e.clientY;
    const holdDelay = parseInt(this.config.hold_delay_ms, 10) || 500;
    this._longPressTimer = setTimeout(() => {
      this._isHolding = true;
      this._handleHold();
    }, holdDelay);
  }

  /**
   * Cleans up timer when pointer is lifted.
   * 
   * @param {PointerEvent} e
   * @private
   */
  _handleUp(e) {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  /**
   * Cancels long-press hold when pointer leaves or is interrupted.
   * 
   * @param {PointerEvent} e
   * @private
   */
  _handleCancel(e) {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
    this._isHolding = false;
  }

  /**
   * Cancels long-press hold if pointer moves more than 10px (e.g. during scroll).
   * 
   * @param {PointerEvent} e
   * @private
   */
  _handleMove(e) {
    if (this._longPressTimer && this._startX !== undefined && this._startY !== undefined) {
      const dx = Math.abs(e.clientX - this._startX);
      const dy = Math.abs(e.clientY - this._startY);
      if (dx > 10 || dy > 10) {
        this._handleCancel(e);
      }
    }
  }

  /**
   * Dispatches custom 'hold-task' event when long-press threshold is reached.
   * 
   * @private
   */
  _handleHold() {
    this.dispatchEvent(new CustomEvent('hold-task', {
      bubbles: true,
      composed: true,
      detail: { task: this.task }
    }));
  }

  /**
   * Click event handler. Dispatches a custom 'toggle-task' event to the card row/container
   * if interactions are not blocked due to read-only mode or future task configuration limits.
   * Suppresses click if a hold action was completed.
   * 
   * @param {MouseEvent} [e]
   * @private
   */
  _toggle(e) {
    if (this._isHolding) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      this._isHolding = false;
      return;
    }
    const blockFuture = String(this.config.block_future_toggles) !== 'false';
    if (this.readonly || (blockFuture && this.task.isFuture)) return;
    this.dispatchEvent(new CustomEvent('toggle-task', {
      bubbles: true,
      composed: true,
      detail: { task: this.task }
    }));
  }

  /**
   * Resolves the directory path hosting the translation localizations.
   * 
   * @type {string}
   */
  get translationPath() { return "/local/ha-controls/task-list-card/translations"; }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() { return VERSION; }

  /**
   * Renders the custom card item HTML template.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult} The rendered template output
   */
  render() {
    if (!this.task || !this.config || !this.hass) return html``;

    const t = this.task;
    const done = t.isCompleted;

    let hidden = !t.isVisible;

    const separatorColor = this.config.merged_tasks_separator_color || 'var(--divider-color)';
    const separatorClass = this.hasSeparator ? 'task-item-separator' : '';
    const separatorStyle = (this.hasSeparator ? `border-bottom-color: ${separatorColor};` : '') + (hidden ? 'display: none;' : '');

    const blockFuture = String(this.config.block_future_toggles) !== 'false';
    const isFutureBlocked = blockFuture && t.isFuture;
    const isDisabled = this.readonly || isFutureBlocked;

    return html`
      ${this.renderStyle('task-list-card-item.css')}
      <div 
        class="task-item ${done ? 'done' : ''} ${separatorClass} ${isDisabled ? 'readonly' : ''}" 
        @pointerdown="${this._handleDown}"
        @pointerup="${this._handleUp}"
        @pointercancel="${this._handleCancel}"
        @pointerleave="${this._handleCancel}"
        @pointermove="${this._handleMove}"
        @click="${this._toggle}" 
        style="${separatorStyle}">
        <span class="task-name">${t.summary}</span>
        ${this.config.show_description && t.description ? html`<span class="task-description">${parseHtml(t.description)}</span>` : ''}
        ${this.config.show_source ? (() => {
        const entity = this.hass.states[t.entity_id];
        if (!entity) return '';
        const style = this.config.source_color ? `--source-color: ${this.config.source_color}` : '';
        return html`<div class="task-source" style=${style}><ha-icon icon="${entity.attributes.icon || 'mdi:checkbox-marked-circle-outline'}"></ha-icon><span>${entity.attributes.friendly_name || t.entity_id}</span></div>`;
      })() : ''}
      </div>
    `;
  }
}
customElements.define("task-list-card-item", TaskListCardItem);