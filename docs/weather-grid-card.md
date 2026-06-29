# ☀️ Weather Grid Card

`weather-grid-card` displays weather forecasts in a clean daily grid layout. It supports daily and hourly forecast resolution (falling back to dynamic Home Assistant service calls), custom forecast lengths, warning alerts integration, and a premium click details dialog overlay.

---

## ⚙️ Configuration Schema

Below are the configuration parameters for the card. Define these fields in your Lovelace dashboard YAML block:

### Main Card Settings

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | string | **Yes** | — | Must be `custom:weather-grid-card`. |
| `entity` | string | **Yes** | — | The entity ID of the weather forecast sensor (e.g. `weather.forecast_home`). |
| `name` | string | No | Friendly Name | Custom header title override for the summary or grid headers. |
| `mode` | string | No | `grid` | Renders either `grid` (full daily columns layout) or `summary` (compact card triggering navigation on tap). |
| `max_days` | number | No | `7` | The maximum number of forecast days to display in the grid columns. |
| `warning_entity` | string | No | — | Optional entity ID containing weather warnings (e.g., severe weather sensors). Displays a highlighted banner alert at the top of the card if active. |

---

## 💡 YAML Configuration Examples

### Summary Card (Main Dashboard)
```yaml
type: custom:weather-grid-card
entity: weather.forecast_home
name: "Home Weather"
mode: summary
```

### Full Grid Forecast Card (Forecast Page)
```yaml
type: custom:weather-grid-card
entity: weather.forecast_home
name: "Weekly Forecast"
mode: grid
max_days: 7
warning_entity: sensor.severe_weather_warnings
```
