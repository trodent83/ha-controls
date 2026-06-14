const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
export const html = LitElement.prototype.html;
export const css = LitElement.prototype.css;

// Global translation cache shared across card instances to prevent duplicate HTTP requests
const translationCache = {};

/**
 * HAControlBase
 * Base class for all custom Home Assistant controls.
 * Automates properties validation, translations setup, dynamic CSS loading, and standardized error rendering.
 */
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
   * Returns the path to the translation files directory.
   * Override in subclasses to point to the local translations folder.
   * @returns {string|null} The translation path
   */
  get translationPath() {
    return null;
  }

  /**
   * Returns the version of the translation files.
   * Override in subclasses to pass active cache-busting version parameter.
   * @returns {string} The translation version
   */
  get translationVersion() {
    return '1.0.0';
  }

  /**
   * Invoked after the element has updated.
   * Tracks active language modifications and initiates translations updates.
   * @param {Map} changedProps - Map of changed properties
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
   * Combines parallel resource fetching and cache storage.
   * @param {string} lang - The language code
   * @async
   */
  async _loadTranslations(lang) {
      if (!this.translationPath) return;

      this._loadedLang = lang;
      this._translationsLoaded = false;

      // Check module level cache first to prevent duplicate fetches across instances
      const cacheKey = `${this.translationPath}_${lang}`;
      if (translationCache[cacheKey]) {
          const cached = translationCache[cacheKey];
          this._strings = cached.strings;
          this._fallbackStrings = cached.fallback;
          this._translationsLoaded = true;
          this.requestUpdate();
          return;
      }

      const languagesToTry = [lang];
      if (lang.includes('-')) {
          languagesToTry.push(lang.split('-')[0]);
      }
      if (!languagesToTry.includes('en')) {
          languagesToTry.push('en');
      }

      // Fetch all translation candidate files in parallel
      const fetchPromises = languagesToTry.map(async (l) => {
          try {
              const response = await fetch(`${this.translationPath}/${l}.json?v=${this.translationVersion}`);
              if (response.ok) {
                  const json = await response.json();
                  return { lang: l, json };
              }
          } catch (e) {
              console.error(`[HAControlBase] Error loading translation for '${l}':`, e);
          }
          return null;
      });

      const results = await Promise.all(fetchPromises);

      let primaryStringsSet = false;
      let primaryStrings = {};
      let fallbackStrings = {};

      for (const l of languagesToTry) {
          const match = results.find(r => r && r.lang === l);
          if (match) {
              if (!primaryStringsSet) {
                  if (l !== lang) {
                      console.info(`[HAControlBase] Translation for '${lang}' not found, falling back to '${l}'.`);
                  }
                  primaryStrings = match.json;
                  primaryStringsSet = true;
              }
              if (l === 'en') {
                  fallbackStrings = match.json;
              }
          }
      }

      this._strings = primaryStrings;
      this._fallbackStrings = fallbackStrings;

      // Cache the loaded translations globally
      translationCache[cacheKey] = {
          strings: primaryStrings,
          fallback: fallbackStrings
      };

      this._translationsLoaded = true;
      this.requestUpdate();
  }

  /**
   * Localizes a key with optional replacements.
   * @param {string} key - Translation identifier
   * @param {Object} replace - Map of replacement parameters for string placeholders
   * @returns {string} The localized string
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

  /**
   * Renders a stylesheet link tag with automatic path resolution and cache-busting versioning.
   * @param {string} filename - The name of the CSS stylesheet file
   * @returns {import('lit-html').TemplateResult} The stylesheet link tag template
   */
  renderStyle(filename) {
    if (!this.translationPath) return html``;
    const basePath = this.translationPath.substring(0, this.translationPath.lastIndexOf('/'));
    return html`<link rel="stylesheet" href="${basePath}/${filename}?v=${this.translationVersion}">`;
  }

  /**
   * Renders a standardized error alert banner.
   * @param {string} message - Localized error message to display
   * @returns {import('lit-html').TemplateResult} The rendered error alert banner
   */
  renderError(message) {
    return html`<ha-alert alert-type="error" dismissable="false">${message}</ha-alert>`;
  }

  /**
   * Renders a standardized warning alert banner.
   * @param {string} message - Localized warning message to display
   * @returns {import('lit-html').TemplateResult} The rendered warning alert banner
   */
  renderWarning(message) {
    return html`<ha-alert alert-type="warning" dismissable="false">${message}</ha-alert>`;
  }
}