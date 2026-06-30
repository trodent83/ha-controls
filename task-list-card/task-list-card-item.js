import { HAControlBase, html } from "../ha-control-base.js?v=0.6.8";
import { parseHtml } from "../utilities/html-parser.js?v=1.0.0";

/**
 * Cache-busting version parameter for dynamic asset loading, parsed from module import query string.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.2';

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

  /**
   * Click event handler. Dispatches a custom 'toggle-task' event to the card row/container
   * if interactions are not blocked due to read-only mode or future task configuration limits.
   * 
   * @private
   */
  _toggle() {
    const blockFuture = String(this.config.block_future_toggles) !== 'false';
    if (this.readonly || (blockFuture && this.task.isFuture)) return;
    this.dispatchEvent(new CustomEvent('toggle-task', { detail: { task: this.task } }));
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
      <div class="task-item ${done ? 'done' : ''} ${separatorClass} ${isDisabled ? 'readonly' : ''}" @click="${this._toggle}" style="${separatorStyle}">
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