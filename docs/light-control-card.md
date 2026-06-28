# 💡 Light Control Card

The **Light Control Card** (`custom:light-control-card`) displays smart lights inside a premium, glassmorphic layout row. It features glowing status indicators and horizontal range sliders to control brightness, color temperature warmth, and color hues directly from the dashboard view.

---

## 🏗️ Highlights & Key Features

1. **Glow status animations**: Active lights trigger a glowing backdrop behind the bulb icon which matches the bulb's selected RGB/HSL color on the fly.
2. **Horizontal Slider Controls**: Includes smooth touch-friendly slider bars:
   - **Brightness**: 0% to 100% slider.
   - **Color Temperature**: Warm-orange to cool-blue gradient track slider. Only displays if supported by the entity.
   - **Color Hue**: A compact rainbow gradient slider. Only displays if supported by the entity.
3. **Offline Safety Locking**: Grays out, dims opacity to `0.5`, disables click/drag interactions (`pointer-events: none`), and appends a `mdi:cloud-off` badge if the light goes offline (`unavailable` or `unknown`).
4. **Visual Editor UI**: Graphical configurations inside Lovelace dashboards.

---

## 🧩 Parameters Schema

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | Must be `custom:light-control-card`. |
| `entity` | `string` | **Yes** | The light entity ID (e.g. `light.office_lamp`). |
| `name` | `string` | No | Overrides the display title name of the light. |
| `icon` | `string` | No | Overrides the display icon (defaults to entity icon or `mdi:lightbulb`). |
| `show_brightness_control` | `boolean` | No | Display the brightness slider (default `true`). |
| `show_color_temp_control` | `boolean` | No | Display the color temperature slider (default `true`). |
| `show_color_control` | `boolean` | No | Display the color hue slider (default `true`). |
| `use_light_color` | `boolean` | No | Dynamically color the icon glow to match light color output (default `true`). |

---

## 💡 Configuration Example

```yaml
type: custom:light-control-card
entity: light.office_lamp
name: "Office Spotlight"
icon: mdi:spotlight
show_brightness_control: true
show_color_temp_control: true
show_color_control: true
use_light_color: true
```
