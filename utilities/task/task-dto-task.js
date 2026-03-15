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
}