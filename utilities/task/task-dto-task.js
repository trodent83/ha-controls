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
    const diff = Task.getDiffDays(this.due);
    return diff !== null && diff > 0;
  }

  /**
   * Calculates the difference in days between a due date string and the current local day in UTC.
   * 
   * @param {string|null} due - Due date string (e.g. '2026-06-14')
   * @returns {number|null} Difference in days, or null if no-date / invalid
   */
  static getDiffDays(due) {
    if (!due) return null;
    
    const dueStr = String(due).trim();
    const taskDateStr = dueStr.length > 10 ? dueStr.substring(0, 10) : dueStr;
    if (taskDateStr === 'no-date') return null;

    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    
    let taskDate;
    if (taskDateStr.length === 10) {
      const [year, month, day] = taskDateStr.split('-').map(Number);
      taskDate = new Date(Date.UTC(year, month - 1, day));
    } else {
      const d = new Date(taskDateStr);
      if (isNaN(d.getTime())) return null;
      taskDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    
    const diffTime = taskDate - today;
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }
}