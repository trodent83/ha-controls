# 📅 Calendar Day Popup Card

The `calendar-day-popup-card` is a custom Home Assistant Lovelace card designed to display a single day's calendar events sequentially inside detail popups (specifically the calendar grid click overlay).

Unlike the main `calendar-list-card` which is styled to match the look of the tasks checklist dashboard view, `calendar-day-popup-card` maintains a distinct layout tailored for popup boxes, hiding dates by default and grouping daily schedules neatly.

---

## ⚙️ Configuration Schema

Define these fields in your calendar grid visual popup configurations:

### Main Card Settings

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | string | **Yes** | — | Must be `custom:calendar-day-popup-card`. |
| `entities` | array | **Yes** | — | Array list of calendars to load. Can be plain strings (entity IDs) or detailed objects. |
| `title` | string | No | — | Optional card title text shown in the header. |
| `icon` | string | No | `mdi:calendar-multiselect` | Icon shown in the card header. |
| `start_date` | string | No | — | Custom ISO start date string (e.g. `YYYY-MM-DD`). Allows querying events from a specific day. |
| `show_due_date` | boolean | No | `true` | Displays the start date of each event. Typically overridden to `false` in popups. |
| `show_description` | boolean | No | `false` | Displays the event description text (if available). |
| `show_due_in_days` | boolean | No | `true` | Displays the relative day count (e.g. "Today"). |
| `show_source` | boolean | No | `false` | Displays the source calendar friendly name badge. |
| `date_separator_color` | string | No | `transparent` | CSS color code for separators between consecutive dates. |
| `day_separator_color` | string | No | — | CSS color code for visual separator lines. |
| `due_in_days_separator_color` | string | No | — | CSS color code for separators before relative days. |
| `source_color` | string | No | — | CSS color code for the source calendar text labels. |
| `features` | array | No | — | List of child custom features rendered within each event row. |

---

## 💡 YAML Configuration Example

This card is typically instantiated dynamically inside the `calendar-grid-card` popup configuration:

```yaml
popup_config:
  type: custom:calendar-day-popup-card
  show_due_date: false
  show_due_in_days: false
  show_source: true
  show_description: true
  features:
    - type: "custom:calendar-property-feature"
      property: "time"
    - type: "custom:calendar-property-feature"
      property: "location"
```
