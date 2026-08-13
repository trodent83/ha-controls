const LitElement = window.LitElement || Object.getPrototypeOf(customElements.get("ha-panel-lovelace"));
export const html = LitElement.prototype.html;
export const css = LitElement.prototype.css;

// Global translation cache shared across card instances to prevent duplicate HTTP requests
const translationCache = {};

// Standard Home Assistant wrapper metadata config keys that should always be allowed
const STANDARD_HA_KEYS = new Set([
  "type",
  "view_layout",
  "layout_options",
  "grid_options",
  "visibility",
  "card_mod"
]);

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

  _getWatchedEntities(config) {
    if (this._watchedEntities && (!this.stateObj?.entity_id || this._watchedEntities.includes(this.stateObj.entity_id))) {
      return this._watchedEntities;
    }

    const entities = new Set();
    if (this.stateObj?.entity_id) {
      entities.add(this.stateObj.entity_id);
    }
    if (!config) {
      this._watchedEntities = Array.from(entities);
      return this._watchedEntities;
    }

    const entityRegex = /(?:^|['"/\s(\[{])([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)(?:$|['"/\s)\]}])/g;

    const scanObject = (obj) => {
      if (!obj) return;
      if (typeof obj === 'string') {
        let match;
        entityRegex.lastIndex = 0;
        while ((match = entityRegex.exec(obj)) !== null) {
          const parts = match[1].split('.');
          if (parts.length === 2 && /^(light|switch|sensor|binary_sensor|input_select|input_number|input_text|input_boolean|media_player|climate|vacuum|timer|weather|todo|person|device_tracker|group|automation|script|scene|notify|number|select|update|button)$/.test(parts[0])) {
            entities.add(match[1]);
          }
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(scanObject);
      } else if (typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
          if (key === 'entity' && typeof obj[key] === 'string') {
            entities.add(obj[key]);
          } else {
            scanObject(obj[key]);
          }
        });
      }
    };

    scanObject(config);
    this._watchedEntities = Array.from(entities);
    return this._watchedEntities;
  }

  /**
   * Optimizes card updates by filtering rendering cycles.
   * Compares states of watched entities inside configuration settings to allow changes.
   * Supports optional console debug tracking by setting `window.haControlsDebug = true`,
   * adding `?ha_debug` query flag to the browser URL, or configuring `debug: true` in card configuration.
   * 
   * @param {Map<string, any>} changedProps - Reactive properties modified in this cycle
   * @returns {boolean} True if the control should update and re-render, false otherwise
   */
  shouldUpdate(changedProps) {
    if (changedProps.has('config') || changedProps.has('stateObj')) {
      this._watchedEntities = null;
    }

    // If any property other than 'hass' changed, we must update
    const hasOtherChanges = Array.from(changedProps.keys()).some(key => key !== 'hass');
    if (hasOtherChanges) {
      return true;
    }

    if (changedProps.has('hass')) {
      const oldHass = changedProps.get('hass');
      if (!oldHass || !this.hass || !this.config) return true;

      const watched = this._getWatchedEntities(this.config);
      let hasChanges = false;
      
      const debugEnabled = window.haControlsDebug || window.location?.search?.includes('ha_debug') || this.config?.debug;

      for (const entityId of watched) {
        const stateObj = this.hass.states[entityId];
        const oldStateObj = oldHass.states[entityId];
        if (oldStateObj !== stateObj) {
          if (debugEnabled) {
            console.log(`[HAControlBase:${this.localName || this.constructor.name}] State changed for watched entity '${entityId}': '${oldStateObj?.state}' -> '${stateObj?.state}'`);
          }
          hasChanges = true;
          break;
        }
      }
      if (!hasChanges && watched.length > 0 && debugEnabled) {
        console.debug(`[HAControlBase:${this.localName || this.constructor.name}] Skipping update. Watched entities:`, watched);
      }
      return hasChanges;
    }
    return true;
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
   * Invoked before the element updates and renders.
   * Tracks active language modifications and initiates translations updates.
   * @param {Map} changedProps - Map of changed properties
   */
  willUpdate(changedProps) {
    super.willUpdate(changedProps);
    // Check if hass is defined and changed
    if (!changedProps.has('hass') || !this.hass) return;

    const lang = this.hass.language;
    // Only reload translations if the language has changed
    if (lang === this._loadedLang) return;

    this._loadTranslations(lang);
  }

  /**
   * Loads translations for the specified language.
   * Combines parallel resource fetching and cache storage with de-duplicated shared Promises.
   * @param {string} lang - The language code
   * @async
   */
  async _loadTranslations(lang) {
    if (!this.translationPath) return;

    this._loadedLang = lang;
    this._translationsLoaded = false;

    const cacheKey = `${this.translationPath}_${lang}`;
    if (translationCache[cacheKey]) {
      const entry = translationCache[cacheKey];
      if (entry instanceof Promise) {
        try {
          const cached = await entry;
          if (this._loadedLang === lang) {
            this._strings = cached.strings;
            this._fallbackStrings = cached.fallback;
            this._translationsLoaded = true;
            this.requestUpdate();
          }
        } catch (e) {
          console.error(`[HAControlBase] Error awaiting shared translation promise:`, e);
        }
        return;
      }
      
      // If it's already resolved data, assign it synchronously
      this._strings = entry.strings;
      this._fallbackStrings = entry.fallback;
      this._translationsLoaded = true;
      return;
    }

    const languagesToTry = [lang];
    if (lang.includes('-')) {
      languagesToTry.push(lang.split('-')[0]);
    }
    if (!languagesToTry.includes('en')) {
      languagesToTry.push('en');
    }

    // Fetch all translation candidate files in parallel via a single shared Promise
    const fetchPromise = (async () => {
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

      const resolvedData = {
        strings: primaryStrings,
        fallback: fallbackStrings
      };

      // Store the resolved data in the cache to overwrite the promise
      translationCache[cacheKey] = resolvedData;
      return resolvedData;
    })();

    translationCache[cacheKey] = fetchPromise;

    try {
      const cached = await fetchPromise;
      if (this._loadedLang === lang) {
        this._strings = cached.strings;
        this._fallbackStrings = cached.fallback;
        this._translationsLoaded = true;
        this.requestUpdate();
      }
    } catch (e) {
      console.error(`[HAControlBase] Error loading translations:`, e);
    }
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

  /**
   * Checks config for unrecognized keys.
   * @param {Object} config - The active configuration object
   * @param {Array<string>} knownKeys - Valid keys declared by the specific card editor
   * @returns {Array<string>} List of unrecognized keys found
   * @protected
   */
  _validateConfigKeys(config, knownKeys) {
    if (!config) return [];
    const validSet = new Set([...STANDARD_HA_KEYS, ...knownKeys]);
    return Object.keys(config).filter(key => !validSet.has(key));
  }

  /**
   * Renders a standardized alert banner if unrecognized settings are found in the config.
   * @returns {import('lit-html').TemplateResult} The warning alert template, or empty template
   * @protected
   */
  renderConfigValidationWarning() {
    if (!this._unrecognizedKeys || this._unrecognizedKeys.length === 0) return html``;
    
    // Check if translations are loaded for localized alert, otherwise use fallback strings
    const localizedTitle = this._localize('unrecognized_settings', { keys: this._unrecognizedKeys.join(', ') });
    const title = localizedTitle !== 'unrecognized_settings' 
      ? localizedTitle 
      : `Unrecognized configuration settings: ${this._unrecognizedKeys.join(', ')}`;
      
    const localizedDesc = this._localize('clean_settings_desc');
    const desc = localizedDesc !== 'clean_settings_desc' 
      ? localizedDesc 
      : 'You can use the Clean button below to sanitize your configuration.';

    return html`
      <ha-alert alert-type="warning" dismissable="false" style="display: block; margin-bottom: 16px;">
        <strong>${title}</strong>
        <br/>
        ${desc}
      </ha-alert>
    `;
  }
}