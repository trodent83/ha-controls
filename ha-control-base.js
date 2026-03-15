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
      // If no translation path is defined, we cannot load translations
      if (!this.translationPath) return;

      this._loadedLang = lang;
      const languages = [lang];
      // If language has a region (e.g. en-US), try the base language (en) as well
      if (lang.includes('-')) {
          languages.push(lang.split('-')[0]);
      }
      // Always ensure English is in the list as a fallback
      if (!languages.includes('en')) {
          languages.push('en');
      }

      let setStrings = false;

      for (const l of languages) {
          try {
              const response = await fetch(`${this.translationPath}/${l}.json?v=${this.translationVersion}`);
              if (response.ok) {
                  const text = await response.text();
                  try {
                      const json = JSON.parse(text);
                      if (!setStrings) {
                          if (l !== lang) {
                              console.info(`[HAControlBase] Translation for '${lang}' not found in ${this.translationPath}, falling back to '${l}'.`);
                          }
                          this._strings = json;
                          setStrings = true;
                      }
                      if (l === 'en') {
                          this._fallbackStrings = json;
                      }
                      this.requestUpdate();
                  } catch (e) {
                      console.error(`[HAControlBase] Error parsing JSON for '${l}' from ${this.translationPath}:\n${e.message}\nRaw content:\n${text}`);
                  }
              } else {
                  console.warn(`[HAControlBase] Failed to fetch translation for '${l}' from ${this.translationPath}: ${response.status} ${response.statusText}`);
              }
          } catch (e) {
              console.error(`[HAControlBase] Error loading translation for '${l}':`, e);
          }
      }
  }

  /**
   * Localizes a key with optional replacements.
   * @param {string} key - The translation key.
   * @param {Object} replace - Replacements for placeholders.
   * @returns {string} The localized string.
   */
  _localize(key, replace = {}) {
    let translated = this._strings ? this._strings[key] : undefined;
    
    // If translation is missing in current language, try English fallback from cache
    if (translated === undefined && this._loadedLang !== 'en') {
         if (this._fallbackStrings && this._fallbackStrings[key] !== undefined) {
            translated = this._fallbackStrings[key];
            console.info(`[HAControlBase] Key '${key}' not found in '${this._loadedLang}', falling back to English.`);
         }
    }
    
    // If still undefined, return the key itself
    if (translated === undefined) {
        console.warn(`[HAControlBase] Missing translation for key '${key}' in ${this.localName}`);
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