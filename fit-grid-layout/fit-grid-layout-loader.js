/**
 * Fit Grid Layout Loader Module
 * Handles dynamic cache-busted loading of JS modules and CSS stylesheets.
 */

import { HAControlLoader } from "../ha-control-loader.js?v=0.6.7";

// Cache-busting version parameter for script loading
const VERSION = "1.0.5";

// Name of this loader module script
const SCRIPT_NAME = "fit-grid-layout-loader.js";

// Initialize unified control loader
const loader = new HAControlLoader(SCRIPT_NAME, VERSION);

// Dynamically load stylesheets and scripts needed by the view layout
loader.loadModules(
  ["fit-grid-layout.css"],
  ["fit-grid-layout.js", "fit-grid-layout-editor.js"]
);
