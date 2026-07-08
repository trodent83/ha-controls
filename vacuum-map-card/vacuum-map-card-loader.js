/**
 * Vacuum Map Card Loader Module
 * Handles dynamic cache-busted loading of JS modules and CSS stylesheets.
 */

import { HAControlLoader } from "../ha-control-loader.js?v=0.6.0";

// Cache-busting version parameter for script loading
const VERSION = "1.3.18";

// Name of this loader module script
const SCRIPT_NAME = "vacuum-map-card-loader.js";

// Initialize unified control loader
const loader = new HAControlLoader(SCRIPT_NAME, VERSION);

// Dynamically load stylesheets and scripts needed by the control
loader.loadModules(
  ["vacuum-map-card.css", "vacuum-map-card-editor.css"],
  ["vacuum-map-card.js", "vacuum-map-card-editor.js"]
);
