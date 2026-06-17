/**
 * Task
 * Data transfer object representing a single todo task.
 * Parses raw task attributes from Home Assistant states, computing status checks and visibility filters.
 */
export class Task {
  /**
   * Instantiates a Task wrapper object.
   * 
   * @param {Object} data - Raw task properties fetched from Home Assistant (e.g. uid, summary, description, status, due, entity_id)
   * @param {Object} config - Parent card configuration settings
   */
  constructor(data, config) {
    /**
     * Unique identifier of the task.
     * @type {string}
     */
    this.uid = data.uid;
    /**
     * Task summary text.
     * @type {string}
     */
    this.summary = data.summary;
    /**
     * Task detailed description.
     * @type {string}
     */
    this.description = data.description;
    /**
     * Active state status ('completed' or 'needs_action').
     * @type {string}
     */
    this.status = data.status;
    /**
     * Optional due date string (e.g. '2026-06-14').
     * @type {string|null}
     */
    this.due = data.due;
    /**
     * Home Assistant entity ID sourcing this task.
     * @type {string}
     */
    this.entity_id = data.entity_id;
    /**
     * Parent configuration context.
     * @type {Object}
     */
    this.config = config;
  }

  /**
   * Helper property checking if the task status is marked as 'completed'.
   * 
   * @type {boolean}
   */
  get isCompleted() {
    return this.status === 'completed';
  }

  /**
   * Checks if this task should be displayed in the UI, evaluating configuration exclusions
   * such as show_completed or show_no_due_date toggles.
   * 
   * @type {boolean}
   */
  get isVisible() {
    const showCompleted = this.config.show_completed !== false;
    const showNoDueDate = this.config.show_no_due_date !== false;
    if (!showCompleted && this.isCompleted) return false;
    if (!showNoDueDate && !this.due) return false;
    return true;
  }

  /**
   * Checks if the task's due date lies in the future (relative to current day in UTC).
   * Used to optionally block completing tasks before their scheduled date.
   * 
   * @type {boolean}
   */
  get isFuture() {
    if (!this.due) return false;
    
    // Get current local date at midnight (start of today)
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let taskDate;
    const dueStr = String(this.due).trim();
    
    // Check if it's a date-only YYYY-MM-DD string
    const match = dueStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);
      const day = parseInt(match[3]);
      // Parse as local date at midnight
      taskDate = new Date(year, month - 1, day);
    } else {
      // Parse as full date-time or other string
      const d = new Date(dueStr);
      if (isNaN(d.getTime())) return false;
      // Get the local date components of the task date
      taskDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    
    return taskDate > todayLocal;
  }
}