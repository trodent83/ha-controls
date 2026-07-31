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
| `watches` | list | **Yes** | — | Array of line watch configuration objects (see below). |

### Watch Entry Settings (`watches`)

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `line` | string | **Yes** | — | Bus line number (e.g. `"486"`, `"456"`). |
| `direction` | string | No | — | Direction destination filter string (partial match, case-insensitive, e.g. `"Amberg"`). |
| `helper` | string | No | — | Home Assistant `input_number` entity ID to receive the next departure countdown minutes. Writes `-1` when no bus is scheduled or outside the monitoring window. |
| `alert_minutes` | number | No | `10` | Urgency highlight threshold in minutes. The line row and badge glow when minutes remaining $\le$ `alert_minutes`. |

---

## 🤖 Helper Entity & Automation Integration

When `helper` is configured on a watch entry:
* Inside the monitored time window and active days, the card writes the rounded minutes until the next departure (e.g. `10`, `5`, `0`) to the target `input_number` entity.
* Outside the active window or when no upcoming departure is found, `-1` is written to the helper entity.
* Automations can trigger on `numeric_state` changes (e.g. `below: 11` or `below: 26`) to broadcast verbal TTS departure warnings.

---

## 🛠️ Card Visual Editor

The card includes a visual configuration editor (`vgn-departure-card-editor.js`):
* **Haltestelle**: Configure the DHID stop ID and friendly stop name.
* **Überwachungszeitraum**: Set start time, end time, active weekdays, and poll interval.
* **Überwachte Linien**: Add, edit, or remove bus lines, direction filters, target `input_number` helpers, and alert thresholds.

---

## 💡 YAML Configuration Example

```yaml
type: custom:vgn-departure-card
stop_dhid: "de:09371:18001"
stop_name: "Sulzbach-Rosenberg, Bischof-Heckel-Str."
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
    helper: "input_number.vgn_bus_486_minutes"
    alert_minutes: 10
  - line: "456"
    direction: "Amberg"
    helper: "input_number.vgn_bus_456_minutes"
    alert_minutes: 25
```
