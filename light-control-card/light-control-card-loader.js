/**
 * Light Control Card Loader Module
 * Handles dynamic cache-busted loading of JS modules and CSS stylesheets.
 */

import { HAControlLoader } from "../ha-control-loader.js?v=0.6.0";

// Cache-busting version parameter for script loading
const VERSION = "1.0.2";

// Name of this loader module script
const SCRIPT_NAME = "light-control-card-loader.js";

// Initialize unified control loader
const loader = new HAControlLoader(SCRIPT_NAME, VERSION);

// Dynamically load stylesheets and scripts needed by the control
loader.loadModules(
  ["light-control-card.css", "light-control-card-editor.css"],
  ["light-control-card.js", "light-control-card-editor.js"]
);
