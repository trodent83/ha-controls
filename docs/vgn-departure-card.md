# 🚌 VGN Departure Card

`vgn-departure-card` displays real-time bus departures from the VGN/VAG public transport network. It queries live departure APIs (VAG API for Nürnberg inner network & VGN EFA rapidJSON for outer network stops), renders live countdown badges with color-coded urgency thresholds, enforces monitoring time windows and weekday filters, and synchronizes departure countdown minutes to Home Assistant `input_number` helpers for backend automation alerts.

---

## ⚙️ Configuration Schema

Below are the configuration parameters for the card:

### Main Card Settings

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | string | **Yes** | — | Must be `custom:vgn-departure-card`. |
| `stop_dhid` | string | **Yes** | — | Global stop DHID identifier (e.g. `de:09371:18001`). |
| `stop_name` | string | No | `stop_dhid` | Friendly display name for the stop in the card header. |
| `time_from` | string | No | `"00:00"` | Start of the active monitoring window (`HH:MM`). |
| `time_to` | string | No | `"23:59"` | End of the active monitoring window (`HH:MM`). |
| `days` | list / string | No | — | Active weekdays for monitoring (e.g., `["mon", "tue", "wed", "thu", "fri"]` or `"mon,tue,wed,thu,fri"`). |
| `poll_interval` | number | No | `60` | Polling interval in seconds (between 10 and 300). |
| `max_departures` | number | No | `10` | Maximum number of departure rows to display on the card (between 1 and 30). |
| `rolling_hours` | number | No | — | Optional relative moving time window in hours (e.g. `3` to display all departures in the next 3 hours from now). Overrides fixed `time_from`/`time_to`. |
| `watches` | list | **Yes** | — | Array of line watch configuration objects (see below). |

### Watch Entry Settings (`watches`)

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `line` | string | **Yes** | — | Line number or train identifier (e.g. `"486"`, `"456"`, `"RE30"`, `"S1"`, `"U2"`). |
| `direction` | string | No | — | Direction destination filter string (partial match, case-insensitive, e.g. `"Amberg"`). |
| `mode` | string | No | `"all"` | Transport mode filter (`"bus"`, `"tram"`, `"ubahn"`, `"sbahn"`, `"train"`, `"all"`). Enables automatic MDI icons and network color branding. |
| `icon` | string | No | auto | Custom MDI icon override for the line row (e.g. `"mdi:train"`). |
| `color` | string | No | auto | Custom badge CSS background color (e.g. `"#d01e38"`). |
| `stop_dhid` | string | No | main `stop_dhid` | Optional per-line stop DHID override (e.g. `"de:09371:18017"` or `"de:09371:18085"`). |
| `helper` | string | No | — | Home Assistant `input_number` entity ID to receive the next departure countdown minutes. Writes `-1` when no bus is scheduled or outside the monitoring window. |
| `alerts_enabled_switch` | string | No | — | Home Assistant `input_boolean` entity ID to control verbal warnings for this bus. Renders an interactive speaker toggle button (`mdi:volume-high` / `mdi:volume-off`) directly in the watch row. |
| `alert_minutes` | number | No | `10` | Urgency highlight threshold in minutes. The line row and badge glow when minutes remaining $\le$ `alert_minutes`. |

---

## 🤖 Helper Entity & Automation Integration

* **Background Backend Synchronization**: An automated Home Assistant backend script (`vgn_bus_departure_background_update.yaml`) periodically fetches departure times (every 5 minutes during peak commute hours 06:00-09:00 / 13:00-20:00, and 15 minutes off-peak) and writes rounded minutes until departure to helper entities (`input_number.vgn_bus_486_minutes` and `input_number.vgn_bus_456_minutes`) to reliably trigger verbal TTS alerts even without an open browser tab.
* **Window-Targeted API Querying (`itdTime`)**: When viewed before `time_from` (e.g. viewing afternoon return `13:00–20:00` in the morning), the card queries VGN EFA API starting at `time_from` (`13:00`), ensuring future window schedules display cleanly without getting truncated by API result limits.
* **Strict Window Bounds**: Each card strictly filters departures to its target window `[time_from, time_to]`.
* **Status Differentiation**: When current time is past `time_to` and all window departures for today have completed, the card displays **"All departures completed for today"** (`gone_for_day`), distinguishing it clearly from **"No departures found"** when no service is scheduled.
* Automations trigger on `numeric_state` changes (e.g. `below: 11` for Bus 486) to broadcast verbal TTS departure warnings.

---

## 🛠️ Card Visual Editor

The card includes a visual configuration editor (`vgn-departure-card-editor.js`):
* **Haltestelle**: Configure the default DHID stop ID and friendly stop name.
* **Überwachungszeitraum**: Set start time, end time, active weekdays, and poll interval.
* **Überwachte Linien**: Add, edit, or remove bus lines, direction filters, optional per-line `stop_dhid` overrides, target `input_number` helpers, `alerts_enabled_switch` (`input_boolean`) verbal alert toggle switches, and alert thresholds.

---

## 💡 YAML Configuration Example

```yaml
type: custom:vgn-departure-card
stop_dhid: "de:09371:18017"
stop_name: "Sulzbach-Rosenberg → Amberg"
time_from: "06:00"
time_to: "09:00"
days:
  - mon
  - tue
  - wed
  - thu
  - fri
poll_interval: 60
watches:
  - line: "486"
    direction: "Amberg"
    stop_dhid: "de:09371:18017"
    helper: "input_number.vgn_bus_486_minutes"
    alerts_enabled_switch: "input_boolean.vgn_bus_486_alerts_enabled"
    alert_minutes: 10
  - line: "456"
    direction: "Amberg"
    stop_dhid: "de:09371:18085"
    helper: "input_number.vgn_bus_456_minutes"
    alerts_enabled_switch: "input_boolean.vgn_bus_456_alerts_enabled"
    alert_minutes: 25
```
