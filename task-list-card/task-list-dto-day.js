export class Day {
  constructor(date, tasks) {
    this.date = date;
    this.tasks = tasks;
  }

  get diffDays() {
    if (this.date === 'no-date') return null;
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    let taskDate;
    if (this.date.length === 10) {
      const [year, month, day] = this.date.split('-').map(Number);
      taskDate = new Date(Date.UTC(year, month - 1, day));
    } else {
      const d = new Date(this.date);
      taskDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    }
    const diffTime = taskDate - today;
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  get allCompleted() {
    return this.tasks.length > 0 && this.tasks.every(t => t.isCompleted);
  }

  get isVisible() {
    return this.tasks.some(t => t.isVisible);
  }
}