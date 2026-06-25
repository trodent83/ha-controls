import { HAControlLoader } from "../ha-control-loader.js?v=0.6.0";

const VERSION = "1.0.2";
const SCRIPT_NAME = "radiator-control-card-loader.js";

const loader = new HAControlLoader(SCRIPT_NAME, VERSION);
loader.loadModules(
  ["radiator-control-card.css", "radiator-control-card-editor.css"],
  ["radiator-control-card.js", "radiator-control-card-editor.js"]
);
