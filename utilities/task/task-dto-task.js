export class Task {
  constructor(data, config) {
    this.uid = data.uid;
    this.summary = data.summary;
    this.description = data.description;
    this.status = data.status;
    this.due = data.due;
    this.entity_id = data.entity_id;
    this.config = config;
  }

  get isCompleted() {
    return this.status === 'completed';
  }

  get isVisible() {
    const showCompleted = this.config.show_completed !== false;
    const showNoDueDate = this.config.show_no_due_date !== false;
    if (!showCompleted && this.isCompleted) return false;
    if (!showNoDueDate && !this.due) return false;
    return true;
  }

  get isFuture() {
    if (!this.due) return false;
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    let taskDate;
    if (this.due.length === 10) {
      const [year, month, day] = this.due.split('-').map(Number);
      taskDate = new Date(Date.UTC(year, month - 1, day));
    } else {
      const d = new Date(this.due);
      taskDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    return taskDate > today;
  }
}