export class HAControlLoader {
  constructor(scriptName, version) {
    this.scriptName = scriptName;
    this.version = version;
    this.basePath = this._determineBasePath();
  }

  _determineBasePath() {
    const scriptElement = document.querySelector(`script[src*="${this.scriptName}"]`);
    return scriptElement
      ? scriptElement.src.substring(0, scriptElement.src.lastIndexOf("/") + 1)
      : `/local/ha-controls/${this.scriptName.replace("-loader.js", "")}/`;
  }

  loadCSS(fileName) {
    const url = `${this.basePath}${fileName}`;
    if (document.querySelector(`link[href^="${url}"]`)) return;

    const link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = `${url}?v=${this.version}`;
    document.head.appendChild(link);
  }

  loadJS(fileName) {
    const url = `${this.basePath}${fileName}`;
    if (document.querySelector(`script[src^="${url}"]`)) return;

    const script = document.createElement("script");
    script.src = `${url}?v=${this.version}`;
    script.type = "module";
    document.head.appendChild(script);
  }

  loadModules(cssFiles, jsFiles) {
    if (cssFiles) cssFiles.forEach(f => this.loadCSS(f));
    if (jsFiles) jsFiles.forEach(f => this.loadJS(f));
    console.info(`%c ${this.scriptName} %c Version ${this.version} loaded `, "color: white; background: #03a9f4; font-weight: 700;", "color: #03a9f4; background: white; font-weight: 700;");
  }
}