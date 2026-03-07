const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
export const html = LitElement.prototype.html;
export const css = LitElement.prototype.css;

const globalTranslationCache = {};

export class HAControlBase extends LitElement {
  static get properties() {
    return {
      hass: {},
      _strings: { state: true },
    };
  }

  constructor() {
    super();
    this._strings = {};
    this._loadedLang = null;
  }

  get translationPath() {
    return null;
  }

  get translationVersion() {
    return '1.0.0';
  }

  updated(changedProps) {
    super.updated(changedProps);
    // Check if hass is defined and changed
    if (!changedProps.has('hass') || !this.hass) return;

    const lang = this.hass.language;
    // Only reload translations if the language has changed
    if (lang === this._loadedLang) return;

    this._loadTranslations(lang);
  }

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
      const cacheKeyBase = this.translationPath;

      for (const l of languages) {
          const cacheKey = `${cacheKeyBase}:${l}:${this.translationVersion}`;
          
          // Check global cache to avoid re-fetching
          if (!globalTranslationCache[cacheKey]) {
              try {
                  const response = await fetch(`${this.translationPath}/${l}.json?v=${this.translationVersion}`);
                  if (response.ok) {
                      globalTranslationCache[cacheKey] = await response.json();
                  } else {
                      // Log warning if translation file is missing (404, etc.)
                      console.warn(`[HAControlBase] Failed to fetch translation for '${l}' from ${this.translationPath}: ${response.status} ${response.statusText}`);
                  }
              } catch (e) {
                  // Log error if fetch fails (network error, etc.)
                  console.error(`[HAControlBase] Error loading translation for '${l}':`, e);
              }
          }
          
          if (!globalTranslationCache[cacheKey]) continue;

          // Use the first available language (most specific) as the primary strings
          if (!setStrings) {
              this._strings = globalTranslationCache[cacheKey];
              setStrings = true;
          }
          // If we have English (either requested or fallback), we are done
          if (l === 'en') return;
          // If we have the specific language and English is already cached, we are done
          if (globalTranslationCache[`${cacheKeyBase}:en:${this.translationVersion}`]) return;
      }
  }

  _localize(key, replace = {}) {
    let translated = this._strings ? this._strings[key] : undefined;
    // If translation is missing in current language, try English fallback from cache
    if (translated === undefined && this._loadedLang !== 'en') {
         const enCacheKey = `${this.translationPath}:en:${this.translationVersion}`;
         if (globalTranslationCache[enCacheKey]) {
            translated = globalTranslationCache[enCacheKey][key];
         }
    }
    // If still undefined, return the key itself
    if (translated === undefined) return key;

    // Perform replacements for placeholders
    for (const [k, v] of Object.entries(replace)) {
        translated = translated.replace(`{${k}}`, v);
    }
    return translated;
  }
}