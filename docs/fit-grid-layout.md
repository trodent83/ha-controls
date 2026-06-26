# 📐 Fit Grid Layout View Card

The **Fit Grid Layout View Card** (`custom:fit-grid-layout`) is a custom Home Assistant Lovelace view layout engine that renders child cards inside a CSS Grid container. Using a `ResizeObserver`, it dynamically measures the available screen boundaries and automatically scales the entire grid down proportionally using CSS `transform: scale()` if the grid content exceeds the width or height of the viewport.

---

## 🏗️ Highlights & Key Features

1. **Autofitting Scaling**: Automatically detects the exact page/viewport width and height and scales the entire view layout down proportionally so that it fits the screen exactly without overflowing or stretching.
2. **Proportional Shrinking**: Adjusts virtual width and height so that child cards preserve their intended layout grid proportions.
3. **CSS Grid Engine**: Translates all standard CSS Grid configurations (columns, rows, areas, gaps, paddings) directly into inline styling.
4. **Performance Optimized**: Built on top of `HAControlBase` and LitElement, utilizing a debounced ResizeObserver to prevent layout rendering loops or browser lag.

---

## 🧩 Parameters Schema

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `type` | `string` | **Yes** | Must be `custom:fit-grid-layout`. |
| `layout` | `object` | **Yes** | Layout configuration properties containing CSS Grid definitions. |
| `layout.grid-template-columns` | `string` | No | Defines grid columns structure (e.g. `repeat(3, 1fr)`). |
| `layout.grid-template-rows` | `string` | No | Defines grid rows structure (e.g. `50px auto auto auto 1fr`). |
| `layout.grid-template-areas` | `string` | No | Defines multi-line grid template areas using double-quoted row strings. |
| `layout.gap` | `string` | No | Padding/spacing gap between cells (default `8px`). |
| `layout.padding` | `string` | No | Internal padding around the viewport grid container (default `8px`). |
| `cards` | `array` | **Yes** | Array of Lovelace card configuration objects to place inside the grid. |

### Card Sizing View Layout Parameters
Within each child card element inside the `cards:` block, you can configure:

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `view_layout.grid_area` | `string` | No | Assigns the card to a specific grid-template area. |
| `view_layout.place_self` | `string` | No | Specifies the self-placement within the grid cell (e.g., `center`, `start`, `end`). |

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
cards:
  - type: custom:navigation-bar-card
    view_layout:
      grid-area: header
      place-self: center
```
