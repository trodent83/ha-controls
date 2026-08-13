import { HAControlBase, html } from "../ha-control-base.js?v=0.6.9";

const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.1';

// ---------------------------------------------------------------------------
// Module-level helper functions shared between WeatherGridCard and WeatherGridCardDialog
// Defined once here to avoid object literal recreation on every method call
// ---------------------------------------------------------------------------

const CONDITION_ICON_MAP = {
  "clear-night": "mdi:weather-night",
  "cloudy": "mdi:weather-cloudy",
  "fog": "mdi:weather-fog",
  "hail": "mdi:weather-hail",
  "lightning": "mdi:weather-lightning",
  "lightning-rainy": "mdi:weather-lightning-rainy",
  "partlycloudy": "mdi:weather-partly-cloudy",
  "pouring": "mdi:weather-pouring",
  "rainy": "mdi:weather-rainy",
  "snowy": "mdi:weather-snowy",
  "snowy-rainy": "mdi:weather-snowy-rainy",
  "sunny": "mdi:weather-sunny",
  "windy": "mdi:weather-windy",
  "windy-variant": "mdi:weather-windy-variant",
  "exceptional": "mdi:alert-circle-outline"
};

const CONDITION_COLOR_MAP = {
  "clear-night": "var(--state-weather-clear-night-color, #7986cb)",
  "cloudy": "var(--state-weather-cloudy-color, #90a4ae)",
  "fog": "var(--state-weather-fog-color, #b0bec5)",
  "hail": "var(--state-weather-hail-color, #80deea)",
  "lightning": "var(--state-weather-lightning-color, #fdd835)",
  "lightning-rainy": "var(--state-weather-lightning-rainy-color, #ffb300)",
  "partlycloudy": "var(--state-weather-partlycloudy-color, #b0bec5)",
  "pouring": "var(--state-weather-pouring-color, #0288d1)",
  "rainy": "var(--state-weather-rainy-color, #29b6f6)",
  "snowy": "var(--state-weather-snowy-color, #e0f7fa)",
  "snowy-rainy": "var(--state-weather-snowy-rainy-color, #80deea)",
  "sunny": "var(--state-weather-sunny-color, #ffb300)",
  "windy": "var(--state-weather-windy-color, #4db6ac)",
  "windy-variant": "var(--state-weather-windy-variant-color, #80cbc4)",
  "exceptional": "var(--state-weather-exceptional-color, #e57373)"
};

function getConditionIcon(cond) {
  return CONDITION_ICON_MAP[cond?.toLowerCase()] || "mdi:weather-sunny";
}

function getConditionColor(cond) {
  return CONDITION_COLOR_MAP[cond?.toLowerCase()] || "var(--primary-color, #ff9800)";
}

function getConditionLabel(cond) {
  if (!cond) return "";
  return cond.replace("-", " ").replace(/(^\w|\s\w)/g, m => m.toUpperCase());
}

function getYYYYMMDD(dt) {
  if (!dt) return "";
  if (typeof dt === "string") return dt.substring(0, 10);
  try {
    const d = new Date(dt);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dayVal = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dayVal}`;
  } catch (e) {
    return "";
  }
}

/**
 * WeatherGridCard
 * Custom Home Assistant card that displays weather forecasts in a clean daily grid layout.
 * Supports summary navigation mode, warning banner alerts, maximum forecast days limits,
 * and detailed day popups with custom hourly forecasts and climate parameters.
 * 
 * @extends HAControlBase
 */
class WeatherGridCard extends HAControlBase {
  /**
   * Defines LitElement reactive properties.
   */
  static get properties() {
    return {
      ...super.properties,
      config: {},
      _forecast: { state: true },
      _hourlyForecast: { state: true },
      _fetching: { state: true },
      _selectedDay: { state: true }
    };
  }

  /**
   * Returns Lovelace visual editor config element.
   */
  static getConfigElement() {
    return document.createElement("weather-grid-card-editor");
  }

  get translationPath() { return "/local/ha-controls/weather-grid-card/translations"; }
  get translationVersion() { return VERSION; }

  constructor() {
    super();
    this._forecast = null;
    this._hourlyForecast = null;
    this._fetching = false;
    this._selectedDay = null;
    this._useSubscription = true;
  }

  /**
   * Handles configuration parameters assignment and validations.
   * 
   * @param {Object} config - Config parameters defined in YAML
   */
  setConfig(config) {
    if (!config.entity) {
      throw new Error("Missing 'entity' parameter.");
    }
    if (!config.entity.startsWith("weather.")) {
      throw new Error("Target entity must be a 'weather' domain entity.");
    }
    this.config = {
      max_days: 7,
      mode: 'grid', // 'grid' or 'summary'
      ...config
    };
  }

  /**
   * Lifecycle hook when card is added to DOM.
   */
  connectedCallback() {
    super.connectedCallback();
    this._subscribeForecasts();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeForecasts();
    this._closeDetails();
  }

  _unsubscribeForecasts() {
    if (this._dailySub) {
      this._dailySub.then(unsub => unsub()).catch(() => {});
      this._dailySub = null;
    }
    if (this._hourlySub) {
      this._hourlySub.then(unsub => unsub()).catch(() => {});
      this._hourlySub = null;
    }
  }

  async _subscribeForecasts() {
    this._unsubscribeForecasts();
    if (!this.hass || !this.config?.entity) return;
    const entityId = this.config.entity;

    // Check entity attributes fallback immediately before waiting for WebSocket subscription updates
    const stateObj = this.hass.states[entityId];
    if (stateObj) {
      if (!this._forecast && stateObj.attributes?.forecast) {
        this._forecast = stateObj.attributes.forecast;
      }
      if (!this._hourlyForecast) {
        this._hourlyForecast = stateObj.attributes?.hourly_forecast || stateObj.attributes?.forecast_hourly || stateObj.attributes?.hourly || null;
      }
    }

    this._useSubscription = true;

    try {
      const dailySubPromise = this.hass.connection.subscribeMessage(
        (update) => {
          if (update && update.forecast) {
            this._forecast = update.forecast;
            this.requestUpdate();
          }
        },
        {
          type: "weather/subscribe_forecast",
          entity_id: entityId,
          forecast_type: "daily"
        }
      );
      this._dailySub = dailySubPromise;
      await dailySubPromise;
    } catch (e) {
      console.warn("Could not subscribe to daily forecast. Falling back to service call.", e);
      this._dailySub = null;
      this._useSubscription = false;
      this._fetchForecasts();
      return;
    }

    try {
      const hourlySubPromise = this.hass.connection.subscribeMessage(
        (update) => {
          if (update && update.forecast) {
            this._hourlyForecast = update.forecast;
            this.requestUpdate();
          }
        },
        {
          type: "weather/subscribe_forecast",
          entity_id: entityId,
          forecast_type: "hourly"
        }
      );
      this._hourlySub = hourlySubPromise;
      await hourlySubPromise;
    } catch (e) {
      console.warn("Could not subscribe to hourly forecast.", e);
      this._hourlySub = null;
    }
  }

  /**
   * Lifecycle hook to fetch forecast data when entities update.
   */
  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has("config")) {
      this._subscribeForecasts();
    } else if (changedProperties.has("hass")) {
      const oldHass = changedProperties.get("hass");
      const entityId = this.config?.entity;
      if (entityId) {
        const oldState = oldHass?.states[entityId];
        const newState = this.hass.states[entityId];
        if (!oldState || oldState.state !== newState?.state || oldState.last_updated !== newState?.last_updated || !this._forecast) {
          if (this._useSubscription === false) {
            this._fetchForecasts();
          } else if (!this._dailySub && !this._hourlySub) {
            this._subscribeForecasts();
          }
        }
      }

      // Update cached portal dialog hass if open
      if (this._dialog) {
        this._dialog.hass = this.hass;
      }
    }

    if (changedProperties.has("_hourlyForecast")) {
      if (this._dialog) {
        this._dialog.hourlyForecast = this._hourlyForecast;
      }
    }
  }

  /**
   * Retrieves weather forecasts (both daily and hourly) via service calls or attribute fallbacks.
   */
  async _fetchForecasts() {
    if (!this.hass || !this.config?.entity) return;
    const entityId = this.config.entity;
    
    // Step 1: Read legacy/attribute forecast as fallbacks
    const stateObj = this.hass.states[entityId];
    if (stateObj) {
      if (stateObj.attributes.forecast) {
        this._forecast = stateObj.attributes.forecast;
      }
      if (stateObj.attributes.hourly_forecast) {
        this._hourlyForecast = stateObj.attributes.hourly_forecast;
      } else if (stateObj.attributes.forecast_hourly) {
        this._hourlyForecast = stateObj.attributes.forecast_hourly;
      } else if (stateObj.attributes.hourly) {
        this._hourlyForecast = stateObj.attributes.hourly;
      }
    }

    // Step 2: Try fetching via new service call system using WebSocket
    try {
      const dailyResponse = await this.hass.callWS({
        type: "call_service",
        domain: "weather",
        service: "get_forecasts",
        service_data: {
          entity_id: entityId,
          type: "daily"
        },
        return_response: true
      });
      if (dailyResponse) {
        if (dailyResponse.response && dailyResponse.response[entityId]) {
          this._forecast = dailyResponse.response[entityId].forecast;
        } else if (dailyResponse[entityId]) {
          this._forecast = dailyResponse[entityId].forecast;
        } else if (dailyResponse.response && dailyResponse.response.forecast) {
          this._forecast = dailyResponse.response.forecast;
        } else if (dailyResponse.forecast) {
          this._forecast = dailyResponse.forecast;
        }
      }
    } catch (e) {
      console.warn("Could not fetch daily weather forecast via service call.", e);
    }

    try {
      const hourlyResponse = await this.hass.callWS({
        type: "call_service",
        domain: "weather",
        service: "get_forecasts",
        service_data: {
          entity_id: entityId,
          type: "hourly"
        },
        return_response: true
      });
      if (hourlyResponse) {
        if (hourlyResponse.response && hourlyResponse.response[entityId]) {
          this._hourlyForecast = hourlyResponse.response[entityId].forecast;
        } else if (hourlyResponse[entityId]) {
          this._hourlyForecast = hourlyResponse[entityId].forecast;
        } else if (hourlyResponse.response && hourlyResponse.response.forecast) {
          this._hourlyForecast = hourlyResponse.response.forecast;
        } else if (hourlyResponse.forecast) {
          this._hourlyForecast = hourlyResponse.forecast;
        }
      }
    } catch (e) {
      console.warn("Could not fetch hourly weather forecast via service call.", e);
    }
  }


  _getWarning() {
    if (!this.config?.warning_entity || !this.hass) return null;
    const warningObj = this.hass.states[this.config.warning_entity];
    if (!warningObj) return null;
    const state = warningObj.state;
    if (state && !['off', 'none', 'unknown', 'unavailable', 'no_warning', 'no warning', '0'].includes(state.toLowerCase())) {
      return warningObj.attributes.friendly_name ? `${warningObj.attributes.friendly_name}: ${state}` : state;
    }
    return null;
  }

  /**
   * Renders the custom card layout.
   */
  render() {
    if (!this.hass || !this.config) return html``;

    const stateObj = this.hass.states[this.config.entity];
    if (!stateObj) {
      return this.renderError(`Weather entity not found: ${this.config.entity}`);
    }

    const mode = this.config.mode || 'grid';

    if (mode === 'summary') {
      return this._renderSummary(stateObj);
    }
    return this._renderGrid(stateObj);
  }

  /**
   * Renders summary/compact forecast block matching multi-state-card layout.
   * Renders the next 5 days.
   */
  _renderSummary(stateObj) {
    const maxDays = parseInt(this.config?.max_days || 5, 10);
    const forecastDays = this._forecast ? this._forecast.slice(0, maxDays) : [];
    const locale = this.hass.locale || { language: 'en' };

    return html`
      ${this.renderStyle('weather-grid-card.css')}
      <ha-card class="summary-card">
        <div class="content-container layout-row">
          ${forecastDays.length === 0 ? html`
            <div class="empty-text">Loading forecast...</div>
          ` : forecastDays.map((day) => {
            const date = new Date(day.datetime);
            const dayName = date.toLocaleDateString(locale.language, { weekday: 'short' });
            const icon = getConditionIcon(day.condition);
            const iconColor = getConditionColor(day.condition);
            const rainProb = day.precipitation_probability ?? day.cloud_coverage;
            
            return html`
              <div class="multi-state-entity" @click="${() => this._openDetails(day)}">
                <div class="btn">
                  <ha-icon .icon="${icon}" style="color: ${iconColor};"></ha-icon>
                  <div class="info-container">
                    <span class="label">${dayName}</span>
                    <div class="value-container">
                      <span class="value-text">${day.temperature}°</span>
                      ${day.templow !== undefined ? html`<span class="value-low">/ ${day.templow}°</span>` : ''}
                    </div>
                    ${rainProb !== undefined && rainProb !== null && rainProb > 0 ? html`<span class="rain-text">${rainProb}%</span>` : ''}
                  </div>
                </div>
              </div>
            `;
          })}
        </div>
      </ha-card>
    `;
  }

  /**
   * Renders full forecast grid view block.
   */
  _renderGrid(stateObj) {
    const warning = this._getWarning();
    const forecastDays = this._forecast ? this._forecast.slice(0, parseInt(this.config.max_days)) : [];
    const locale = this.hass.locale || { language: 'en' };

    return html`
      ${this.renderStyle('weather-grid-card.css')}
      <ha-card class="grid-card">
        <!-- Header Info -->
        <div class="header-container">
          <div class="title-area">
            <ha-icon class="title-icon" icon="mdi:weather-partly-cloudy"></ha-icon>
            <span>${this.config.name || stateObj.attributes.friendly_name || "Weather Forecast"}</span>
          </div>
        </div>

        <div class="grid-wrapper">
          <!-- Optional Warning Banner -->
          ${warning ? html`
            <div class="warning-banner">
              <ha-icon icon="mdi:alert-decagram" class="warning-icon"></ha-icon>
              <span class="warning-text">${warning}</span>
            </div>
          ` : ''}

          <!-- Daily Forecast Grid -->
          <div class="forecast-grid">
            ${forecastDays.length === 0 ? html`
              <div class="empty-text">No forecast data available.</div>
            ` : forecastDays.map((day) => {
              const date = new Date(day.datetime);
              const dayName = date.toLocaleDateString(locale.language, { weekday: 'long' });
              const dateStr = date.toLocaleDateString(locale.language, { month: 'short', day: 'numeric' });
              const icon = getConditionIcon(day.condition);
              const iconColor = getConditionColor(day.condition);

              return html`
                <div class="grid-cell" @click="${() => this._openDetails(day)}">
                  <div class="cell-day">${dayName}</div>
                  <div class="cell-date">${dateStr}</div>
                  <ha-icon .icon="${icon}" class="cell-icon" style="color: ${iconColor};"></ha-icon>
                  <div class="cell-label">${getConditionLabel(day.condition)}</div>
                  <div class="cell-temps">
                    <span class="temp-high">${day.temperature}°</span>
                    ${day.templow !== undefined ? html`<span class="temp-low">${day.templow}°</span>` : ''}
                  </div>
                </div>
              `;
            })}
          </div>
        </div>
      </ha-card>
    `;
  }

  /**
   * Sets selection to open detailed overlay.
   */
  _openDetails(day) {
    this._selectedDay = day;
    
    // Clean up any existing dialog first
    this._closeDetails();
    
    const locale = this.hass.locale || { language: 'en' };
    const dialog = document.createElement("weather-grid-card-dialog");
    dialog.id = "weather-grid-card-dialog-instance";
    dialog.hass = this.hass;
    dialog.day = day;
    dialog.hourlyForecast = this._hourlyForecast;
    dialog.locale = locale;
    dialog.entityId = this.config.entity;
    
    dialog.addEventListener("close-dialog", () => {
      this._closeDetails();
    });
    
    // Cache the reference so updated() doesn't need getElementById
    this._dialog = dialog;
    document.body.appendChild(dialog);
  }

  /**
   * Clears selection to hide detailed overlay.
   */
  _closeDetails() {
    this._selectedDay = null;
    if (this._dialog) {
      this._dialog.remove();
      this._dialog = null;
    } else {
      // Fallback cleanup for stale dialogs
      const existing = document.getElementById("weather-grid-card-dialog-instance");
      if (existing) existing.remove();
    }
  }
}

/**
 * WeatherGridCardDialog
 * Dialog custom element to display detailed weather forecasts at 1:1 scale appended directly to document.body,
 * avoiding container scaling and clipping constraints.
 */
class WeatherGridCardDialog extends HAControlBase {
  static get properties() {
    return {
      ...super.properties,
      day: { type: Object },
      hourlyForecast: { type: Array },
      locale: { type: Object },
      entityId: { type: String }
    };
  }

  get translationPath() { return "/local/ha-controls/weather-grid-card/translations"; }
  get translationVersion() { return VERSION; }

  _close() {
    this.dispatchEvent(new CustomEvent("close-dialog", { bubbles: true, composed: true }));
  }

  render() {
    if (!this.hass || !this.day || !this.entityId) return html``;
    const stateObj = this.hass.states[this.entityId];
    if (!stateObj) return html``;

    const day = this.day;
    const date = new Date(day.datetime);
    const dayTitle = date.toLocaleDateString(this.locale?.language || 'en', { weekday: 'long', month: 'long', day: 'numeric' });
    const condIcon = getConditionIcon(day.condition);
    const condColor = getConditionColor(day.condition);
    const condLabel = getConditionLabel(day.condition);

    const tempUnit = stateObj.attributes.temperature_unit || "°C";
    const windSpeedUnit = stateObj.attributes.wind_speed_unit || "km/h";
    const precipUnit = stateObj.attributes.precipitation_unit || "mm";
    const pressureUnit = stateObj.attributes.pressure_unit || "hPa";

    // Parameter value resolution with fallback keys and sensor entity fallbacks
    const precipVal = day.precipitation ?? stateObj.attributes.precipitation;
    const rainChance = day.precipitation_probability ?? day.cloud_coverage ?? stateObj.attributes.precipitation_probability;
    const humidityVal = day.humidity ?? stateObj.attributes.humidity;
    const windSpeedVal = day.wind_speed ?? stateObj.attributes.wind_speed;
    const pressureVal = day.pressure ?? stateObj.attributes.pressure;

    let uvVal = day.uv_index ?? day.uv ?? stateObj.attributes.uv_index ?? stateObj.attributes.uv ?? stateObj.attributes.uv_index_max;
    if ((uvVal === undefined || uvVal === null) && this.hass.states) {
      const uvSensor = this.hass.states["sensor.uv_index"] || this.hass.states["sensor.current_uv_index"] || this.hass.states["sensor.uv"];
      if (uvSensor && !isNaN(parseFloat(uvSensor.state))) {
        uvVal = uvSensor.state;
      }
    }

    const targetDateStr = getYYYYMMDD(day.datetime);
    const dayHours = this.hourlyForecast ? this.hourlyForecast.filter(hour => {
      return getYYYYMMDD(hour.datetime) === targetDateStr;
    }) : [];

    return html`
      ${this.renderStyle('weather-grid-card.css')}
      <div class="dialog-overlay" @click="${this._close}">
        <div class="dialog-card" @click="${(e) => e.stopPropagation()}">
          <div class="dialog-header">
            <div class="dialog-header-text">
              <h2 class="dialog-title">${dayTitle}</h2>
              <span class="dialog-subtitle">${condLabel}</span>
            </div>
            <div class="dialog-close-button" @click="${this._close}">
              <ha-icon icon="mdi:close"></ha-icon>
            </div>
          </div>

          <div class="dialog-body">
            <div class="details-top">
              <ha-icon .icon="${condIcon}" class="details-big-icon" style="color: ${condColor};"></ha-icon>
              <div class="details-main-temps">
                <span class="details-high">${day.temperature}${tempUnit}</span>
                ${day.templow !== undefined ? html`<span class="details-low">/ ${day.templow}${tempUnit}</span>` : ''}
              </div>
            </div>

            <div class="parameters-grid">
              ${precipVal !== undefined && precipVal !== null ? html`
                <div class="param-item">
                  <ha-icon icon="mdi:weather-rainy" class="param-icon param-rain"></ha-icon>
                  <div class="param-meta">
                    <span class="param-value">${precipVal} ${precipUnit}</span>
                    <span class="param-label">Precipitation</span>
                  </div>
                </div>
              ` : ''}
              
              ${rainChance !== undefined && rainChance !== null ? html`
                <div class="param-item">
                  <ha-icon icon="mdi:water-percent" class="param-icon param-probability"></ha-icon>
                  <div class="param-meta">
                    <span class="param-value">${rainChance}%</span>
                    <span class="param-label">Rain Chance</span>
                  </div>
                </div>
              ` : ''}

              ${humidityVal !== undefined && humidityVal !== null ? html`
                <div class="param-item">
                  <ha-icon icon="mdi:water" class="param-icon param-humidity"></ha-icon>
                  <div class="param-meta">
                    <span class="param-value">${humidityVal}%</span>
                    <span class="param-label">Humidity</span>
                  </div>
                </div>
              ` : ''}

              ${windSpeedVal !== undefined && windSpeedVal !== null ? html`
                <div class="param-item">
                  <ha-icon icon="mdi:weather-windy" class="param-icon param-wind"></ha-icon>
                  <div class="param-meta">
                    <span class="param-value">${windSpeedVal} ${windSpeedUnit}</span>
                    <span class="param-label">Wind Speed</span>
                  </div>
                </div>
              ` : ''}

              ${pressureVal !== undefined && pressureVal !== null ? html`
                <div class="param-item">
                  <ha-icon icon="mdi:gauge" class="param-icon param-pressure"></ha-icon>
                  <div class="param-meta">
                    <span class="param-value">${pressureVal} ${pressureUnit}</span>
                    <span class="param-label">Pressure</span>
                  </div>
                </div>
              ` : ''}

              ${uvVal !== undefined && uvVal !== null ? html`
                <div class="param-item">
                  <ha-icon icon="mdi:white-balance-sunny" class="param-icon param-uv"></ha-icon>
                  <div class="param-meta">
                    <span class="param-value">${uvVal}</span>
                    <span class="param-label">UV Index</span>
                  </div>
                </div>
              ` : ''}
            </div>

            ${dayHours.length > 0 ? html`
              <div class="hourly-header">Hourly Forecast</div>
              <div class="hourly-timeline">
                ${dayHours.map((hour) => {
                  const hourTimeObj = new Date(hour.datetime);
                  const timeLabel = hourTimeObj.toLocaleTimeString(this.locale?.language || 'en', { hour: '2-digit', minute: '2-digit' });
                  const hourIcon = getConditionIcon(hour.condition);
                  
                  return html`
                    <div class="hourly-slot">
                      <span class="slot-time">${timeLabel}</span>
                      <ha-icon .icon="${hourIcon}" class="slot-icon" style="color: ${getConditionColor(hour.condition)};"></ha-icon>
                      <span class="slot-temp">${hour.temperature}${tempUnit}</span>
                      ${hour.precipitation_probability ? html`<span class="slot-rain">${hour.precipitation_probability}%</span>` : ''}
                    </div>
                  `;
                })}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("weather-grid-card-dialog", WeatherGridCardDialog);
customElements.define("weather-grid-card", WeatherGridCard);
