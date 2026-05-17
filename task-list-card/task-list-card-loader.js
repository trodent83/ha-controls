import { HAControlLoader } from "../ha-control-loader.js";

const VERSION = "1.0.6";

const SCRIPT_NAME = "task-list-card-loader.js";

const loader = new HAControlLoader(SCRIPT_NAME, VERSION);
loader.loadModules(
  ["task-list-card.css", "task-list-card-item.css", "task-list-card-editor.css"],
  ["task-list-card.js", "task-list-card-item.js", "task-list-card-row.js", "task-list-card-editor.js"]
);
