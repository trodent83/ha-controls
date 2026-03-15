import { HAControlLoader } from "../ha-control-loader.js?v=0.5.0";
import { VERSION } from "./version.js?v=1.0.12";

const SCRIPT_NAME = "multi-property-card-loader.js";

const loader = new HAControlLoader(SCRIPT_NAME, VERSION);
loader.loadModules(
  ["multi-property-card.css"],
  ["multi-property-card.js", "multi-property-card-editor.js"]
);