import { HAControlLoader } from "../ha-control-loader.js?v=1.0.20";
import { VERSION } from "./version.js?v=1.0.20";

const SCRIPT_NAME = "room-status-card-loader.js";

const loader = new HAControlLoader(SCRIPT_NAME, VERSION);
loader.loadModules(
  ["room-status-card.css", "room-status-card-editor.css"],
  ["room-status-card.js", "room-status-card-editor.js"]
);
