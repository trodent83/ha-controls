/**
 * Weather Grid Card Loader Module
 * Handles dynamic cache-busted loading of JS modules, CSS stylesheets, and editors.
 */

import { HAControlLoader } from "../ha-control-loader.js?v=0.6.0";

// Cache-busting version parameter for script loading
const VERSION = "1.0.9";

// Name of this loader module script
const SCRIPT_NAME = "weather-grid-card-loader.js";

// Initialize unified control loader
const loader = new HAControlLoader(SCRIPT_NAME, VERSION);

// Dynamically load stylesheets and scripts needed by the control
loader.loadModules(
  ["weather-grid-card.css", "weather-grid-card-editor.css"],
  ["weather-grid-card.js", "weather-grid-card-editor.js"]
);
