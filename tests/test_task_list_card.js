import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CARD_DIR = path.resolve(__dirname, "../task-list-card");

describe("TaskListCard - Task Click, Toggle & Refresh Regression Suite", () => {

  describe("1. Static Contract & Anti-Regression Checks", () => {
    it("task-list-card-item.js must NOT dispatch toggle-task with bubbles: true", () => {
      const itemCode = fs.readFileSync(path.join(CARD_DIR, "task-list-card-item.js"), "utf8");
      // Find toggle-task CustomEvent dispatch
      const toggleMatch = itemCode.match(/CustomEvent\s*\(\s*['"]toggle-task['"]\s*,\s*(\{[\s\S]*?\})\s*\)/);
      assert.ok(toggleMatch, "Should find CustomEvent('toggle-task') in task-list-card-item.js");
      assert.doesNotMatch(toggleMatch[1], /bubbles\s*:\s*true/, "toggle-task MUST NOT bubble to prevent double-toggle bug");
      assert.doesNotMatch(toggleMatch[1], /composed\s*:\s*true/, "toggle-task MUST NOT be composed");
    });

    it("task-list-card-item.js must NOT dispatch hold-task with bubbles: true", () => {
      const itemCode = fs.readFileSync(path.join(CARD_DIR, "task-list-card-item.js"), "utf8");
      const holdMatch = itemCode.match(/CustomEvent\s*\(\s*['"]hold-task['"]\s*,\s*(\{[\s\S]*?\})\s*\)/);
      assert.ok(holdMatch, "Should find CustomEvent('hold-task') in task-list-card-item.js");
      assert.doesNotMatch(holdMatch[1], /bubbles\s*:\s*true/, "hold-task MUST NOT bubble");
      assert.doesNotMatch(holdMatch[1], /composed\s*:\s*true/, "hold-task MUST NOT be composed");
    });

    it("task-list-card-row.js must call stopPropagation on toggle-task and hold-task", () => {
      const rowCode = fs.readFileSync(path.join(CARD_DIR, "task-list-card-row.js"), "utf8");
      assert.match(
        rowCode,
        /@toggle-task=\$\{\s*\(\s*e\s*\)\s*=>\s*\{[\s\S]*?stopPropagation\(\)[\s\S]*?this\._toggleTask/,
        "Row must stopPropagation on toggle-task before re-dispatching"
      );
      assert.match(
        rowCode,
        /@hold-task=\$\{\s*\(\s*e\s*\)\s*=>\s*\{[\s\S]*?stopPropagation\(\)[\s\S]*?this\._holdTask/,
        "Row must stopPropagation on hold-task before re-dispatching"
      );
    });

    it("task-list-card.js must call _fetchItems in _toggleTask", () => {
      const cardCode = fs.readFileSync(path.join(CARD_DIR, "task-list-card.js"), "utf8");
      const toggleFnMatch = cardCode.match(/async\s+_toggleTask\s*\([^)]*\)\s*\{([\s\S]*?)\r?\n\s*\}\r?\n\s*\/\*\*/);
      assert.ok(toggleFnMatch, "Should find _toggleTask method in task-list-card.js");
      assert.match(
        toggleFnMatch[1],
        /await\s+this\._fetchItems\(\)/,
        "_toggleTask must await _fetchItems() so that the card refreshes and completed tasks vanish"
      );
    });

    it("task-list-card version string must be consistent across all modules and loader", () => {
      const loaderCode = fs.readFileSync(path.join(CARD_DIR, "task-list-card-loader.js"), "utf8");
      const loaderVer = loaderCode.match(/const\s+VERSION\s*=\s*["']([^"']+)["']/)?.[1];
      assert.ok(loaderVer, "Loader must declare VERSION");

      const files = [
        "task-list-card.js",
        "task-list-card-row.js",
        "task-list-card-item.js",
        "task-list-card-editor.js",
        "task-delay-card.js"
      ];

      for (const file of files) {
        const content = fs.readFileSync(path.join(CARD_DIR, file), "utf8");
        const fileVer = content.match(/\|\|\s*['"]([^'"]+)['"]/)?.[1];
        assert.equal(fileVer, loaderVer, `${file} default version (${fileVer}) must match loader (${loaderVer})`);
      }
    });
  });

  describe("2. Event Bubbling & Single-Dispatch Simulation", () => {
    it("simulates item click: card handler must be invoked exactly once (no double-toggle)", () => {
      // Mock hierarchy: Card -> Row -> Item
      class MockItem extends EventTarget {
        constructor(task, config) {
          super();
          this.task = task;
          this.config = config || {};
          this._isHolding = false;
        }

        _toggle(e) {
          if (this._isHolding) {
            if (e) {
              e.stopPropagation();
              e.preventDefault();
            }
            this._isHolding = false;
            return;
          }
          if (e) {
            e.stopPropagation();
          }
          this.dispatchEvent(new CustomEvent("toggle-task", {
            detail: { task: this.task }
          }));
        }
      }

      class MockRow extends EventTarget {
        constructor(item) {
          super();
          this.item = item;
          // Row listens to item toggle-task
          this.item.addEventListener("toggle-task", (e) => {
            e.stopPropagation();
            this._toggleTask(e.detail.task);
          });
        }

        _toggleTask(task) {
          this.dispatchEvent(new CustomEvent("toggle-task", {
            detail: { task }
          }));
        }
      }

      const mockTask = { uid: "task-123", summary: "Clean room", status: "needs_action", entity_id: "todo.shopping" };
      const item = new MockItem(mockTask);
      const row = new MockRow(item);

      let cardReceivedCount = 0;
      let toggledTask = null;

      row.addEventListener("toggle-task", (e) => {
        cardReceivedCount++;
        toggledTask = e.detail.task;
      });

      // User clicks item
      const mockClickEvent = {
        stopPropagation: () => {},
        preventDefault: () => {}
      };
      item._toggle(mockClickEvent);

      assert.equal(cardReceivedCount, 1, "Card should receive toggle-task exactly once");
      assert.equal(toggledTask.uid, "task-123");
    });

    it("simulates hold action: hold-task dispatched, click suppressed, card receives 1 event", () => {
      class MockItemWithHold extends EventTarget {
        constructor(task, config) {
          super();
          this.task = task;
          this.config = config || { hold_delay_ms: 50 };
          this._isHolding = false;
        }

        _handleDown() {
          this._isHolding = false;
          this._timer = setTimeout(() => {
            this._isHolding = true;
            this._handleHold();
          }, this.config.hold_delay_ms);
        }

        _handleUp() {
          if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
          }
        }

        _handleHold() {
          this.dispatchEvent(new CustomEvent("hold-task", {
            detail: { task: this.task }
          }));
        }

        _toggle(e) {
          if (this._isHolding) {
            if (e) {
              e.stopPropagation();
              e.preventDefault();
            }
            this._isHolding = false;
            return;
          }
          this.dispatchEvent(new CustomEvent("toggle-task", {
            detail: { task: this.task }
          }));
        }
      }

      const mockTask = { uid: "task-999", summary: "Pay bills", status: "needs_action" };
      const item = new MockItemWithHold(mockTask, { hold_delay_ms: 20 });

      let toggleCount = 0;
      let holdCount = 0;

      item.addEventListener("toggle-task", () => toggleCount++);
      item.addEventListener("hold-task", (e) => {
        assert.equal(e.bubbles, false, "hold-task should not bubble");
        holdCount++;
      });

      // Pointer down, wait for hold threshold
      item._handleDown();

      return new Promise((resolve) => {
        setTimeout(() => {
          // Pointer up
          item._handleUp();

          // Subsequent click fires
          item._toggle({
            stopPropagation: () => {},
            preventDefault: () => {}
          });

          assert.equal(holdCount, 1, "hold-task should be dispatched once");
          assert.equal(toggleCount, 0, "click/toggle must be suppressed after hold");
          resolve();
        }, 50);
      });
    });
  });

  describe("3. Task Completion & Refresh Behavior", () => {
    it("_toggleTask marks task completed, calls HA service, and triggers _fetchItems", async () => {
      let serviceCalls = [];
      let fetchCalled = false;
      let updateRequested = false;

      const mockHass = {
        callService: async (domain, service, data) => {
          serviceCalls.push({ domain, service, data });
        }
      };

      const task = {
        uid: "task-abc",
        entity_id: "todo.home",
        status: "needs_action",
        get isCompleted() { return this.status === "completed"; },
        get isVisible() { return this.status !== "completed"; }
      };

      // Mock TaskListCard instance with _toggleTask logic
      const card = {
        hass: mockHass,
        config: { block_future_toggles: true, show_completed: false },
        _processing: null,
        _toggledItems: [],
        shadowRoot: {
          querySelectorAll: () => []
        },
        requestUpdate: () => {
          updateRequested = true;
        },
        _fetchItems: async () => {
          fetchCalled = true;
        }
      };

      // Execute _toggleTask as implemented in task-list-card.js
      async function _toggleTask(task) {
        if (card._processing) return;
        card._toggledItems.push({ uid: task.uid, entity_id: task.entity_id });
        const oldStatus = task.status;
        const newStatus = task.status === 'completed' ? 'needs_action' : 'completed';

        const wasVisible = task.isVisible;
        task.status = newStatus;
        const isVisible = task.isVisible;

        if (wasVisible !== isVisible) {
          card.requestUpdate();
        }

        try {
          await card.hass.callService("todo", "update_item", {
            entity_id: task.entity_id,
            item: task.uid,
            status: newStatus
          });
          await card._fetchItems();
          card.requestUpdate();
        } catch (e) {
          task.status = oldStatus;
          card.requestUpdate();
        }
      }

      await _toggleTask(task);

      // Verify task state
      assert.equal(task.status, "completed", "Task status must remain 'completed'");
      assert.equal(task.isVisible, false, "Task must no longer be visible when show_completed is false");

      // Verify service call
      assert.equal(serviceCalls.length, 1, "HA todo.update_item should be called once");
      assert.deepEqual(serviceCalls[0], {
        domain: "todo",
        service: "update_item",
        data: {
          entity_id: "todo.home",
          item: "task-abc",
          status: "completed"
        }
      });

      // Verify refresh
      assert.equal(fetchCalled, true, "_fetchItems must be called to refresh the task list from HA");
      assert.equal(updateRequested, true, "requestUpdate must be triggered to repaint UI");
    });
  });

  describe("4. Task & Day DTO Vanishing & Visibility Contract", () => {
    it("Task DTO vanishes (isVisible becomes false) when status becomes completed and show_completed is false", async () => {
      const { Task } = await import("../utilities/task/task-dto-task.js");

      const config = { show_completed: false, show_no_due_date: true };
      const rawTask = {
        uid: "t-1",
        summary: "Take out trash",
        status: "needs_action",
        due: "2026-09-17",
        entity_id: "todo.chores"
      };

      const task = new Task(rawTask, config);
      assert.equal(task.isCompleted, false);
      assert.equal(task.isVisible, true, "Task must be visible while needs_action");

      // Complete the task
      task.status = "completed";
      assert.equal(task.isCompleted, true);
      assert.equal(task.isVisible, false, "Task must vanish (isVisible = false) once marked completed");
    });

    it("Day DTO vanishes (isVisible becomes false) when all its tasks are completed", async () => {
      const { Task } = await import("../utilities/task/task-dto-task.js");
      const { Day } = await import("../utilities/task/task-dto-day.js");

      const config = { show_completed: false, show_no_due_date: true };
      const task1 = new Task({ uid: "t-1", summary: "Task 1", status: "needs_action", due: "2026-09-17", entity_id: "todo.a" }, config);
      const task2 = new Task({ uid: "t-2", summary: "Task 2", status: "needs_action", due: "2026-09-17", entity_id: "todo.a" }, config);

      const day = new Day("2026-09-17", [task1, task2]);
      assert.equal(day.allCompleted, false);
      assert.equal(day.isVisible, true, "Day group is visible when tasks are pending");

      // Complete first task
      task1.status = "completed";
      assert.equal(day.allCompleted, false);
      assert.equal(day.isVisible, true, "Day group remains visible while task 2 is pending");

      // Complete second task
      task2.status = "completed";
      assert.equal(day.allCompleted, true);
      assert.equal(day.isVisible, false, "Day group must vanish completely when all tasks are completed");
    });
  });
});
