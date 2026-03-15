import { HAControlBase, html } from "../ha-control-base.js?v=0.5.0";
import { VERSION } from "./version.js";

class TaskListCardItem extends HAControlBase {
  static get properties() {
    return {
      ...super.properties,
      config: { attribute: false },
      task: { attribute: false },
      hasSeparator: { type: Boolean },
      readonly: { type: Boolean }
    };
  }

  updateTask() {
    this.requestUpdate();
  }

  _toggle() {
    if (this.readonly) return;
    this.dispatchEvent(new CustomEvent('toggle-task', { detail: { task: this.task } }));
  }

  render() {
    if (!this.task || !this.config || !this.hass) return html``;

    const t = this.task;
    const done = t.isCompleted;
    
    let hidden = !t.isVisible;

    const separatorColor = this.config.merged_tasks_separator_color || 'var(--divider-color)';
    const separatorClass = this.hasSeparator ? 'task-item-separator' : '';
    const separatorStyle = (this.hasSeparator ? `border-bottom-color: ${separatorColor};` : '') + (hidden ? 'display: none;' : '');

    return html`
      <style>
        :host { display: block; }
        .task-item.readonly {
          opacity: 0.5;
          cursor: default;
        }
      </style>
      <link rel="stylesheet" href="/local/ha-controls/task-list-card/task-list-card-item.css?v=${VERSION}">
      <div class="task-item ${done ? 'done' : ''} ${separatorClass} ${this.readonly ? 'readonly' : ''}" @click="${this._toggle}" style="${separatorStyle}">
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