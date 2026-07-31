# 🏠 HA Controls: Premium Custom Cards for Home Assistant

Welcome to the **HA Controls** repository! This is a curated collection of premium, highly interactive, and feature-rich custom Lovelace cards for Home Assistant. Designed with modern 2026 aesthetics in mind, these cards are built on top of `LitElement` and feature an advanced dynamic translation system, modular resource loading, and visual configuration editors.

---

## 🚀 Key Repository Architecture

Unlike basic custom cards, this repository implements a unified framework designed for performance, flexibility, and ease of use:

* **Dynamic Localization System (`ha-control-base.js`):** Every card inherits from `HAControlBase`, which listens to Home Assistant's active language and dynamically fetches/caches translated files (e.g., `translations/en.json`) with standard translation key interpolation and automatic English fallbacks.
* **Modular Cache-Busting Loader (`ha-control-loader.js`):** Every card has a dedicated `-loader.js` module that checks for existing scripts, automatically tracks component versions, and dynamically injects the required JavaScript/CSS bundles.
* **[Dynamic Feature Renderer](docs/feature-renderer-card.md) (`feature-renderer-card`):** A wrapper card that dynamically resolves and renders standard or custom Home Assistant card features (e.g., cover tilt controls, slider buttons, or custom timers) inside host elements.

---

## 🎨 Included Custom Cards

| Card Type & Tag | Description | Highlights |
| :--- | :--- | :--- |
| [**`calendar-grid-card`**](docs/calendar-grid-card.md) | A monthly or weekly grid view of events across one or multiple calendars. | Weekly/monthly toggles, custom orientation (horizontal/vertical), sidebar to selectively toggle calendar visibility (cached in `localStorage`), and customizable today borders/backgrounds. |
| [**`calendar-list-card`**](docs/calendar-list-card.md) | Chronological events list card for one or multiple Home Assistant calendars. | Relative time calculations (e.g. "In 3 days"), calendar filter regexes, custom date threshold coloring, and modular child feature rendering. |
| [**`task-list-card`**](docs/task-list-card.md) | A powerful tasks board for checking off and managing items in `todo` lists. | Support for single/multiple `todo` entities, group tasks on the same day, smart separators (day, week, month), clean sweeping of completed items, and debounced data loading. |
| [**`universal-select-card`**](docs/universal-select-card.md) | Segmented button controls to represent and change options for `input_select` entities. | Column/row button layouts, long-press actions (`call-service`, `navigate`, `url`, `more-info`), and dynamic child feature injection (like timers/labels). |
| [**`vacuum-select-card`**](docs/vacuum-select-card.md) | Grid-based room selector designed to coordinate multi-room vacuum cleanings. | Automatically extracts segments/rooms from vacuum attributes, tracks selections via text inputs, respects vacuum sequence orders, and pulses/blinks the room button currently being cleaned. |
| [**`vacuum-map-card`**](docs/vacuum-map-card.md) | Interactive 2D space map showing selectable, positionable, and sizable rooms. | Visual drag-and-resize layout editor, automatic coordinate extraction from map camera, flip and rotate overlay settings, global renaming via Home Assistant room select entities, and custom icons. |
| [**`room-status-card`**](docs/room-status-card.md) | A minimalist status header displaying real-time metrics and alerts for rooms. | Custom header icons/names, dynamic status badge widgets (e.g. temp/humidity), and threshold rules that apply alert animations (blink, pulse) and colors on the fly. |
| [**`multi-property-card`**](docs/multi-property-card.md) | Multi-entity layout grid displaying real-time values, units, and custom icons. | Conditional rendering based on dynamic JavaScript evaluation rules (`eval`), custom threshold color-mapping, tap/hold actions, and dynamic child features. |
| [**`multi-state-card`**](docs/multi-state-card.md) | Interactive grid layout representing various entity buttons entirely driven by features. | Interactive tap/hold actions, conditional feature rendering, and dynamic configuration via nested features. |
| [**`navigation-bar-card`**](docs/navigation-bar-card.md) | A custom horizontal navigation bar with dynamic alerts, colors, and badge counters. | Auto-detects active dashboard tab, watches entity states with priority thresholds, and shows notification counters. |
| [**`light-control-card`**](docs/light-control-card.md) | A premium glassmorphic control card for smart lights. | Vertical/horizontal layouts, inline brightness sliders, warm-to-cool Kelvin temperature ranges, and rainbow hue sliders. |
| [**`vgn-departure-card`**](docs/vgn-departure-card.md) | Real-time bus departure tracking card for the VGN/VAG public transit network. | Live EFA/VAG API polling, automatic input_number helper countdown synchronization for automations, time window & weekday filtering, and visual configuration editor. |
| [**`fit-grid-layout`**](docs/fit-grid-layout.md) | A custom viewport-fitting layout engine using CSS Grid with dynamic popup overlays. | Dynamic auto-scaling down using CSS transforms to fit viewports, built-in visual editor, and centered 1:1 scale popup overlays with background dim/blur blocking. |

---

## ⚙️ Custom Card Features

We provide helper features that plug directly into compatible custom cards (like the **Universal Select Card**, **Multi Property Card**, and **Multi State Card**) by loading the centralized [feature-renderer-card-loader.js](feature-renderer-card/feature-renderer-card-loader.js) resource (see the [Feature Renderer Documentation](docs/feature-renderer-card.md) for full details):

* **`timer-card-feature` (`custom:timer-card-feature`):** Renders a real-time running countdown indicator directly on the card. Allows tapping to pause or resume the underlying `timer.*` entity.
* **`constant-text-feature` (`custom:constant-text-feature`):** Renders customizable static text/labels inside button structures.
* **`state-value-feature` (`custom:state-value-feature`):** Renders the localized main state value of the parent or overridden entity, with customizable prefix, suffix, styling, and threshold rule overrides.
* **`attribute-value-feature` (`custom:attribute-value-feature`):** Renders a specific attribute (subproperty) of the parent or overridden entity, with customizable prefix, suffix, styling, and threshold rule overrides.
* **`image-card-feature` (`custom:image-card-feature`):** Renders static pictures, entity avatars (`entity_picture`), or camera snapshot streams inside buttons/slots.
* **`icon-card-feature` (`custom:icon-card-feature`):** Renders highly customizable, state-mapped, threshold-driven, or expression-driven icons with custom colors, sizing, and animations.
* **`calendar-property-feature` (`custom:calendar-property-feature`):** Renders calendar event fields (e.g. event time, location, attendees response status, description) inside chronological event list rows.

---

## 📥 Installation

To use these controls in your Home Assistant installation:

### 1. Copy Files

Copy the repository contents to your Home Assistant configuration directory under `www/ha-controls/` so that the structure looks like this:

```text
config/
└── www/
    └── ha-controls/
        ├── ha-control-base.js
        ├── ha-control-loader.js
        ├── calendar-grid-card/
        ├── vacuum-select-card/
        └── ...
```

### 2. Add Dashboard Resources

Register the loader script of whichever cards you'd like to use in your Lovelace dashboard resources:

> [!TIP]
> Always load the respective `-loader.js` file instead of the card's main `.js` file to ensure the visual editor stylesheets and translation configurations load correctly.

#### Via the Home Assistant UI

1. Navigate to **Settings** -> **Dashboards**.
2. Click the three dots in the top right and select **Resources**.
3. Click **Add Resource**.
4. Enter the URL path (e.g., `/local/ha-controls/room-status-card/room-status-card-loader.js`).
5. Choose **JavaScript Module** as the resource type.

#### Via `configuration.yaml`

```yaml
lovelace:
  mode: yaml
  resources:
    - url: /local/ha-controls/room-status-card/room-status-card-loader.js
      type: module
    - url: /local/ha-controls/calendar-grid-card/calendar-grid-card-loader.js
      type: module
    - url: /local/ha-controls/light-control-card/light-control-card-loader.js
      type: module
```

---

## 💡 Quick Start Configurations

### Room Status Card

```yaml
type: custom:room-status-card
name: "Living Room"
icon: mdi:sofa
header_settings:
  show_header: true
  show_icon: true
badges:
  - entity: sensor.living_room_temperature
    icon: mdi:thermometer
    thresholds:
      - value: 25
        color: "var(--error-color)"
        animation: blink
  - entity: binary_sensor.living_room_motion
    icon: mdi:motion-sensor
    color: "var(--warning-color)"
```

### Universal Select Card

```yaml
type: custom:universal-select-card
entity: input_select.house_mode
show_label: true
layout: row
options_config:
  Home:
    icon: mdi:home
    color: "var(--success-color)"
  Away:
    icon: mdi:exit-run
    color: "var(--error-color)"
  Sleep:
    icon: mdi:sleep
    color: "var(--primary-color)"
```

## 🧱 Home Assistant UI Components Dependency List

To build the rich visual configuration editors and card controls, this project relies on the following standard Home Assistant frontend custom elements:

- **`ha-card`**: Unified background wrapper card styling.
- **`ha-button`**: Standard interactive configuration actions/buttons.
- **`ha-icon-button`**: Icon-based visual action buttons.
- **`ha-icon`**: Component for displaying standard Material Design Icons (`mdi:*`).
- **`ha-input`**: Core input element used for textual and numeric configurations.
- **`ha-select`**: Dropdown select container.
- **`ha-list-item`**: Selectable options inside dropdown menus.
- **`ha-switch`**: Standard toggle switches.
- **`ha-formfield`**: Form wrappers supplying interactive label rows.
- **`ha-form`**: Dynamic schema-based configuration selector layout engine.
- **`ha-expansion-panel`**: Collapsible container for grouping editor settings categories.
- **`ha-entity-picker`**: Entity search and selection input.
- **`ha-icon-picker`**: Material Design Icon search and picker.

Whenever updates to the Home Assistant frontend occur, developers must ensure these components remain active and supported by the active core frontend release.

## 🔍 Debugging & Diagnostics

The base framework provides built-in conditional tracing to debug update cycles, visibility conditions, and entity-watching:

* **Activate Debug Logging**: You can enable change-detection logs in the browser console dynamically using any of the following methods:
  * Set a global flag in your browser developer console:
    ```javascript
    window.haControlsDebug = true;
    ```
  * Append `?ha_debug` to your browser dashboard URL (e.g. `http://homeassistant:8123/lovelace/home?ha_debug`).
  * Add a `debug: true` field in your dashboard card's YAML configuration.
* **Log Output**: When enabled, the console will trace exactly which entities are watched, when states change, and which cards or features are updating or skipping updates.

---

## 🛠️ Development & Extending

For detailed development rules, coding standards, and architectural patterns, please review the [Development & Architecture Guidelines](CONTRIBUTING.md).

Each card is split into modular components for easier code maintenance:

* **`<card>.js`**: Standard LitElement rendering logic and properties.
* **`<card>.css`**: Stylesheet for visual aesthetics (supporting standard Home Assistant theme CSS variables).
* **`<card>-editor.js` / `*editor.css`**: Configurator UI seen by users when using Home Assistant's visual dashboard builder.
* **`translations/`**: Dynamic JSON translation catalogs.

### Translation Pattern

To add support for a new language, create a file under `translations/` named with your language's ISO code (e.g. `de.json`, `fr.json`) mapping the key/values defined in the English fallback (`en.json`).

---

*Made with ❤️ for the Home Assistant Community.*
