import { HAControlLoader } from "../ha-control-loader.js";

const VERSION = "1.0.16";

const SCRIPT_NAME = "universal-select-card-loader.js";

const loader = new HAControlLoader(SCRIPT_NAME, VERSION);
loader.loadModules(
  ["universal-select-card.css", "timer-card-feature.css", "universal-select-card-editor.css"],
  [
    "universal-select-card.js",
    "universal-select-card-editor.js",
    "timer-card-feature.js",
    "timer-card-feature-editor.js"
  ]
);
