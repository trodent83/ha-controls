/**
 * Calendar Grid Card Loader Module
 * Handles dynamic cache-busted loading of JS modules, CSS stylesheets, grid items, and editors.
 */

import { HAControlLoader } from "../ha-control-loader.js";

// Cache-busting version parameter for script loading
const VERSION = "0.4.29";

// Name of this loader module script
const SCRIPT_NAME = "calendar-grid-card-loader.js";

// Initialize unified control loader
const loader = new HAControlLoader(SCRIPT_NAME, VERSION);

// Dynamically load stylesheets and scripts needed by the control
loader.loadModules(
  ["calendar-grid-card.css", "calendar-grid-card-event.css", "calendar-grid-card-editor.css"],
  ["calendar-grid-card.js", "calendar-grid-card-event.js", "calendar-grid-card-editor.js"]
);