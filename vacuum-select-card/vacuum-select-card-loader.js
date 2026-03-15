import { HAControlLoader } from "../ha-control-loader.js";

const VERSION = "1.0.2";

const SCRIPT_NAME = "vacuum-select-card-loader.js";

const loader = new HAControlLoader(SCRIPT_NAME, VERSION);
loader.loadModules(
  ["vacuum-select-card.css"],
  ["vacuum-select-card.js", "vacuum-select-card-editor.js"]
);