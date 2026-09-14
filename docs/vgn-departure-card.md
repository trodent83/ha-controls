# 🚌 VGN Departure Card

`vgn-departure-card` displays bus departures using either the local Home Assistant calendar (`calendar.bus_scedule`) or live online fallback APIs. It renders live countdown badges with color-coded urgency thresholds, enforces monitoring time windows and weekday filters, provides per-row and line-level verbal TTS alert toggles, and synchronizes departure countdown minutes to Home Assistant `input_number` helpers for backend automations.

---

## ⚙️ Configuration Schema

Below are the configuration parameters for the card:

### Main Card Settings

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | string | **Yes** | — | Must be `custom:vgn-departure-card`. |
| `calendar_entity` | string | No | `calendar.bus_scedule` | Local Home Assistant calendar entity containing scheduled bus departures. When present, departures are loaded locally with zero external network polling. |
| `alert_overrides_helper` | string | No | `input_text.vgn_bus_alert_overrides` | Helper entity storing user selections and deselections made via row alert buttons on the GUI. |
| `stop_name` | string | No | `"Bus Schedule"` | Friendly display name in the card header. |
| `stop_dhid` | string | No | — | Global stop DHID identifier (used for online API fallback). |
| `time_from` | string | No | `"00:00"` | Start of the active monitoring window (`HH:MM`). |
| `time_to` | string | No | `"23:59"` | End of the active monitoring window (`HH:MM`). |
| `days` | list / string | No | — | Active weekdays for monitoring (e.g., `["mon", "tue", "wed", "thu", "fri"]`). |
| `poll_interval` | number | No | `600` | Calendar refresh interval in seconds (default 10 minutes). Countdown minutes update locally every 30 seconds via client clock. |
| `max_departures` | number | No | `12` | Maximum number of departure rows to display on the card (between 1 and 30). |
| `rolling_hours` | number | No | — | Optional relative moving time window in hours (e.g. `3`). Overrides fixed `time_from`/`time_to`. |
| `watches` | list | **Yes** | — | Array of line watch configuration objects (see below). |

### Watch Entry Settings (`watches`)

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `line` | string | **Yes** | — | Line number or transport identifier (e.g. `"486"`, `"456"`). |
| `direction` | string | No | — | Direction destination filter string (partial match, case-insensitive, e.g. `"Amberg"` or `"Sulzbach"`). |
| `mode` | string | No | `"bus"` | Transport mode filter (`"bus"`, `"tram"`, `"ubahn"`, `"sbahn"`, `"train"`). |
| `icon` | string | No | auto | Custom MDI icon override for the line row (e.g. `"mdi:bus"`). |
| `color` | string | No | auto | Custom badge CSS background color (e.g. `"#e8501a"`). |
| `helper` | string | No | — | Home Assistant `input_number` entity ID to receive the next departure countdown minutes. |
| `alerts_enabled_switch` | string | No | — | Home Assistant `input_boolean` entity ID to control verbal warnings for this line. Renders an interactive speaker toggle button in the watch header. |
| `alert_minutes` | number | No | `10` | Urgency highlight threshold in minutes. |

---

## 🔔 Interactive Alert Toggling (GUI & Backend)

1. **Watch Header Switch**: Clicking the volume button in the watch header toggles the master line switch (e.g., `input_boolean.vgn_bus_486_alerts_enabled` or `input_boolean.vgn_bus_back_486_alerts_enabled`).
2. **Individual Departure Row Buttons**: Each departure row features an interactive volume button:
   * 🔊 `mdi:volume-high` (green / highlighted): Verbal alert active for this specific bus run.
   * 🔇 `mdi:volume-off` (gray / dimmed): Verbal alert inactive.
   * Clicking the button immediately toggles the verbal alert for that specific bus run. Overrides are persisted to `input_text.vgn_bus_alert_overrides`.
3. **Local Client Arithmetic**: The card recalculates minutes until departure every 30 seconds using client-side JavaScript date math, resulting in instant responsiveness and zero network traffic.

---

## 🛠️ Card Visual Editor

The card includes a visual configuration editor (`vgn-departure-card-editor.js`):
* **Kalender & Datenquelle**: Select the local calendar (`calendar.bus_scedule`) and alert overrides helper (`input_text.vgn_bus_alert_overrides`).
* **Haltestelle / Titel**: Friendly name and optional stop DHID.
* **Überwachungszeitraum**: Start time, end time, rolling hours, active weekdays.
* **Überwachte Linien**: Configure lines, destination filters, countdown helpers, alert switches, and thresholds.

---

## 💡 YAML Configuration Example

```yaml
type: custom:vgn-departure-card
calendar_entity: calendar.bus_scedule
alert_overrides_helper: input_text.vgn_bus_alert_overrides
stop_name: "Bus 486 | Sulzbach-Rosenberg → Amberg"
time_from: "06:00"
time_to: "21:00"
days:
  - mon
  - tue
  - wed
  - thu
  - fri
  - sat
  - sun
poll_interval: 600
max_departures: 12
watches:
  - line: "486"
    direction: "Amberg"
    stop_dhid: "de:09371:18017"
    helper: "input_number.vgn_bus_486_minutes"
    alerts_enabled_switch: "input_boolean.vgn_bus_486_alerts_enabled"
    alert_minutes: 10
```
