import { HAControlLoader } from "../ha-control-loader.js?v=0.6.0";

const VERSION = "0.1.28";

const SCRIPT_NAME = "feature-renderer-card-loader.js";

const loader = new HAControlLoader(SCRIPT_NAME, VERSION);
loader.loadModules(
  [
    "shared-animations.css",
    "timer-card-feature.css",
    "constant-text-feature.css",
    "state-value-feature.css",
    "attribute-value-feature.css",
    "image-card-feature.css",
    "icon-card-feature.css"
  ],
  [
    "feature-renderer-card.js",
    "feature-renderer-editor-card.js",
    "feature-selector-card.js",
    "timer-card-feature.js",
    "timer-card-feature-editor.js",
    "constant-text-feature.js",
    "constant-text-feature-editor.js",
    "state-value-feature.js",
    "state-value-feature-editor.js",
    "attribute-value-feature.js",
    "attribute-value-feature-editor.js",
    "image-card-feature.js",
    "image-card-feature-editor.js",
    "icon-card-feature.js",
    "icon-card-feature-editor.js"
  ]
);