/**
 * Universal Select Card Loader Module
 * Handles dynamic cache-busted loading of JS modules, CSS stylesheets, features, and editors.
 */

import { HAControlLoader } from "../ha-control-loader.js?v=0.6.0";

// Cache-busting version parameter for script loading
const VERSION = "1.0.31";

// Name of this loader module script
const SCRIPT_NAME = "universal-select-card-loader.js";

// Initialize unified control loader
const loader = new HAControlLoader(SCRIPT_NAME, VERSION);

// Dynamically load stylesheets and scripts needed by the control
loader.loadModules(
  ["universal-select-card.css", "universal-select-card-editor.css"],
  [
    "universal-select-card.js",
    "universal-select-card-editor.js"
  ]
);
