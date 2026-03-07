import { HAControlLoader } from "../ha-control-loader.js";

export const VERSION = "0.4.10";
const SCRIPT_NAME = "calendar-grid-card-loader.js";

const loader = new HAControlLoader(SCRIPT_NAME, VERSION);
loader.loadModules(
  ["calendar-grid-card.css", "calendar-grid-card-event.css", "calendar-grid-card-editor.css"],
  ["calendar-grid-card.js", "calendar-grid-card-event.js", "calendar-grid-card-editor.js"]
);