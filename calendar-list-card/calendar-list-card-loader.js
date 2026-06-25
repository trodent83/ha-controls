/**
 * Calendar List Card Loader Module
 * Handles dynamic cache-busted loading of JS modules, CSS stylesheets, rows, features, and editors.
 */

import { HAControlLoader } from "../ha-control-loader.js?v=0.6.0";

// Cache-busting version parameter for script loading
const VERSION = "1.0.14";

// Name of this loader module script
const SCRIPT_NAME = "calendar-list-card-loader.js";

// Initialize unified control loader
const loader = new HAControlLoader(SCRIPT_NAME, VERSION);

// Dynamically load stylesheets and scripts needed by the control and its features
loader.loadModules(
  [
    "calendar-list-card.css",
    "calendar-list-card-row.css",
    "calendar-list-card-editor.css",
    "calendar-property-feature.css",
    "calendar-property-feature-editor.css"
  ],
  [
    "calendar-list-card.js",
    "calendar-list-card-row.js",
    "calendar-list-card-editor.js",
    "calendar-property-feature.js",
    "calendar-property-feature-editor.js"
  ]
);
