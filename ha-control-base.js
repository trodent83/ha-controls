const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
export const html = LitElement.prototype.html;
export const css = LitElement.prototype.css;

export class HAControlBase extends LitElement {
  static get properties() {
    return {
      hass: {},
      _strings: { state: true },
      _fallbackStrings: { state: true },
    };
  }

  constructor() {
    super();
    this._strings = {};
    this._fallbackStrings = {};
    this._loadedLang = null;
    this._translationsLoaded = false;
  }

  /**
   * Returns the path to the translation files.
   * @returns {string|null} The translation path.
   */
  get translationPath() {
    return null;
  }

  /**
   * Returns the version of the translation files.
   * @returns {string} The translation version.
   */
  get translationVersion() {
    return '1.0.0';
  }

  /**
   * Invoked after the element has updated.
   * @param {Map} changedProps - Map of changed properties.
   */
  updated(changedProps) {
    super.updated(changedProps);
    // Check if hass is defined and changed
    if (!changedProps.has('hass') || !this.hass) return;

    const lang = this.hass.language;
    // Only reload translations if the language has changed
    if (lang === this._loadedLang) return;

    this._loadTranslations(lang);
  }

  /**
   * Loads translations for the specified language.
   * @param {string} lang - The language code.
   */
  async _loadTranslations(lang) {
      if (!this.translationPath) return;

      this._loadedLang = lang;
      this._translationsLoaded = false;
      const languagesToTry = [lang];
      if (lang.includes('-')) {
          languagesToTry.push(lang.split('-')[0]);
      }
      if (!languagesToTry.includes('en')) {
          languagesToTry.push('en');
      }

      let primaryStringsSet = false;
      this._strings = {};
      this._fallbackStrings = {};

      for (const l of languagesToTry) {
          try {
              const response = await fetch(`${this.translationPath}/${l}.json?v=${this.translationVersion}`);
              if (response.ok) {
                  const json = await response.json();
                  if (!primaryStringsSet) {
                      if (l !== lang) {
                          console.info(`[HAControlBase] Translation for '${lang}' not found, falling back to '${l}'.`);
                      }
                      this._strings = json;
                      primaryStringsSet = true;
                  }
                  if (l === 'en') {
                      this._fallbackStrings = json;
                  }
              } else {
                  console.warn(`[HAControlBase] Failed to fetch translation for '${l}' from ${this.translationPath}: ${response.status} ${response.statusText}`);
              }
          } catch (e) {
              console.error(`[HAControlBase] Error loading or parsing translation for '${l}':`, e);
          }
      }

      this._translationsLoaded = true;
      this.requestUpdate();
  }

  /**
   * Localizes a key with optional replacements.
   * @returns {string} The localized string.
   */
  _localize(key, replace = {}) {
    let translated = this._strings?.[key] ?? this._fallbackStrings?.[key];

    if (translated === undefined) {
        if (this._translationsLoaded) {
            console.warn(`[HAControlBase] Missing translation for key '${key}' in '${this._loadedLang}' for ${this.localName}`);
        }
        return key;
    }

    try {
        // Perform replacements for placeholders
        for (const [k, v] of Object.entries(replace)) {
            translated = translated.replace(`{${k}}`, String(v));
        }
    } catch (e) {
        console.error(`[HAControlBase] Error formatting translation for key '${key}':`, e);
    }
    
    return translated;
  }
}