import { HAControlBase, html } from "../ha-control-base.js?v=0.6.8";

/**
 * Cache-busting version parameter for dynamic asset loading
 * @type {string}
 */
const VERSION = new URL(import.meta.url).searchParams.get('v') || '1.0.0';

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

  /**
   * Helper to resolve the YYYY-MM-DD date string format.
   * Immunizes date matching comparisons against timezone shifts.
   */
  _getYYYYMMDD(dt) {
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
   * Returns severe weather warning text if active.
   */
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
   * Resolves Material Design weather icon mapping.
   */
  _getConditionIcon(cond) {
    const map = {
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
    return map[cond?.toLowerCase()] || "mdi:weather-sunny";
  }

  /**
   * Resolves HSL color dynamically depending on the weather condition.
   */
  _getConditionColor(cond) {
    const map = {
      "clear-night": "var(--state-weather-clear-night-color, #7986cb)", // Indigo-ish
      "cloudy": "var(--state-weather-cloudy-color, #90a4ae)", // Blue-gray
      "fog": "var(--state-weather-fog-color, #b0bec5)",
      "hail": "var(--state-weather-hail-color, #80deea)", // Pale teal
      "lightning": "var(--state-weather-lightning-color, #fdd835)", // Yellow
      "lightning-rainy": "var(--state-weather-lightning-rainy-color, #ffb300)", // Amber
      "partlycloudy": "var(--state-weather-partlycloudy-color, #b0bec5)", // Light gray
      "pouring": "var(--state-weather-pouring-color, #0288d1)", // Darker blue
      "rainy": "var(--state-weather-rainy-color, #29b6f6)", // Sky blue
      "snowy": "var(--state-weather-snowy-color, #e0f7fa)", // Icy white
      "snowy-rainy": "var(--state-weather-snowy-rainy-color, #80deea)",
      "sunny": "var(--state-weather-sunny-color, #ffb300)", // Yellow-orange
      "windy": "var(--state-weather-windy-color, #4db6ac)", // Teal-gray
      "windy-variant": "var(--state-weather-windy-variant-color, #80cbc4)",
      "exceptional": "var(--state-weather-exceptional-color, #e57373)" // Coral red
    };
    return map[cond?.toLowerCase()] || "var(--primary-color, #ff9800)";
  }

  /**
   * Formats condition ID string for display label.
   */
  _getConditionLabel(cond) {
    if (!cond) return "";
    return cond.replace("-", " ").replace(/(^\w|\s\w)/g, m => m.toUpperCase());
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
    const forecastDays = this._forecast ? this._forecast.slice(0, 5) : [];
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
            const icon = this._getConditionIcon(day.condition);
            const iconColor = this._getConditionColor(day.condition);
            
            return html`
              <div class="multi-state-entity" @click="${() => this._openDetails(day)}">
                <div class="btn">
                  <ha-icon .icon="${icon}" style="color: ${iconColor};"></ha-icon>
                  <div class="info-container">
                    <span class="label">${dayName}</span>
                    <div class="value-container">
                      <span class="value-text">${day.temperature}°</span>
                    </div>
                  </div>
                </div>
              </div>
            `;
          })}
        </div>
      </ha-card>
      <!-- Detailed Day Popup Dialog -->
      ${this._selectedDay ? this._renderDetailsDialog(stateObj, locale) : ''}
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
              const icon = this._getConditionIcon(day.condition);
              const iconColor = this._getConditionColor(day.condition);

              return html`
                <div class="grid-cell" @click="${() => this._openDetails(day)}">
                  <div class="cell-day">${dayName}</div>
                  <div class="cell-date">${dateStr}</div>
                  <ha-icon .icon="${icon}" class="cell-icon" style="color: ${iconColor};"></ha-icon>
                  <div class="cell-label">${this._getConditionLabel(day.condition)}</div>
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
      <!-- Detailed Day Popup Dialog -->
      ${this._selectedDay ? this._renderDetailsDialog(stateObj, locale) : ''}
    `;
  }

  /**
   * Sets selection to open detailed overlay.
   */
  _openDetails(day) {
    this._selectedDay = day;
    this.requestUpdate();
  }

  /**
   * Clears selection to hide detailed overlay.
   */
  _closeDetails() {
    this._selectedDay = null;
    this.requestUpdate();
  }

  /**
   * Renders modular detailed weather popup modal overlay.
   */
  _renderDetailsDialog(stateObj, locale) {
    const day = this._selectedDay;
    const date = new Date(day.datetime);
    const dayTitle = date.toLocaleDateString(locale.language, { weekday: 'long', month: 'long', day: 'numeric' });
    const condIcon = this._getConditionIcon(day.condition);
    const condColor = this._getConditionColor(day.condition);
    const condLabel = this._getConditionLabel(day.condition);

    // Get units dynamically from entity attributes, falling back to standard values
    const tempUnit = stateObj.attributes.temperature_unit || "°C";
    const windSpeedUnit = stateObj.attributes.wind_speed_unit || "km/h";
    const precipUnit = stateObj.attributes.precipitation_unit || "mm";
    const pressureUnit = stateObj.attributes.pressure_unit || "hPa";

    // Filter hourly forecast mapping to the selected day boundaries
    const targetDateStr = this._getYYYYMMDD(day.datetime);
    const dayHours = this._hourlyForecast ? this._hourlyForecast.filter(hour => {
      return this._getYYYYMMDD(hour.datetime) === targetDateStr;
    }) : [];

    return html`
      <div class="dialog-overlay" @click="${this._closeDetails}">
        <div class="dialog-card" @click="${(e) => e.stopPropagation()}">
          <div class="dialog-header">
            <div class="dialog-header-text">
              <h2 class="dialog-title">${dayTitle}</h2>
              <span class="dialog-subtitle">${condLabel}</span>
            </div>
            <div class="dialog-close-button" @click="${this._closeDetails}">
              <ha-icon icon="mdi:close"></ha-icon>
            </div>
          </div>

          <div class="dialog-body">
            <!-- Big Status Block -->
            <div class="details-top">
              <ha-icon .icon="${condIcon}" class="details-big-icon" style="color: ${condColor};"></ha-icon>
              <div class="details-main-temps">
                <span class="details-high">${day.temperature}${tempUnit}</span>
                ${day.templow !== undefined ? html`<span class="details-low">/ ${day.templow}${tempUnit}</span>` : ''}
              </div>
            </div>

            <!-- Parameters Grid -->
            <div class="parameters-grid">
              ${day.precipitation !== undefined && day.precipitation !== null ? html`
                <div class="param-item">
                  <ha-icon icon="mdi:weather-rainy" class="param-icon param-rain"></ha-icon>
                  <div class="param-meta">
                    <span class="param-value">${day.precipitation} ${precipUnit}</span>
                    <span class="param-label">Precipitation</span>
                  </div>
                </div>
              ` : ''}
              
              ${day.precipitation_probability !== undefined && day.precipitation_probability !== null ? html`
                <div class="param-item">
                  <ha-icon icon="mdi:water-percent" class="param-icon param-probability"></ha-icon>
                  <div class="param-meta">
                    <span class="param-value">${day.precipitation_probability}%</span>
                    <span class="param-label">Rain Chance</span>
                  </div>
                </div>
              ` : ''}

              ${day.humidity !== undefined && day.humidity !== null ? html`
                <div class="param-item">
                  <ha-icon icon="mdi:water" class="param-icon param-humidity"></ha-icon>
                  <div class="param-meta">
                    <span class="param-value">${day.humidity}%</span>
                    <span class="param-label">Humidity</span>
                  </div>
                </div>
              ` : ''}

              ${day.wind_speed !== undefined && day.wind_speed !== null ? html`
                <div class="param-item">
                  <ha-icon icon="mdi:weather-windy" class="param-icon param-wind"></ha-icon>
                  <div class="param-meta">
                    <span class="param-value">${day.wind_speed} ${windSpeedUnit}</span>
                    <span class="param-label">Wind Speed</span>
                  </div>
                </div>
              ` : ''}

              ${day.pressure !== undefined && day.pressure !== null ? html`
                <div class="param-item">
                  <ha-icon icon="mdi:gauge" class="param-icon param-pressure"></ha-icon>
                  <div class="param-meta">
                    <span class="param-value">${day.pressure} ${pressureUnit}</span>
                    <span class="param-label">Pressure</span>
                  </div>
                </div>
              ` : ''}

              ${day.uv_index !== undefined && day.uv_index !== null ? html`
                <div class="param-item">
                  <ha-icon icon="mdi:white-balance-sunny" class="param-icon param-uv"></ha-icon>
                  <div class="param-meta">
                    <span class="param-value">${day.uv_index}</span>
                    <span class="param-label">UV Index</span>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Hourly Forecast Timeline -->
            ${dayHours.length > 0 ? html`
              <div class="hourly-header">Hourly Forecast</div>
              <div class="hourly-timeline">
                ${dayHours.map((hour) => {
                  const hourTimeObj = new Date(hour.datetime);
                  const timeLabel = hourTimeObj.toLocaleTimeString(locale.language, { hour: '2-digit', minute: '2-digit' });
                  const hourIcon = this._getConditionIcon(hour.condition);
                  
                  return html`
                    <div class="hourly-slot">
                      <span class="slot-time">${timeLabel}</span>
                      <ha-icon .icon="${hourIcon}" class="slot-icon" style="color: ${this._getConditionColor(hour.condition)};"></ha-icon>
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

customElements.define("weather-grid-card", WeatherGridCard);
