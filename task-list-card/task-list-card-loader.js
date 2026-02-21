/**
 * Home Assistant ES Module Loader
 * Injects CSS and additional JS into the document head.
 */

const VERSION = "0.3.13";
const SCRIPT_NAME = "task-list-card-loader.js";

// Dynamically determine the base path from the script tag loading this file
const scriptElement = document.querySelector(`script[src*="${SCRIPT_NAME}"]`);
const basePath = scriptElement
  ? scriptElement.src.substring(0, scriptElement.src.lastIndexOf("/") + 1)
  : "/local/ha-controls/task-list-card/";

// Function to load a CSS file by filename
function loadCSS(fileName) {
  const url = `${basePath}${fileName}`;
  if (document.querySelector(`link[href^="${url}"]`)) return;

  const link = document.createElement("link");
  link.type = "text/css";
  link.rel = "stylesheet";
  link.href = `${url}?v=${VERSION}`;
  document.head.appendChild(link);
}

// Function to load a JS file by filename
function loadJS(fileName) {
  const url = `${basePath}${fileName}`;
  if (document.querySelector(`script[src^="${url}"]`)) return;

  const script = document.createElement("script");
  script.src = `${url}?v=${VERSION}`;
  script.type = "module";
  document.head.appendChild(script);
}

// Execute loads
["task-list-card.css", "task-list-card-item.css", "task-list-card-editor.css"].forEach(loadCSS);
["task-list-card.js", "task-list-card-item.js", "task-list-card-row.js", "task-list-card-editor.js"].forEach(loadJS);

console.info(`%c ${SCRIPT_NAME} %c Version ${VERSION} loaded `, "color: white; background: #03a9f4; font-weight: 700;", "color: #03a9f4; background: white; font-weight: 700;");
