const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
const html = LitElement.prototype.html;

class TaskListCardItem extends LitElement {
  static get properties() {
    return {
      hass: { attribute: false },
      config: { attribute: false },
      task: { attribute: false },
      hasSeparator: { type: Boolean }
    };
  }

  _toggle() {
    this.dispatchEvent(new CustomEvent('toggle-task', { detail: { task: this.task } }));
  }

  render() {
    if (!this.task || !this.config || !this.hass) return html``;

    const t = this.task;
    const done = t.status === 'completed';
    
    const showCompleted = this.config.show_completed !== false;
    const showNoDueDate = this.config.show_no_due_date !== false;
    let hidden = false;
    if (!showCompleted && done) hidden = true;
    if (!showNoDueDate && !t.due) hidden = true;

    const separatorColor = this.config.merged_tasks_separator_color || 'var(--divider-color)';
    const separatorClass = this.hasSeparator ? 'task-item-separator' : '';
    const separatorStyle = (this.hasSeparator ? `border-bottom-color: ${separatorColor};` : '') + (hidden ? 'display: none;' : '');

    return html`
      <style>:host { display: block; }</style>
      <link rel="stylesheet" href="/local/ha-controls/task-list-card/task-list-card-item.css">
      <div class="task-item ${done ? 'done' : ''} ${separatorClass}" @click="${this._toggle}" style="${separatorStyle}">
        <span class="task-name">${t.summary}</span>
        ${this.config.show_description && t.description ? html`<span class="task-description">${t.description}</span>` : ''}
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