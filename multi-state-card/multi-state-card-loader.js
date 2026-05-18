import { HAControlLoader } from "../ha-control-loader.js?v=0.6.0";

const VERSION = "0.1.5";

const SCRIPT_NAME = "multi-state-card-loader.js";

const loader = new HAControlLoader(SCRIPT_NAME, VERSION);
loader.loadModules(
  ["multi-state-card.css"],
  ["multi-state-feature-renderer.js", "multi-state-card.js", "multi-state-card-editor.js"]
);