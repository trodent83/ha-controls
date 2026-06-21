/**
 * Room Status Card Loader Module
 * Handles dynamic cache-busted loading of JS modules and CSS stylesheets.
 */

import { HAControlLoader } from "../ha-control-loader.js?v=0.6.0";

// Cache-busting version parameter for script loading
const VERSION = "1.0.34";

// Name of this loader module script
const SCRIPT_NAME = "room-status-card-loader.js";

// Initialize unified control loader
const loader = new HAControlLoader(SCRIPT_NAME, VERSION);

// Dynamically load stylesheets and scripts needed by the control
loader.loadModules(
  ["room-status-card.css", "room-status-card-editor.css"],
  ["room-status-card.js", "room-status-card-editor.js"]
);
