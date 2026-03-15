import { HAControlLoader } from "../ha-control-loader.js";
import { VERSION } from "./version.js";

const SCRIPT_NAME = "vacuum-select-card-loader.js";

const loader = new HAControlLoader(SCRIPT_NAME, VERSION);
loader.loadModules(
  ["vacuum-select-card.css"],
  ["vacuum-select-card.js", "vacuum-select-card-editor.js"]
);