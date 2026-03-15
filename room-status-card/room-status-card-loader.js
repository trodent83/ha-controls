import { HAControlLoader } from "../ha-control-loader.js";

const VERSION = "1.0.21";

const SCRIPT_NAME = "room-status-card-loader.js";

const loader = new HAControlLoader(SCRIPT_NAME, VERSION);
loader.loadModules(
  ["room-status-card.css", "room-status-card-editor.css"],
  ["room-status-card.js", "room-status-card-editor.js"]
);
