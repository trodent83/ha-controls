# 📐 Fit Grid Layout View Card

The **Fit Grid Layout View Card** (`custom:fit-grid-layout`) is a custom Home Assistant Lovelace view layout engine that renders child cards inside a CSS Grid container. Using a `ResizeObserver`, it dynamically measures the available screen boundaries and automatically scales the entire grid down proportionally using CSS `transform: scale()` if the grid content exceeds the width or height of the viewport.

Additionally, it supports a visual configuration editor and a **custom popup overlay system** that displays centered, 1:1 scale widgets while dimming, blurring, and disabling interaction on the background grid controls.

---

## 🏗️ Highlights & Key Features

1. **Autofitting Scaling**: Automatically detects the exact page/viewport width and height and scales the entire view layout down proportionally so that it fits the screen exactly without overflowing or stretching.
2. **Proportional Shrinking**: Adjusts virtual width and height so that child cards preserve their intended layout grid proportions.
3. **CSS Grid Engine**: Translates all standard CSS Grid configurations (columns, rows, areas, gaps, paddings) directly into inline styling.
4. **Custom Popup Overlays**: Allows any card to open a custom, centered popup modal (crisp 1:1 resolution, unaffected by layout scaling factor) while locking background controls.
5. **Standard Action Interception**: Intercepts Home Assistant's standard Lovelace `action: fire-dom-event` action schemas, letting you launch popups generically using existing cards.
6. **Lovelace Visual Editor**: Fully integrates a multi-tab visual card editor allowing layout, background, and popups configuration inside the dashboard edit drawer.
7. **Performance Optimized**: Built on top of `HAControlBase` and LitElement, utilizing a debounced ResizeObserver to prevent layout rendering loops or browser lag.

---

## 🧩 Parameters Schema

### Core View Layout Settings

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | Must be `custom:fit-grid-layout`. |
| `layout` | `object` | **Yes** | Layout configuration properties containing CSS Grid definitions. |
| `layout.grid-template-columns` | `string` | No | Defines grid columns structure (e.g. `repeat(3, 1fr)`). |
| `layout.grid-template-rows` | `string` | No | Defines grid rows structure (e.g. `50px auto auto auto 1fr`). |
| `layout.grid-template-areas` | `string` | No | Defines multi-line grid template areas using double-quoted row strings. |
| `layout.gap` | `string` | No | Padding/spacing gap between cells (default `8px`). |
| `layout.padding` | `string` | No | Internal padding around the viewport grid container (default `8px`). |
| `layout.height` | `string` | No | Viewport container height constraint (e.g., `calc(100vh - 56px)`). |
| `background` | `object` | No | Optional layout viewport background customization properties. |
| `background.image` | `string` | No | Background image URL. |
| `background.opacity` | `number` | No | Background image opacity setting, as a percentage `0-100`. |
| `background.alignment` | `string` | No | Center alignment choice (`center`, `top`, `bottom`, `left`, `right`). |
| `background.size` | `string` | No | Image scaling size rule (`cover`, `contain`, `auto`). |
| `background.repeat` | `string` | No | Image repeat option (`no-repeat`, `repeat`). |
| `background.attachment` | `string` | No | Background scrolling physics (`fixed`, `scroll`). |
| `popups` | `object` | No | Key-value dictionary mapping static `popup_id` strings to card configuration schemas. |
| `cards` | `array` | **Yes** | Array of Lovelace card configuration objects to place inside the grid. |

### Card Sizing View Layout Parameters
Within each child card element inside the `cards:` block, you can configure:

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `view_layout.grid_area` | `string` | No | Assigns the card to a specific grid-template area. |
| `view_layout.place_self` | `string` | No | Specifies the self-placement within the grid cell (e.g., `center`, `start`, `end`). |

---

## 💬 Custom Popups Configuration

`FitGridLayout` intercepts DOM events containing custom popup definitions. Any child card (or adjacent dashboard widget) supporting Lovelace standard actions can trigger these overlays.

### Triggering Popups via Lovelace Actions (`fire-dom-event`)

To display a custom control as a popup modal on press or hold, configure the card's action to fire a custom DOM event containing a `grid_popup` (or `group_popup`) object.

#### 1. Custom Dialog with Title Header & Confirmation Controls
This structure supports a clean text `heading` display along with a nested `body` card. The body card buttons can close the popup and trigger Home Assistant service scripts concurrently:

```yaml
tap_action:
  action: fire-dom-event
  group_popup:
    heading: "Confirm Operation"
    body:
      type: custom:multi-state-card
      layout: row
      entities:
        - name: Cancel
          icon: mdi:close
          color: red
          tap_action:
            action: fire-dom-event
            grid_popup_close: true
        - name: Confirm
          icon: mdi:check
          color: green
          tap_action:
            action: fire-dom-event
            grid_popup_close: true
            perform_action: script.vacuum_clean_queue
```

#### 2. Direct Popup Card Rendering (Without Heading Title)
If you don't require a header block, you can pass the card parameters directly:

```yaml
tap_action:
  action: fire-dom-event
  grid_popup:
    type: custom:radiator-control-card
    entity: climate.living_room
```

#### 3. Launching Pre-Configured Popup Templates
For cleaner YAML structures, register your popups under the root `popups:` section of the layout config, and launch them referencing their `popup_id`:

```yaml
# In the fit-grid-layout view configuration:
type: custom:fit-grid-layout
popups:
  climate_modal:
    heading: "Climate Panel"
    body:
      type: custom:radiator-control-card
      entity: climate.living_room

# In any dashboard card:
tap_action:
  action: fire-dom-event
  grid_popup:
    popup_id: climate_modal
```

---

## 📐 Viewport Sizing & Scale Propagation

When rendering dashboards on wall-mounted tablets or smaller display panels, `FitGridLayout` automatically scales down using CSS transforms (`transform: scale(...)`) to fit the screen boundaries perfectly. 

### Height Calculation & Capping
To ensure the layout scales down even when placed inside scrolling parent containers (such as default Home Assistant tabs or views), the layout card calculates available vertical space dynamically:
1. It reads the CSS custom property `--header-height` (falling back to `56px` if not set) to determine the space occupied by the Home Assistant header.
2. It calculates the visible viewport height as `window.innerHeight - headerHeight`.
3. It caps the measured `availableHeight` at the computed visible viewport height. This guarantees that vertical overflow will trigger proportional scaling rather than forcing a page scrollbar.

To ensure popups remain fully usable and centered on these smaller devices, `FitGridLayout` propagates its exact measured layout dimensions and scale factors using CSS custom properties:
- `--fit-available-width`: The measured width of the view layout.
- `--fit-available-height`: The measured height of the view layout.
- `--fit-layout-scale`: The computed scaling factor (ranging from `0.2` to `1.0`).

### Consuming Scale Variables in Custom Popups

Custom popups and cards (both nested within `FitGridLayout`'s shadow DOM and appended globally via portals to `document.body`) can read these CSS variables to scale and size themselves proportionally:

```css
.dialog-card {
  /* Scale the dialog card using the parent layout's scale factor */
  transform: scale(var(--fit-layout-scale, 1));
  transform-origin: center;
}
```
This prevents popups from extending beyond the visible screen viewport or becoming squished on wall tablets and phone screens.

---

## 🎨 Visual Configuration Editor

The card includes a fully integrated Lovelace configuration editor drawer. 

1. **Layout Tab**: Manage CSS grid settings (columns, rows, gap, padding, and height), and edit `grid-template-areas` visually in a multi-line text input field.
2. **Background Tab**: Easily configure background image overlays, opacity percentages using a slider, alignment directions, repeats, sizes, and attachment attributes.
3. **Popups Tab**: A code block editor allowing you to manage static popup cards directly using standard YAML syntax.

---

## 💡 Configuration Example

```yaml
type: custom:fit-grid-layout
layout:
  grid-template-columns: repeat(3, 1fr)
  grid-template-rows: 50px auto 1fr
  grid-template-areas: |
    "header header header"
    "left center right"
    ". . ."
  gap: 8px
  padding: 8px
background:
  image: /local/backgrounds/homekit-bg.jpeg
  opacity: 35
  alignment: center
  size: cover
  repeat: no-repeat
  attachment: fixed
popups:
  laundry_dialog:
    heading: Laundry Control Room
    body:
      type: custom:multi-state-card
      layout: row
      entities:
        - entity: sensor.front_load_washer_current_status
          features:
            - type: custom:icon-card-feature
              icon: mdi:washing-machine
cards:
  - type: custom:navigation-bar-card
    view_layout:
      grid-area: header
      place-self: center
```
