# 🧭 Navigation Bar Card

The **Navigation Bar Card** (`custom:navigation-bar-card`) displays a horizontal row of capsule navigation badges designed to link dashboard views.

---

## 🏗️ Highlights & Key Features

1. **Auto-Detection**: The card inspects `window.location.pathname` to automatically highlight the active link badge. This allows you to copy and paste the identical YAML card block to every dashboard view.
2. **Watched State & Filtered Counters**: You can specify a `todo` or `calendar` entity on links. It will calculate the active upcoming count dynamically, respecting exclusion filters, completion status, and date range parameters, aligning with display card limits.
3. **Priority Threshold Rules**: You can customize icons, colors, and animations based on entity state values. Evaluation is performed sequentially from top to bottom (first matching rule applies).
4. **Multi-Entity Watch overrides**: Within the same navigation tab, you can override `entity` on specific thresholds to prioritize checks across different devices.
5. **Visual Configuration Editor**: Full dashboard support for Lovelace's graphical editor. You can re-order navigation items, update icon/label settings, and configure threshold rules entirely via the UI form.

---

## 🧩 Parameters Schema

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | Must be `custom:navigation-bar-card`. |
| `items` | `array` | **Yes** | A list of navigation tab items. |

### Link Item Properties
| Property | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `content` | `string` | **Yes** | The label text displayed on the tab. |
| `icon` | `string` | No | Default Material Design Icon (e.g., `mdi:home`). |
| `navigation_path` | `string` | **Yes** | The Lovelace page URL path (e.g. `/eg-dashboard/0`). |
| `entity` | `string` | No | Entity ID to watch for counter status and default thresholds (e.g. `todo.german_home`). |
| `show_counter` | `boolean` | No | Show a notification count badge when the entity value is greater than zero (default `false`). |
| `color` | `string` | No | Default badge outline/icon color when not active. |
| `thresholds` | `array` | No | List of priority matched styling thresholds. |

### Threshold Item Properties
| Property | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `value` | `string`/`number` | **Yes** | State value to trigger the rule (matches numeric `>=` or exact string). |
| `entity` | `string` | No | Override entity ID to watch for this specific rule. |
| `color` | `string` | No | Override color applied to text, icon, and borders. |
| `icon` | `string` | No | Override icon. |
| `animation` | `string` | No | Override animation type (`blink` or `pulse`). |

---

## 💡 Configuration Example

```yaml
type: custom:navigation-bar-card
items:
  # Standard link badge
  - content: Home
    icon: mdi:home
    navigation_path: /eg-dashboard/0
  
  # Link badge with active tasks count and low-battery alert threshold override
  - content: Tasks
    icon: mdi:calendar
    navigation_path: /eg-dashboard/1
    entity: todo.german_home
    show_counter: true
    thresholds:
      # Priority 1: Alert if main door battery goes below 15% (mixed-entity override)
      - entity: sensor.main_door_battery
        value: 0
        # battery level check works as numeric >= from top down, so check low battery first
        # wait, if main door battery <= 15:
        # we can define a rule for it.
        # But wait, threshold matching is numeric >=. So we check if battery is >= 0 (always true if online).
        # To match low battery, we can watch a binary sensor or check strings.
        # Below is a string matching example for battery warnings:
      - entity: binary_sensor.main_door_low_battery
        value: "on"
        color: red
        animation: blink
        icon: mdi:battery-alert
      # Priority 2: Style tab red and blink if active tasks are 5 or more
      - value: 5
        color: red
        animation: blink
      # Priority 3: Style tab yellow if active tasks are 1 or more
      - value: 1
        color: yellow

  # Link badge with weather states
  - content: Overview
    icon: mdi:thermometer
    navigation_path: /eg-dashboard/2
    entity: sensor.eg_temparature_sensor_temperature
    thresholds:
      - value: 25.01
        color: red
        icon: mdi:thermometer-chevron-up
      - value: 15.0
        color: green
      - value: 0.0
        color: blue
```
