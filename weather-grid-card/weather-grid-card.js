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

  constructor() {
    super();
    this._forecast = null;
    this._hourlyForecast = null;
    this._fetching = false;
    this._selectedDay = null;
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
   * Lifecycle hook to fetch forecast data when entities update.
   */
  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has("hass") || changedProperties.has("config")) {
      const oldHass = changedProperties.get("hass");
      const entityId = this.config?.entity;
      if (entityId) {
        const oldState = oldHass?.states[entityId];
        const newState = this.hass.states[entityId];
        // Fetch only if entity ID changed, state changed, or we haven't fetched yet
        if (!oldState || oldState.state !== newState?.state || oldState.last_updated !== newState?.last_updated || !this._forecast) {
          this._fetchForecasts();
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
    
    // Step 1: Read legacy/attribute forecast as fallback
    const stateObj = this.hass.states[entityId];
    if (stateObj && stateObj.attributes.forecast) {
      this._forecast = stateObj.attributes.forecast;
    }

    // Step 2: Try fetching via new service call system
    try {
      const dailyResponse = await this.hass.callService("weather", "get_forecasts", {
        entity_id: entityId,
        type: "daily"
      });
      if (dailyResponse && dailyResponse[entityId]) {
        this._forecast = dailyResponse[entityId].forecast;
      }
    } catch (e) {
      console.warn("Could not fetch daily weather forecast via service call.", e);
    }

    try {
      const hourlyResponse = await this.hass.callService("weather", "get_forecasts", {
        entity_id: entityId,
        type: "hourly"
      });
      if (hourlyResponse && hourlyResponse[entityId]) {
        this._hourlyForecast = hourlyResponse[entityId].forecast;
      }
    } catch (e) {
      console.warn("Could not fetch hourly weather forecast via service call.", e);
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
   * Navigates Home Assistant router instantly to the forecast page.
   */
  _navigate() {
    const path = "/eg-dashboard/weather-forecast";
    window.history.pushState(null, "", path);
    const event = new Event("location-changed", {
      bubbles: true,
      composed: true
    });
    window.dispatchEvent(event);
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
   * Renders summary/compact navigation mode block.
   */
  _renderSummary(stateObj) {
    const temp = stateObj.attributes.temperature;
    const cond = stateObj.state;
    const condIcon = this._getConditionIcon(cond);
    const condLabel = this._getConditionLabel(cond);

    return html`
      ${this.renderStyle('weather-grid-card.css')}
      <div class="summary-card" @click="${this._navigate}">
        <div class="summary-main">
          <div class="summary-left">
            <ha-icon .icon="${condIcon}" class="summary-icon"></ha-icon>
            <div class="summary-meta">
              <span class="summary-title">${this.config.name || stateObj.attributes.friendly_name}</span>
              <span class="summary-state">${condLabel}</span>
            </div>
          </div>
          <div class="summary-right">
            <span class="summary-temp">${temp}°C</span>
            <ha-icon icon="mdi:chevron-right" class="summary-chevron"></ha-icon>
          </div>
        </div>
      </div>
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
            const label = this._getConditionLabel(day.condition);

            return html`
              <div class="grid-cell" @click="${() => this._openDetails(day)}">
                <div class="cell-day">${dayName}</div>
                <div class="cell-date">${dateStr}</div>
                <ha-icon .icon="${icon}" class="cell-icon"></ha-icon>
                <div class="cell-label">${label}</div>
                <div class="cell-temps">
                  <span class="temp-high">${day.temperature}°</span>
                  ${day.templow !== undefined ? html`<span class="temp-low">${day.templow}°</span>` : ''}
                </div>
              </div>
            `;
          })}
        </div>

        <!-- Detailed Day Popup Dialog -->
        ${this._selectedDay ? this._renderDetailsDialog(locale) : ''}
      </div>
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
  _renderDetailsDialog(locale) {
    const day = this._selectedDay;
    const date = new Date(day.datetime);
    const dayTitle = date.toLocaleDateString(locale.language, { weekday: 'long', month: 'long', day: 'numeric' });
    const condIcon = this._getConditionIcon(day.condition);
    const condLabel = this._getConditionLabel(day.condition);

    // Filter hourly forecast mapping to the selected day boundaries
    const targetDateStr = date.toDateString();
    const dayHours = this._hourlyForecast ? this._hourlyForecast.filter(hour => {
      return new Date(hour.datetime).toDateString() === targetDateStr;
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
              <ha-icon .icon="${condIcon}" class="details-big-icon"></ha-icon>
              <div class="details-main-temps">
                <span class="details-high">${day.temperature}°C</span>
                ${day.templow !== undefined ? html`<span class="details-low">/ ${day.templow}°C</span>` : ''}
              </div>
            </div>

            <!-- Parameters Grid -->
            <div class="parameters-grid">
              ${day.precipitation !== undefined && day.precipitation !== null ? html`
                <div class="param-item">
                  <ha-icon icon="mdi:weather-rainy" class="param-icon param-rain"></ha-icon>
                  <div class="param-meta">
                    <span class="param-value">${day.precipitation} mm</span>
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
                    <span class="param-value">${day.wind_speed} km/h</span>
                    <span class="param-label">Wind Speed</span>
                  </div>
                </div>
              ` : ''}

              ${day.pressure !== undefined && day.pressure !== null ? html`
                <div class="param-item">
                  <ha-icon icon="mdi:gauge" class="param-icon param-pressure"></ha-icon>
                  <div class="param-meta">
                    <span class="param-value">${day.pressure} hPa</span>
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
                      <ha-icon .icon="${hourIcon}" class="slot-icon"></ha-icon>
                      <span class="slot-temp">${hour.temperature}°</span>
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
