/**
 * Home Assistant ES Module Loader
 * Injects CSS and additional JS into the document head.
 */

const VERSION = "0.1.1";
const SCRIPT_NAME = "vacuum-select-card-loader.js";

const scriptElement = document.querySelector(`script[src*="${SCRIPT_NAME}"]`);
const basePath = scriptElement
  ? scriptElement.src.substring(0, scriptElement.src.lastIndexOf("/") + 1)
  : "/local/ha-controls/vacuum-select-card/";

function loadCSS(fileName) {
  const url = `${basePath}${fileName}`;
  if (document.querySelector(`link[href^="${url}"]`)) return;

  const link = document.createElement("link");
  link.type = "text/css";
  link.rel = "stylesheet";
  link.href = `${url}?v=${VERSION}`;
  document.head.appendChild(link);
}

function loadJS(fileName) {
  const url = `${basePath}${fileName}`;
  if (document.querySelector(`script[src^="${url}"]`)) return;

  const script = document.createElement("script");
  script.src = `${url}?v=${VERSION}`;
  script.type = "module";
  document.head.appendChild(script);
}

["vacuum-select-card.css"].forEach(loadCSS);
["vacuum-select-card.js", "vacuum-select-card-editor.js"].forEach(loadJS);

console.info(`%c ${SCRIPT_NAME} %c Version ${VERSION} loaded `, "color: white; background: #03a9f4; font-weight: 700;", "color: #03a9f4; background: white; font-weight: 700;");
