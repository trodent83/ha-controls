# ☀️ Weather Grid Card

`weather-grid-card` displays weather forecasts in a clean daily grid layout. It integrates WebSocket real-time subscription managers (`subscribe_forecast`) for daily and hourly formats, supports legacy state attribute fallbacks, custom forecast lengths, warning alerts integration, and a premium click details dialog overlay.

---

## ⚙️ Configuration Schema

Below are the configuration parameters for the card. Define these fields in your Lovelace dashboard YAML block:

### Main Card Settings

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | string | **Yes** | — | Must be `custom:weather-grid-card`. |
| `entity` | string | **Yes** | — | The entity ID of the weather forecast sensor (e.g. `weather.forecast_home`). |
| `name` | string | No | Friendly Name | Custom header title override for the summary or grid headers. |
| `mode` | string | No | `grid` | Renders either `grid` (full daily columns layout) or `summary` (compact multi-day horizontal bar with high/low temps & rain chance). |
| `max_days` | number | No | `7` | The maximum number of forecast days to display in grid or summary columns. |
| `warning_entity` | string | No | — | Optional entity ID containing weather warnings (e.g., severe weather sensors). Displays a highlighted banner alert at the top of the card if active. |

---

## 🔍 Detailed Dialog Popup Overlay
Clicking on any day cell in either **grid** or **summary** mode opens a details dialog modal overlay with:
* Large condition icon (colored by weather condition state).
* Temperatures (high and low).
* Parameters grid (precipitation amount, rain chance percentage, humidity, wind speed, barometric pressure, and UV index with support for `sensor.uv_index` fallbacks).
* **Hourly Forecast Timeline**: Horizontally scrollable row containing hourly weather slots for the clicked calendar day, resolving local offsets automatically.

---

## 🛠️ Card Visual Editor
The visual configuration editor leverages tabbed panels:
* **General Tab**: Manage weather entity selection, card title override, and layout mode (grid vs summary).
* **Layout Tab**: Manage forecast day limits (`max_days`) and optional severe warnings sensor.

---

## 💡 YAML Configuration Examples

### Summary Card (Main Dashboard)
```yaml
type: custom:weather-grid-card
entity: weather.forecast_home
name: "Home Weather"
mode: summary
```

### Full Grid Forecast Card
```yaml
type: custom:weather-grid-card
entity: weather.forecast_home
name: "Weekly Forecast"
mode: grid
max_days: 7
warning_entity: sensor.severe_weather_warnings
```
