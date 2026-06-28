/**
 * Task List Card Loader Module
 * Handles dynamic cache-busted loading of JS modules, CSS stylesheets, rows, items, and editors.
 */

import { HAControlLoader } from "../ha-control-loader.js?v=0.6.0";

// Cache-busting version parameter for script loading
const VERSION = "1.0.30";

// Name of this loader module script
const SCRIPT_NAME = "task-list-card-loader.js";

// Initialize unified control loader
const loader = new HAControlLoader(SCRIPT_NAME, VERSION);

// Dynamically load stylesheets and scripts needed by the control
loader.loadModules(
  ["task-list-card.css", "task-list-card-item.css", "task-list-card-editor.css"],
  ["task-list-card.js", "task-list-card-item.js", "task-list-card-row.js", "task-list-card-editor.js"]
);
