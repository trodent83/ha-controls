import { HAControlBase, html } from "../ha-control-base.js?v=0.6.9";

/**
 * Cache-busting version parameter for dynamic asset loading.
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.35';

/**
 * TaskDelayCard
 * A custom Lovelace card rendered inside popup modals to allow postponing/delaying
 * a todo task by days, weeks, or months.
 * 
 * @extends HAControlBase
 */
export class TaskDelayCard extends HAControlBase {
  /**
   * Defines reactive properties tracked by LitElement.
   * 
   * @static
   * @returns {Object} LitElement properties definition
   */
  static get properties() {
    return {
      ...super.properties,
      config: { attribute: false },
      _amount: { state: true },
      _unit: { state: true },
      _isSaving: { state: true },
      _errorMessage: { state: true }
    };
  }

  constructor() {
    super();
    this._amount = 1;
    this._unit = 'days';
    this._isSaving = false;
    this._errorMessage = null;
  }

  /**
   * Home Assistant card size estimate.
   * @returns {number}
   */
  getCardSize() {
    return 3;
  }

  /**
   * Sets the card configuration.
   * 
   * @param {Object} config - Card configuration containing task details
   */
  setConfig(config) {
    if (!config || !config.task) {
      throw new Error("TaskDelayCard requires a 'task' object in its configuration.");
    }
    this.config = config;
  }

  /**
   * Resolves the directory path hosting the translation localizations.
   * 
   * @type {string}
   */
  get translationPath() {
    return "/local/ha-controls/task-list-card/translations";
  }

  /**
   * Version parameter for translation cache-busting.
   * 
   * @type {string}
   */
  get translationVersion() {
    return VERSION;
  }

  /**
   * Retrieves the task data transfer object from configuration.
   * 
   * @type {Object}
   */
  get task() {
    return this.config?.task || {};
  }

  /**
   * Calculates the base date to delay from.
   * If the task's due date is in the future, delays from that due date.
   * If the task is overdue or has no due date, delays from today.
   * 
   * @returns {Date}
   * @private
   */
  _getBaseDate() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const dueStr = this.task.due;
    if (!dueStr) return today;

    // Parse YYYY-MM-DD from due string
    const datePart = String(dueStr).substring(0, 10);
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const taskDate = new Date(year, month, day);

      // If scheduled in the future, delay from the scheduled date; otherwise from today
      if (taskDate > today) {
        return taskDate;
      }
    }
    return today;
  }

  /**
   * Computes the new target date given an amount and a unit.
   * 
   * @param {number} amount - Count of units to add
   * @param {'days'|'weeks'|'months'} unit - Unit of time
   * @returns {Date} Calculated target Date
   * @private
   */
  _computeNewDate(amount, unit) {
    const base = this._getBaseDate();
    const result = new Date(base.getTime());

    const count = parseInt(amount, 10) || 1;
    if (unit === 'days') {
      result.setDate(result.getDate() + count);
    } else if (unit === 'weeks') {
      result.setDate(result.getDate() + (count * 7));
    } else if (unit === 'months') {
      result.setMonth(result.getMonth() + count);
    }
    return result;
  }

  /**
   * Formats a Date object into YYYY-MM-DD format for Home Assistant todo service.
   * 
   * @param {Date} d - Date object
   * @returns {string} Formatted date string
   * @private
   */
  _formatDateIso(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formats a date for human-readable display.
   * 
   * @param {Date} d - Date object
   * @returns {string} Formatted localized string
   * @private
   */
  _formatDateDisplay(d) {
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Formats the current scheduled due date for display.
   * 
   * @returns {string}
   * @private
   */
  _formatCurrentDue() {
    if (!this.task.due) {
      return this._localize('no_due_date_set') || "No due date set";
    }
    const datePart = String(this.task.due).substring(0, 10);
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    return this.task.due;
  }

  /**
   * Preset chip click handler. Sets the amount, unit, and updates the preview.
   * 
   * @param {number} amount
   * @param {'days'|'weeks'|'months'} unit
   * @private
   */
  _applyPreset(amount, unit) {
    this._amount = amount;
    this._unit = unit;
    this._errorMessage = null;
  }

  /**
   * Decrements the stepper amount.
   * @private
   */
  _decrement() {
    if (this._amount > 1) {
      this._amount -= 1;
      this._errorMessage = null;
    }
  }

  /**
   * Increments the stepper amount.
   * @private
   */
  _increment() {
    this._amount += 1;
    this._errorMessage = null;
  }

  /**
   * Selects the delay unit.
   * 
   * @param {'days'|'weeks'|'months'} unit
   * @private
   */
  _setUnit(unit) {
    this._unit = unit;
    this._errorMessage = null;
  }

  /**
   * Closes the popup modal via FitGridLayout custom DOM event and fallback event.
   * @private
   */
  _closePopup() {
    // Notify FitGridLayout to dismiss the modal
    this.dispatchEvent(new CustomEvent("ll-custom", {
      bubbles: true,
      composed: true,
      detail: { grid_popup_close: true }
    }));

    // Fallback event for inline modal host
    this.dispatchEvent(new CustomEvent("close-popup", {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Persists the delayed due date to Home Assistant via todo.update_item API.
   * 
   * @async
   * @private
   */
  async _saveDelay() {
    if (this._isSaving || !this.hass) return;
    this._isSaving = true;

    const newDate = this._computeNewDate(this._amount, this._unit);
    const newDueDate = this._formatDateIso(newDate);

    const updatePayload = {
      entity_id: this.task.entity_id,
      item: this.task.uid || this.task.summary
    };

    // If original due date contained a time string (T00:00:00), preserve time
    if (this.task.due && String(this.task.due).includes('T')) {
      const timePart = String(this.task.due).split('T')[1];
      updatePayload.due_datetime = `${newDueDate}T${timePart}`;
    } else {
      updatePayload.due_date = newDueDate;
    }

    try {
      await this.hass.callService("todo", "update_item", updatePayload);

      // Optimistically update local task due date if object exists
      if (this.task) {
        this.task.due = updatePayload.due_datetime || updatePayload.due_date;
      }

      this._closePopup();
    } catch (err) {
      console.error("[TaskDelayCard] Failed to delay task:", err);
      this._errorMessage = err.message || "Failed to postpone task.";
    } finally {
      this._isSaving = false;
    }
  }

  /**
   * Clears the scheduled due date for this task.
   * 
   * @async
   * @private
   */
  async _clearDueDate() {
    if (this._isSaving || !this.hass) return;
    this._isSaving = true;
    this._errorMessage = null;

    try {
      await this.hass.callService("todo", "update_item", {
        entity_id: this.task.entity_id,
        item: this.task.uid || this.task.summary,
        due_date: null
      });

      if (this.task) {
        this.task.due = null;
      }

      this._closePopup();
    } catch (err) {
      console.error("[TaskDelayCard] Failed to clear due date:", err);
      try {
        await this.hass.callService("todo", "update_item", {
          entity_id: this.task.entity_id,
          item: this.task.uid || this.task.summary,
          due_date: ""
        });
        this._closePopup();
      } catch (e) {
        this._errorMessage = err.message || "Failed to clear due date.";
      }
    } finally {
      this._isSaving = false;
    }
  }

  /**
   * Renders the card template.
   * 
   * @protected
   * @returns {import('lit-html').TemplateResult}
   */
  render() {
    const targetDate = this._computeNewDate(this._amount, this._unit);
    const targetDisplay = this._formatDateDisplay(targetDate);
    const currentDueText = this._formatCurrentDue();

    return html`
      ${this.renderStyle("task-delay-card.css")}
      <div class="delay-card-container">
        <!-- Task Header & Current Due -->
        <div class="task-header">
          <div class="task-title">${this.task.summary || "Task"}</div>
          <div class="task-current-due">
            <ha-icon icon="mdi:calendar-clock"></ha-icon>
            <span>${this._localize('current_due') || "Current Due"}: <strong>${currentDueText}</strong></span>
          </div>
        </div>

        <!-- Quick Presets -->
        <div class="section-label">${this._localize('delay_by') || "Quick Postpone"}</div>
        <div class="presets-grid">
          <button class="preset-chip ${this._amount === 1 && this._unit === 'days' ? 'active' : ''}" @click=${() => this._applyPreset(1, 'days')}>+1 Day</button>
          <button class="preset-chip ${this._amount === 2 && this._unit === 'days' ? 'active' : ''}" @click=${() => this._applyPreset(2, 'days')}>+2 Days</button>
          <button class="preset-chip ${this._amount === 3 && this._unit === 'days' ? 'active' : ''}" @click=${() => this._applyPreset(3, 'days')}>+3 Days</button>
          <button class="preset-chip ${this._amount === 1 && this._unit === 'weeks' ? 'active' : ''}" @click=${() => this._applyPreset(1, 'weeks')}>+1 Week</button>
          <button class="preset-chip ${this._amount === 2 && this._unit === 'weeks' ? 'active' : ''}" @click=${() => this._applyPreset(2, 'weeks')}>+2 Weeks</button>
          <button class="preset-chip ${this._amount === 1 && this._unit === 'months' ? 'active' : ''}" @click=${() => this._applyPreset(1, 'months')}>+1 Month</button>
        </div>

        ${this._errorMessage ? html`<div class="error-banner">${this._errorMessage}</div>` : ''}

        <!-- Custom Adjuster (Amount & Unit) -->
        <div class="section-label">${this._localize('delay_task') || "Custom Delay"}</div>
        <div class="adjuster-row">
          <div class="stepper">
            <button class="stepper-btn" @click=${this._decrement} ?disabled=${this._amount <= 1}>−</button>
            <div class="stepper-val">${this._amount}</div>
            <button class="stepper-btn" @click=${this._increment}>+</button>
          </div>

          <div class="unit-selector">
            <button 
              class="unit-tab ${this._unit === 'days' ? 'active' : ''}" 
              @click=${() => this._setUnit('days')}
            >
              ${this._localize('unit_days') || "Days"}
            </button>
            <button 
              class="unit-tab ${this._unit === 'weeks' ? 'active' : ''}" 
              @click=${() => this._setUnit('weeks')}
            >
              ${this._localize('unit_weeks') || "Weeks"}
            </button>
            <button 
              class="unit-tab ${this._unit === 'months' ? 'active' : ''}" 
              @click=${() => this._setUnit('months')}
            >
              ${this._localize('unit_months') || "Months"}
            </button>
          </div>
        </div>

        <!-- New Date Preview Badge -->
        <div class="date-preview">
          <span class="preview-label">${this._localize('new_due') || "New Due Date"}</span>
          <span class="preview-value">
            <ha-icon icon="mdi:calendar-arrow-right"></ha-icon>
            ${targetDisplay}
          </span>
        </div>

        <!-- Action Buttons -->
        <div class="actions-row">
          ${this.task.due ? html`
            <button class="btn-clear" @click=${this._clearDueDate} ?disabled=${this._isSaving}>
              ${this._localize('clear_due_date') || "Clear Date"}
            </button>
          ` : ''}

          <button class="btn-cancel" @click=${this._closePopup} ?disabled=${this._isSaving}>
            ${this._localize('cancel') || "Cancel"}
          </button>

          <button class="btn-postpone" @click=${this._saveDelay} ?disabled=${this._isSaving}>
            <ha-icon icon="${this._isSaving ? 'mdi:loading' : 'mdi:check'}"></ha-icon>
            <span>${this._localize('postpone') || "Postpone Task"}</span>
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define("task-delay-card", TaskDelayCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "task-delay-card",
  name: "Task Delay Card",
  description: "A helper card for delaying or rescheduling todo tasks by days, weeks, or months.",
  preview: false
});
