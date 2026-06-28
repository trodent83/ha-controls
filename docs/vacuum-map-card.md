# 🗺️ Vacuum Map Card

`vacuum-map-card` renders an interactive 2D space map showing selectable, positionable, and sizable room overlay blocks. It features a visual drag-and-resize layout editor directly on the map container, layout transformation tools (Flip Horizontal, Flip Vertical, Rotate 90°), automatic room coordinates extraction from map camera attributes, and global renaming linked directly to Home Assistant room name entities.

---

## ⚙️ Configuration Schema

Below are the configuration parameters for the card. Define these fields in your Lovelace dashboard YAML block:

### Main Card Settings

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | string | **Yes** | — | Must be `custom:vacuum-map-card`. |
| `vacuum_entity` | string | **Yes** | — | The entity ID of the vacuum cleaner (e.g. `vacuum.dreameame_l10`). |
| `output_entity` | string | **Yes** | — | The entity ID of the helper option tracking selection state (e.g. `input_text.selected_rooms`). Saved as a JSON array string (e.g. `["1","2"]`). |
| `map_camera_entity` | string | No | — | Optional camera entity ID rendering the map stream (e.g., `camera.dreameame_l10_map`). If omitted, the card automatically searches for matching `camera.<vacuum_name>_map*` entities. |
| `map_image_url` | string | No | — | Optional static background image URL if a live camera map stream is not used. |
| `map_height` | string | No | `500px` | CSS height boundary of the map viewport container (e.g., `450px`, `600px`). |
| `edit_mode` | boolean | No | `false` | Enables visual layout placement mode, allowing drag-and-drop movement and 8-directional edge/corner resizing. |
| `currently_cleaning_entity` | string | No | — | Entity ID containing the ID of the room currently being cleaned. |
| `readonly_entity` | string | No | — | Binary sensor entity ID. If state is `on`, clicking map rooms is disabled and the card is locked. |
| `mark_active_room` | string | No | — | Binary sensor entity ID. If state is `on`, enables active room highlighting/animation based on the room state. |
| `mark_animation` | string | No | `none` | Continuous icon animation for the active room being cleaned. Supported: `none`, `spinning`, `pulsing`, `flashing`, `bouncing`, `shaking`, `floating`, `slow_spin`. |
| `show_toggle` | boolean | No | `true` | Display the "Toggle All / Select All" button panel at the bottom of the card. |
| `sort_by_sequence` | boolean | No | `true` | Sort room selections according to the vacuum's `cleaning_sequence` attribute. |
| `selection_color` | string | No | `var(--primary-color)` | Button background color applied to room cells when toggled selected. |
| `selection_foreground` | string | No | `white` | Text and icon color applied to room cells when toggled selected. |
| `rooms` | object | No | — | Key-value dictionary mapping individual room IDs (strings) to customized settings. See [Room Customization Options](#room-customization-options). |

---

### Room Customization Options

You can customize each room individually inside the `rooms` configuration block:

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `label` | string | No | Room Name | Display label override for the room. |
| `icon` | string | No | Room Icon | Custom icon override for the room button (e.g. `mdi:bed-double`). |
| `color` | string | No | `rgba(var(--rgb-primary-color), 0.15)` | Background color applied to the overlay room block on the map. |
| `animation` | string | No | `none` | Continuous icon animation class applied to this specific room icon. Supported values: `none`, `spinning`, `pulsing`, `flashing`, `bouncing`, `shaking`, `floating`, `slow_spin`. |
| `x` | number | No | `10` | Horizontal start coordinate offset in card percentage boundaries (`0-100%`). |
| `y` | number | No | `10` | Vertical start coordinate offset in card percentage boundaries (`0-100%`). |
| `w` | number | No | `15` | Width dimension offset in card percentage boundaries (`0-100%`). |
| `h` | number | No | `15` | Height dimension offset in card percentage boundaries (`0-100%`). |
| `disabled` | boolean | No | `false` | If set to `true`, hides the room block overlay from the map grid entirely. |

---

## 🎨 Interactive Visual Placement Mode

* **Visual Drag & Move**: Click and drag the area of a room block to reposition it horizontally (`x`) and vertically (`y`) on the map.
* **Layout Sizing**: Room dimensions (width `w` and height `h`) are configured by typing numeric percentage values into the `W (%)` and `H (%)` fields in the card editor configurations panel.
* **Layout Toolbar Actions**:
  * **Flip H**: Flips the horizontal positioning of all rooms overlay layout blocks.
  * **Flip V**: Flips the vertical positioning of all rooms overlay layout blocks.
  * **Rotate 90°**: Rotates all room layout blocks 90 degrees clockwise.

---

## 💡 YAML Configuration Example

```yaml
type: custom:vacuum-map-card
vacuum_entity: vacuum.cleaning_robot
output_entity: input_text.selected_clean_zones
map_height: "550px"
selection_color: "var(--success-color)"
rooms:
  "1":
    label: "Living Room"
    icon: mdi:sofa
    color: "rgba(255, 87, 34, 0.2)"
    x: 15
    y: 20
    w: 30
    h: 25
  "2":
    label: "Kitchen"
    icon: mdi:silverware-fork-knife
    color: "rgba(76, 175, 80, 0.2)"
    x: 45
    y: 20
    w: 25
    h: 25
```
