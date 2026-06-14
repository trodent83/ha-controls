import { HAControlLoader } from "../ha-control-loader.js?v=0.6.0";

const VERSION = "1.0.21";

const SCRIPT_NAME = "multi-property-card-loader.js";

const loader = new HAControlLoader(SCRIPT_NAME, VERSION);
loader.loadModules(
  ["multi-property-card.css", "multi-property-card-editor.css"],
  ["multi-property-card.js", "multi-property-card-editor.js"]
);