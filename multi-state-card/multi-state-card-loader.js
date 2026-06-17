/**
 * Multi State Card Loader Module
 * Handles dynamic cache-busted loading of JS modules, CSS stylesheets, features, and editors.
 */

import { HAControlLoader } from "../ha-control-loader.js?v=0.6.0";

// Cache-busting version parameter for script loading
const VERSION = "0.1.20";

// Name of this loader module script
const SCRIPT_NAME = "multi-state-card-loader.js";

// Initialize unified control loader
const loader = new HAControlLoader(SCRIPT_NAME, VERSION);

// Dynamically load stylesheets and scripts needed by the control
loader.loadModules(
  ["multi-state-card.css", "multi-state-card-editor.css"],
  [
    "multi-state-card.js",
    "multi-state-card-editor.js"
  ]
);