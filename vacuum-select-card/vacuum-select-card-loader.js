/**
 * Vacuum Select Card Loader Module
 * Handles dynamic cache-busted loading of JS modules and CSS stylesheets.
 */

import { HAControlLoader } from "../ha-control-loader.js?v=0.6.0";

// Cache-busting version parameter for script loading
const VERSION = "1.0.18";

// Name of this loader module script
const SCRIPT_NAME = "vacuum-select-card-loader.js";

// Initialize unified control loader
const loader = new HAControlLoader(SCRIPT_NAME, VERSION);

// Dynamically load stylesheets and scripts needed by the control
loader.loadModules(
  ["vacuum-select-card.css", "vacuum-select-card-editor.css"],
  ["vacuum-select-card.js", "vacuum-select-card-editor.js"]
);