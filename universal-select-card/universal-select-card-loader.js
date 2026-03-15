import { HAControlLoader } from "../ha-control-loader.js";

const VERSION = "1.0.5";

const SCRIPT_NAME = "universal-select-card-loader.js";

const loader = new HAControlLoader(SCRIPT_NAME, VERSION);
loader.loadModules(
  ["universal-select-card.css"],
  ["universal-select-card.js", "universal-select-card-editor.js"]
);
