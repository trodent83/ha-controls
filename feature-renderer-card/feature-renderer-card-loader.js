import { HAControlLoader } from "../ha-control-loader.js?v=0.6.0";

const VERSION = "0.1.2";

const SCRIPT_NAME = "feature-renderer-card-loader.js";

const loader = new HAControlLoader(SCRIPT_NAME, VERSION);
loader.loadModules(
  [],
  [
    "feature-renderer-card.js",
    "feature-renderer-editor-card.js",
    "feature-selector-card.js"
  ]
);