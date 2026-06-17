import { Task } from "./task-dto-task.js?v=1.0.22";

/**
 * Day
 * Data transfer object representing a grouped calendar day of tasks.
 * Tracks dates and aggregates metrics like completion states and visibility.
 */
export class Day {
  /**
   * Instantiates a Day group container.
   * 
   * @param {string} date - Date string representing the day (e.g. '2026-06-14' or 'no-date')
   * @param {Array<import('./task-dto-task.js').Task>} tasks - List of Task instances due on this day
   */
  constructor(date, tasks) {
    /**
     * Group date string.
     * @type {string}
     */
    this.date = date;
    /**
     * List of tasks in this day group.
     * @type {Array<import('./task-dto-task.js').Task>}
     */
    this.tasks = tasks;
  }

  /**
   * Calculates the difference in days between this day and the current calendar day in UTC.
   * Returns null if this is a 'no-date' group.
   * 
   * @type {number|null}
   */
  get diffDays() {
    return Task.getDiffDays(this.date);
  }

  /**
   * Determines if all tasks inside this day group are marked as completed.
   * 
   * @type {boolean}
   */
  get allCompleted() {
    return this.tasks.length > 0 && this.tasks.every(t => t.isCompleted);
  }

  /**
   * Checks if at least one task in this day group is configured as visible.
   * 
   * @type {boolean}
   */
  get isVisible() {
    return this.tasks.some(t => t.isVisible);
  }
}